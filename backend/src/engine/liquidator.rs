use crate::config::Config;
use crate::engine::x402_lending::ActiveLoan;
use crate::http_client::build_http_client;
use chrono::Utc;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info, warn};

/// Notification channel for alerts
pub trait NotificationChannel: Send + Sync {
    fn send_alert(&self, alert: &LiquidationAlert) -> Result<(), anyhow::Error>;
}

/// Console notification channel (logs to console)
pub struct ConsoleNotifier;

impl NotificationChannel for ConsoleNotifier {
    fn send_alert(&self, alert: &LiquidationAlert) -> Result<(), anyhow::Error> {
        match alert.alert_type {
            LiquidationAlertType::Critical => {
                error!("🚨 CRITICAL LIQUIDATION ALERT: {}", alert.message);
                error!(
                    "   Loan: {}, Health: {:.3}, Threshold: {:.3}",
                    alert.loan_id, alert.health_ratio, alert.threshold
                );
            }
            LiquidationAlertType::Warning => {
                warn!("⚠️  LIQUIDATION WARNING: {}", alert.message);
            }
            LiquidationAlertType::Liquidated => {
                error!("💀 LOAN LIQUIDATED: {}", alert.message);
            }
            LiquidationAlertType::Recovered => {
                info!("✅ Position recovered: {}", alert.message);
            }
        }
        Ok(())
    }
}

/// Liquidation event record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidationEvent {
    pub liquidation_id: String,
    pub loan_id: String,
    pub wallet_address: String,
    pub collateral_value_usd: f64,
    pub debt_value_usd: f64,
    pub health_ratio: f64,
    pub liquidation_price: f64,
    pub liquidation_penalty: f64,
    pub executed_at: String,
    pub tx_hash: String,
    pub status: LiquidationStatus,
}

/// Liquidation status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LiquidationStatus {
    Pending,
    Executing,
    Completed,
    Failed,
}

/// Liquidation alert
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidationAlert {
    pub alert_id: String,
    pub loan_id: String,
    pub alert_type: LiquidationAlertType,
    pub message: String,
    pub health_ratio: f64,
    pub threshold: f64,
    pub timestamp: String,
    pub action_taken: bool,
}

/// Liquidation alert types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LiquidationAlertType {
    Warning,
    Critical,
    Liquidated,
    Recovered,
}

/// Auto-liquidation engine
pub struct Liquidator {
    config: Arc<Config>,
    client: Client,
    liquidation_history: Vec<LiquidationEvent>,
    notification_channel: Arc<dyn NotificationChannel>,
}

impl Liquidator {
    pub fn new(config: Arc<Config>) -> Self {
        Self::new_with_notifier(config, Arc::new(ConsoleNotifier))
    }

    pub fn new_with_notifier(
        config: Arc<Config>,
        notification_channel: Arc<dyn NotificationChannel>,
    ) -> Self {
        Self {
            config,
            client: build_http_client(),
            liquidation_history: Vec::new(),
            notification_channel,
        }
    }

    /// Check if a loan requires liquidation
    pub async fn check_liquidation(
        &mut self,
        loan: &ActiveLoan,
        collateral_value_usd: f64,
    ) -> Result<Option<LiquidationAlert>, anyhow::Error> {
        let health_ratio = collateral_value_usd / loan.outstanding;

        info!(
            "Checking liquidation for loan {}: health_ratio={:.3}, threshold={:.3}",
            loan.loan_id, health_ratio, self.config.liquidation_threshold
        );

        if health_ratio >= self.config.liquidation_threshold {
            // Position is safe, but check if it was previously critical
            if health_ratio > self.config.liquidation_threshold * 1.1 {
                return Ok(Some(LiquidationAlert {
                    alert_id: format!("alert_{}", uuid::Uuid::new_v4()),
                    loan_id: loan.loan_id.clone(),
                    alert_type: LiquidationAlertType::Recovered,
                    message: "Position health has recovered".to_string(),
                    health_ratio,
                    threshold: self.config.liquidation_threshold,
                    timestamp: Utc::now().to_rfc3339(),
                    action_taken: false,
                }));
            }
            return Ok(None);
        }

        // Position is at risk
        let alert_type = if health_ratio < self.config.liquidation_threshold * 0.8 {
            LiquidationAlertType::Critical
        } else {
            LiquidationAlertType::Warning
        };

        let alert = LiquidationAlert {
            alert_id: format!("alert_{}", uuid::Uuid::new_v4()),
            loan_id: loan.loan_id.clone(),
            alert_type: alert_type.clone(),
            message: format!(
                "Loan {} health ratio {:.3} below threshold {:.3}",
                loan.loan_id, health_ratio, self.config.liquidation_threshold
            ),
            health_ratio,
            threshold: self.config.liquidation_threshold,
            timestamp: Utc::now().to_rfc3339(),
            action_taken: false,
        };

        // If critical, execute liquidation
        if matches!(alert_type, LiquidationAlertType::Critical) {
            warn!("CRITICAL: Executing liquidation for loan {}", loan.loan_id);

            // Send notification before execution
            if let Err(e) = self.notification_channel.send_alert(&alert) {
                error!("Failed to send liquidation notification: {}", e);
            }

            let liquidation_event = self
                .execute_liquidation(loan, collateral_value_usd, health_ratio)
                .await?;

            // Store in history
            self.liquidation_history.push(liquidation_event);

            // Send post-liquidation notification
            let post_alert = LiquidationAlert {
                alert_id: format!("alert_{}", uuid::Uuid::new_v4()),
                loan_id: loan.loan_id.clone(),
                alert_type: LiquidationAlertType::Liquidated,
                message: format!("Loan {} has been liquidated", loan.loan_id),
                health_ratio,
                threshold: self.config.liquidation_threshold,
                timestamp: Utc::now().to_rfc3339(),
                action_taken: true,
            };
            if let Err(e) = self.notification_channel.send_alert(&post_alert) {
                error!("Failed to send post-liquidation notification: {}", e);
            }
        } else {
            // Send warning notification
            if let Err(e) = self.notification_channel.send_alert(&alert) {
                warn!("Failed to send warning notification: {}", e);
            }
        }

        Ok(Some(alert))
    }

