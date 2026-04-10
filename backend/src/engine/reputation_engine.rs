use crate::config::Config;
use crate::http_client::build_http_client;
use chrono::Utc;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{info, warn};

/// Agent's on-chain identity and reputation
/// 
/// This module integrates with external identity systems (e.g., soulinX, ENS, Lens)
/// to provide reputation-based credit scoring.
/// 
/// The idea: Identity → Reputation → Trust → Better Credit Terms
/// 
/// Agents with verified identities and good reputations get:
/// - Lower interest rates
/// - Higher borrowing limits  
/// - Less collateral required
/// - Access to premium tasks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentIdentity {
    /// Wallet address
    pub wallet_address: String,
    /// Display name (from identity system)
    pub display_name: Option<String>,
    /// Avatar URL
    pub avatar_url: Option<String>,
    /// Bio/description
    pub bio: Option<String>,
    /// Identity sources (e.g., "soulinx", "ens", "lens")
    pub identity_sources: Vec<IdentitySource>,
    /// Reputation score (0-1000)
    pub reputation_score: u32,
    /// On-chain activity metrics
    pub activity_metrics: ActivityMetrics,
    /// Social graph connections
    pub social_connections: u64,
    /// Verified badges
    pub verified_badges: Vec<String>,
    /// First seen timestamp
    pub first_seen: String,
    /// Last active timestamp
    pub last_active: String,
    /// Trust level derived from reputation
    pub trust_level: TrustLevel,
}

/// Source of identity verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentitySource {
    /// Source name (e.g., "soulinx", "ens", "lens", "twitter")
    pub source: String,
    /// Verified username/handle
    pub username: String,
    /// Verification timestamp
    pub verified_at: String,
    /// Source-specific metadata
    pub metadata: serde_json::Value,
}

/// On-chain activity metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityMetrics {
    /// Total transactions
    pub total_transactions: u64,
    /// Unique protocols interacted with
    pub unique_protocols: u64,
    /// Total volume USD
    pub total_volume_usd: f64,
    /// Days active on-chain
    pub active_days: u64,
    /// Successful loan repayments
    pub successful_repayments: u64,
    /// Defaulted loans
    pub defaulted_loans: u64,
    /// Task completion rate
    pub task_completion_rate: f64,
    /// Average task reward
    pub avg_task_reward: f64,
}

/// Trust level derived from reputation score
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TrustLevel {
    /// Unknown/unverified (0-199)
    Unknown,
    /// Basic verification (200-399)
    Basic,
    /// Established reputation (400-599)
    Established,
    /// High trust (600-799)
    Trusted,
    /// Elite reputation (800-1000)
    Elite,
}

impl TrustLevel {
    pub fn from_score(score: u32) -> Self {
        match score {
            0..=199 => TrustLevel::Unknown,
            200..=399 => TrustLevel::Basic,
            400..=599 => TrustLevel::Established,
            600..=799 => TrustLevel::Trusted,
            800..=1000 => TrustLevel::Elite,
            _ => TrustLevel::Unknown,
        }
    }
}

/// Reputation report used for credit scoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReputationReport {
    pub agent_identity: AgentIdentity,
    /// Reputation-adjusted credit multiplier
    pub reputation_multiplier: f64,
    /// Identity verification bonus
    pub identity_bonus: u32,
    /// Risk factors (negative signals)
    pub risk_factors: Vec<String>,
    /// Positive factors
    pub positive_factors: Vec<String>,
    /// Recommendation for credit terms
    pub recommendation: String,
    /// Report timestamp
    pub generated_at: String,
}

/// Reputation engine that integrates with external identity systems
/// 
/// This engine:
/// 1. Fetches agent identity from various sources (soulinX, ENS, etc.)
/// 2. Calculates reputation score based on on-chain activity
/// 3. Provides reputation-adjusted credit terms
/// 4. Enables "Identity → Reputation → Credit" pipeline
/// 
/// Integration with soulinX:
/// - soulinX provides AI agent identity (SS1 winner)
/// - AgentCredit uses that identity for reputation scoring
/// - Together: Identity (soulinX) → Financial Access (AgentCredit)
pub struct ReputationEngine {
    config: Arc<Config>,
    client: Client,
}