    /// Execute forced liquidation
    async fn execute_liquidation(
        &self,
        loan: &ActiveLoan,
        collateral_value_usd: f64,
        health_ratio: f64,
    ) -> Result<LiquidationEvent, anyhow::Error> {
        info!(
            "Executing liquidation for loan {} (health: {:.3})",
            loan.loan_id, health_ratio
        );

        // Calculate liquidation penalty (5-15% based on health ratio)
        let penalty_pct = if health_ratio < 1.0 {
            0.15 // 15% penalty for underwater positions
        } else if health_ratio < 1.1 {
            0.10
        } else {
            0.05
        };

        let liquidation_penalty = collateral_value_usd * penalty_pct;
        let liquidation_price = collateral_value_usd - liquidation_penalty;

        // Execute liquidation via X Layer (mocked)
        // In production: Use alloy to interact with liquidation contract
        let tx_hash = self
            .execute_onchain_liquidation(loan, liquidation_price)
            .await?;

        let event = LiquidationEvent {
            liquidation_id: format!("liq_{}", uuid::Uuid::new_v4()),
            loan_id: loan.loan_id.clone(),
            wallet_address: loan.wallet_address.clone(),
            collateral_value_usd,
            debt_value_usd: loan.outstanding,
            health_ratio,
            liquidation_price,
            liquidation_penalty,
            executed_at: Utc::now().to_rfc3339(),
            tx_hash,
            status: LiquidationStatus::Completed,
        };

        info!(
            "Liquidation completed: {} (penalty: ${:.2})",
            event.liquidation_id, event.liquidation_penalty
        );

        Ok(event)
    }

    /// Execute on-chain liquidation transaction (mocked)
    async fn execute_onchain_liquidation(
        &self,
        _loan: &ActiveLoan,
        liquidation_value: f64,
    ) -> Result<String, anyhow::Error> {
        // In production, this would:
        // 1. Build liquidation transaction using alloy
        // 2. Sign via TEE (okx-x402-payment)
        // 3. Broadcast to X Layer (okx-onchain-gateway)
        // 4. Wait for confirmation

        info!(
            "Broadcasting liquidation tx to X Layer: {} USDC",
            liquidation_value
        );

        // Mock transaction hash
        let tx_hash = format!("0xliq_{}", uuid::Uuid::new_v4().simple());

        // Simulate transaction confirmation delay
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        Ok(tx_hash)
    }

    /// Get liquidation history
    pub fn get_liquidation_history(&self) -> &[LiquidationEvent] {
        &self.liquidation_history
    }

    /// Calculate liquidation risk score (0-100, higher = more risky)
    pub fn calculate_risk_score(&self, health_ratio: f64, time_to_expiry_secs: u64) -> u32 {
        let health_component = if health_ratio >= 2.0 {
            0.0
        } else if health_ratio >= 1.5 {
            (2.0 - health_ratio) / 0.5 * 25.0
        } else if health_ratio >= 1.0 {
            25.0 + (1.5 - health_ratio) / 0.5 * 25.0
        } else {
            50.0 + (1.0 - health_ratio) * 50.0
        };

        let time_component = if time_to_expiry_secs > 86400 * 7 {
            0.0 // More than 7 days
        } else if time_to_expiry_secs > 86400 {
            ((86400 * 7) as f64 - time_to_expiry_secs as f64) / (86400 * 6) as f64 * 25.0
        } else {
            25.0 + (86400 as f64 - time_to_expiry_secs as f64) / 86400.0 * 25.0
        };

        ((health_component + time_component).min(100.0)) as u32
    }

    /// Generate liquidation warning message
    pub fn generate_warning(
        &self,
        loan: &ActiveLoan,
        health_ratio: f64,
        risk_score: u32,
    ) -> String {
        let urgency = if risk_score >= 80 {
            "URGENT"
        } else if risk_score >= 60 {
            "HIGH"
        } else if risk_score >= 40 {
            "MEDIUM"
        } else {
            "LOW"
        };

        format!(
            "[{}] Loan {} health ratio: {:.3} (threshold: {:.3}). Risk score: {}/100. {}",
            urgency,
            loan.loan_id,
            health_ratio,
            self.config.liquidation_threshold,
            risk_score,
            if risk_score >= 60 {
                "Consider adding collateral or repaying to avoid liquidation."
            } else {
                "Monitor position closely."
            }
        )
    }
}