impl ReputationEngine {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            config,
            client: build_http_client(),
        }
    }

    /// Get agent identity and calculate reputation
    /// 
    /// This is the main entry point for reputation-based credit scoring.
    /// It combines:
    /// 1. External identity systems (soulinX, ENS, etc.)
    /// 2. On-chain activity analysis
    /// 3. Social graph analysis
    pub async fn get_agent_identity(&self, wallet_address: &str) -> Result<AgentIdentity, anyhow::Error> {
        info!("Fetching agent identity for: {}", wallet_address);

        // Step 1: Fetch identity from external systems
        let identity_sources = self.fetch_identity_sources(wallet_address).await;

        // Step 2: Analyze on-chain activity
        let activity_metrics = self.analyze_on_chain_activity(wallet_address).await?;

        // Step 3: Calculate reputation score
        let reputation_score = self.calculate_reputation_score(&identity_sources, &activity_metrics);

        // Step 4: Determine trust level
        let trust_level = TrustLevel::from_score(reputation_score);

        // Step 5: Build full identity
        let identity = AgentIdentity {
            wallet_address: wallet_address.to_string(),
            display_name: identity_sources.first().map(|s| s.username.clone()),
            avatar_url: None, // Could fetch from soulinX/ENS
            bio: None,
            identity_sources,
            reputation_score,
            activity_metrics,
            social_connections: 0, // Could fetch from social graph
            verified_badges: Vec::new(),
            first_seen: Utc::now().to_rfc3339(),
            last_active: Utc::now().to_rfc3339(),
            trust_level,
        };

        info!(
            "Agent identity resolved: {} (reputation: {}, trust: {:?})",
            wallet_address, identity.reputation_score, identity.trust_level
        );

        Ok(identity)
    }

    /// Generate reputation report for credit scoring
    pub async fn generate_reputation_report(
        &self,
        wallet_address: &str,
    ) -> Result<ReputationReport, anyhow::Error> {
        let identity = self.get_agent_identity(wallet_address).await?;

        // Calculate reputation multiplier
        let reputation_multiplier = self.calculate_reputation_multiplier(identity.reputation_score);

        // Calculate identity verification bonus
        let identity_bonus = self.calculate_identity_bonus(&identity.identity_sources);

        // Identify risk factors
        let risk_factors = self.identify_risk_factors(&identity);

        // Identify positive factors
        let positive_factors = self.identify_positive_factors(&identity);

        // Generate recommendation
        let recommendation = self.generate_recommendation(&identity, reputation_multiplier);

        Ok(ReputationReport {
            agent_identity: identity,
            reputation_multiplier,
            identity_bonus,
            risk_factors,
            positive_factors,
            recommendation,
            generated_at: Utc::now().to_rfc3339(),
        })
    }

    /// Fetch identity from external identity systems
    /// 
    /// This integrates with:
    /// - soulinX (AI Agent Identity - SS1 winner)
    /// - ENS (Ethereum Name Service)
    /// - Lens Protocol (social graph)
    /// - Twitter/Discord (web2 identity)
    async fn fetch_identity_sources(&self, wallet_address: &str) -> Vec<IdentitySource> {
        let mut sources = Vec::new();

        // Try soulinX identity (AI Agent Identity system)
        if let Some(soulinx_identity) = self.fetch_soulinx_identity(wallet_address).await {
            sources.push(soulinx_identity);
        }

        // Try ENS resolution
        if let Some(ens_identity) = self.fetch_ens_identity(wallet_address).await {
            sources.push(ens_identity);
        }

        // Try other sources...
        // In production, you would also check:
        // - Lens Protocol
        // - Farcaster
        // - Twitter/Discord verification
        // - Guild.xyz memberships
        // - POAPs (Proof of Attendance Protocol)

        sources
    }

    /// Fetch identity from soulinX (AI Agent Identity system)
    /// 
    /// soulinX provides:
    /// - AI agent name and profile
    /// - Agent capabilities/skills
    /// - Agent reputation/behavior history
    /// - Soulbound tokens (SBTs) for achievements
    ///
    /// This integration makes AgentCredit a natural successor to soulinX:
    /// soulinX = "Who is this AI agent?"
    /// AgentCredit = "How much can this AI agent borrow?"
    async fn fetch_soulinx_identity(&self, wallet_address: &str) -> Option<IdentitySource> {
        // soulinX API endpoint (example - would need real API)
        let soulinx_api = "https://api.soulinx.ai/identity";
        
        let response = self
            .client
            .get(format!("{}/{}", soulinx_api, wallet_address))
            .timeout(std::time::Duration::from_secs(3))
            .send()
            .await;

        if let Ok(resp) = response {
            if resp.status().is_success() {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(username) = json.get("name").and_then(|v| v.as_str()) {
                        return Some(IdentitySource {
                            source: "soulinx".to_string(),
                            username: username.to_string(),
                            verified_at: Utc::now().to_rfc3339(),
                            metadata: json.clone(),
                        });
                    }
                }
            }
        }

        warn!("soulinX identity not found for: {}", wallet_address);
        None
    }

    /// Fetch ENS name for wallet address
    async fn fetch_ens_identity(&self, wallet_address: &str) -> Option<IdentitySource> {
        // ENS reverse lookup via Ethereum RPC
        // In production, use alloy to call ENS registry
        
        // For now, check if address matches known pattern
        if wallet_address.starts_with("0x0000") {
            return None; // Placeholder address
        }

        // Mock ENS resolution
        None
    }

    /// Analyze on-chain activity for reputation scoring
    async fn analyze_on_chain_activity(
        &self,
        wallet_address: &str,
    ) -> Result<ActivityMetrics, anyhow::Error> {
        // Use OKX Onchain Gateway to fetch wallet analytics
        // This is similar to credit_scoring.rs but focused on activity patterns

        // Deterministic mock for development
        let seed = wallet_address.chars().fold(0u64, |acc, c| acc + c as u64);

        let metrics = ActivityMetrics {
            total_transactions: 50 + (seed % 500),
            unique_protocols: 3 + (seed % 15),
            total_volume_usd: 1000.0 + ((seed % 50000) as f64),
            active_days: 10 + (seed % 365),
            successful_repayments: if seed % 5 == 0 { 0 } else { 1 + (seed % 10) },
            defaulted_loans: if seed % 10 == 0 { 1 } else { 0 },
            task_completion_rate: 0.7 + ((seed % 30) as f64 / 100.0),
            avg_task_reward: 0.5 + ((seed % 20) as f64 / 10.0),
        };

        Ok(metrics)
    }

    /// Calculate composite reputation score (0-1000)
    fn calculate_reputation_score(
        &self,
        identity_sources: &[IdentitySource],
        metrics: &ActivityMetrics,
    ) -> u32 {
        let mut score = 0u32;

        // Identity verification score (max 200 points)
        score += identity_sources.len().min(4) as u32 * 50;

        // On-chain activity score (max 300 points)
        score += (metrics.total_transactions.min(500) as f64 / 500.0 * 150.0) as u32;
        score += (metrics.unique_protocols.min(20) as f64 / 20.0 * 100.0) as u32;
        score += (metrics.active_days.min(365) as f64 / 365.0 * 50.0) as u32;

        // Financial behavior score (max 300 points)
        let repayment_rate = if metrics.successful_repayments + metrics.defaulted_loans > 0 {
            metrics.successful_repayments as f64
                / (metrics.successful_repayments + metrics.defaulted_loans) as f64
        } else {
            1.0 // No history = assume good
        };
        score += (repayment_rate * 200.0) as u32;
        score += (metrics.task_completion_rate * 100.0) as u32;

        // Volume/activity bonus (max 200 points)
        score += (metrics.total_volume_usd.min(10000.0) / 10000.0 * 200.0) as u32;

        score.min(1000)
    }

    /// Calculate reputation multiplier for credit terms
    fn calculate_reputation_multiplier(&self, reputation_score: u32) -> f64 {
        match reputation_score {
            0..=199 => 0.7,    // 30% penalty
            200..=399 => 0.85, // 15% penalty
            400..=599 => 1.0,  // No adjustment
            600..=799 => 1.15, // 15% bonus
            800..=1000 => 1.3, // 30% bonus
            _ => 1.0,
        }
    }

    /// Calculate identity verification bonus (adds to credit score)
    fn calculate_identity_bonus(&self, identity_sources: &[IdentitySource]) -> u32 {
        let mut bonus = 0u32;

        for source in identity_sources {
            match source.source.as_str() {
                "soulinx" => bonus += 30,  // AI Agent identity verified
                "ens" => bonus += 20,       // Human-readable name
                "lens" => bonus += 15,      // Social graph
                "twitter" => bonus += 10,   // Web2 identity
                _ => bonus += 5,
            }
        }

        bonus.min(50) // Cap at 50 points
    }

    /// Identify risk factors
    fn identify_risk_factors(&self, identity: &AgentIdentity) -> Vec<String> {
        let mut risks = Vec::new();

        if identity.identity_sources.is_empty() {
            risks.push("No verified identity sources".to_string());
        }

        if identity.activity_metrics.defaulted_loans > 0 {
            risks.push(format!(
                "{} defaulted loan(s) in history",
                identity.activity_metrics.defaulted_loans
            ));
        }

        if identity.activity_metrics.active_days < 30 {
            risks.push("New wallet with limited history".to_string());
        }

        if identity.activity_metrics.task_completion_rate < 0.8 {
            risks.push("Low task completion rate".to_string());
        }

        risks
    }

    /// Identify positive factors
    fn identify_positive_factors(&self, identity: &AgentIdentity) -> Vec<String> {
        let mut factors = Vec::new();

        if !identity.identity_sources.is_empty() {
            let sources: Vec<String> = identity
                .identity_sources
                .iter()
                .map(|s| s.source.clone())
                .collect();
            factors.push(format!("Verified identities: {}", sources.join(", ")));
        }

        if identity.activity_metrics.successful_repayments > 0 {
            factors.push(format!(
                "{} successful loan repayment(s)",
                identity.activity_metrics.successful_repayments
            ));
        }

        if identity.activity_metrics.active_days > 90 {
            factors.push("Established on-chain history (>90 days)".to_string());
        }

        if identity.activity_metrics.task_completion_rate > 0.9 {
            factors.push("Excellent task completion rate (>90%)".to_string());
        }

        if identity.activity_metrics.unique_protocols > 5 {
            factors.push(format!(
                "Experienced with {} protocols",
                identity.activity_metrics.unique_protocols
            ));
        }

        factors
    }

    /// Generate credit recommendation
    fn generate_recommendation(
        &self,
        identity: &AgentIdentity,
        reputation_multiplier: f64,
    ) -> String {
        match identity.trust_level {
            TrustLevel::Elite => {
                format!(
                    "Elite reputation ({}). Recommend: Under-collateralized lending, lowest rates, highest limits.",
                    identity.reputation_score
                )
            }
            TrustLevel::Trusted => {
                format!(
                    "Trusted agent ({}). Recommend: Standard terms with reputation bonus (x{:.2}).",
                    identity.reputation_score, reputation_multiplier
                )
            }
            TrustLevel::Established => {
                format!(
                    "Established identity ({}). Recommend: Standard credit terms.",
                    identity.reputation_score
                )
            }
            TrustLevel::Basic => {
                format!(
                    "Basic verification ({}). Recommend: Higher collateral, moderate rates.",
                    identity.reputation_score
                )
            }
            TrustLevel::Unknown => {
                format!(
                    "Unverified agent ({}). Recommend: Maximum collateral, highest rates, low limits.",
                    identity.reputation_score
                )
            }
        }
    }

    /// Get reputation-adjusted credit score
    /// 
    /// This combines:
    /// 1. Base credit score (from on-chain activity)
    /// 2. Reputation bonus (from identity verification)
    /// 3. Reputation multiplier (from trust level)
    pub fn apply_reputation_to_credit_score(
        &self,
        base_credit_score: u32,
        reputation_report: &ReputationReport,
    ) -> u32 {
        // Apply reputation multiplier
        let adjusted = (base_credit_score as f64 * reputation_report.reputation_multiplier) as u32;

        // Add identity verification bonus
        let with_bonus = adjusted + reputation_report.identity_bonus;

        // Cap at 1000
        with_bonus.min(1000)
    }
}
