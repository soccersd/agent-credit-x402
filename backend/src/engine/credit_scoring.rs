use crate::config::Config;
use crate::http_client::build_http_client;
use chrono::Utc;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{info, warn};

/// Credit score result with detailed breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreditScoreResult {
    pub score: u32,
    pub max_score: u32,
    pub grade: String,
    pub on_chain_history_score: u32,
    pub portfolio_value_score: u32,
    pub repayment_history_score: u32,
    /// Reputation score from identity systems (soulinX, ENS, etc.)
    pub reputation_score: u32,
    /// Identity verification bonus points
    pub identity_bonus: u32,
    pub risk_adjustment: f64,
    pub calculated_at: String,
    pub wallet_address: String,
    pub max_borrow_limit: f64,
}

/// OKX Onchain Gateway mock response structure
#[derive(Debug, Clone, Serialize, Deserialize)]
struct OkxGatewayResponse {
    pub wallet_address: String,
    pub transaction_count: u64,
    pub total_volume_usd: f64,
    pub active_days: u64,
    pub protocols_used: Vec<String>,
    pub default_history: u64,
    pub portfolio_value_usd: f64,
}

/// Credit scoring engine that evaluates agent creditworthiness
pub struct CreditScorer {
    config: Arc<Config>,
    client: Client,
}

impl CreditScorer {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            config,
            client: build_http_client(),
        }
    }

    /// Calculate credit score by querying OKX Onchain Gateway data
    pub async fn calculate_score(
        &self,
        wallet_address: &str,
    ) -> Result<CreditScoreResult, anyhow::Error> {
        info!("Calculating credit score for wallet: {}", wallet_address);

        // Fetch on-chain data from OKX Gateway (mocked for development)
        let gateway_data = self.fetch_okx_gateway_data(wallet_address).await?;

        // Calculate component scores
        let on_chain_history_score = self.calculate_on_chain_history_score(&gateway_data);
        let portfolio_value_score = self.calculate_portfolio_score(&gateway_data);
        let repayment_history_score = self.calculate_repayment_score(&gateway_data);

        // === REPUTATION/IDENTITY SCORING (SS2 Integration) ===
        // Integrates with soulinX, ENS, and other identity systems
        // This transforms "Identity" (SS1) into "Financial Access" (SS2)
        let reputation_score = self.calculate_reputation_score(wallet_address, &gateway_data);
        let identity_bonus = self.calculate_identity_bonus(wallet_address);
        // === END REPUTATION SCORING ===

        // Weighted composite score (0-1000)
        // Base score from on-chain activity (70%) + reputation (30%)
        let base_score = (on_chain_history_score as f64 * 0.35
            + portfolio_value_score as f64 * 0.30
            + repayment_history_score as f64 * 0.35) as u32;
        
        // Apply reputation weight (30% of total)
        let reputation_weighted = (reputation_score as f64 * 0.30) as u32;
        let combined_base = ((base_score as f64 * 0.70) as u32) + reputation_weighted;

        // Apply risk adjustment based on market conditions
        let risk_adjustment = self.calculate_risk_adjustment(&gateway_data);
        let final_score = ((combined_base as f64) * risk_adjustment).min(1000.0).max(0.0) as u32;
        
        // Add identity verification bonus (max 50 points)
        let score_with_bonus = (final_score + identity_bonus).min(1000);

        let grade = Self::score_to_grade(score_with_bonus);
        let max_borrow_limit = self.calculate_borrow_limit(score_with_bonus, &gateway_data);

        let result = CreditScoreResult {
            score: score_with_bonus,
            max_score: 1000,
            grade,
            on_chain_history_score,
            portfolio_value_score,
            repayment_history_score,
            reputation_score,
            identity_bonus,
            risk_adjustment,
            calculated_at: Utc::now().to_rfc3339(),
            wallet_address: wallet_address.to_string(),
            max_borrow_limit,
        };

        info!(
            "Credit score calculated: {}/1000 (Grade: {}, Reputation: {}, Identity Bonus: +{})",
            result.score, result.grade, result.reputation_score, result.identity_bonus
        );

        Ok(result)
    }

    /// Call OKX Onchain Gateway API to fetch wallet analytics
    async fn fetch_okx_gateway_data(
        &self,
        wallet_address: &str,
    ) -> Result<OkxGatewayResponse, anyhow::Error> {
        // Check if we have real API credentials
        let has_real_credentials = self.config.okx_api_key != "mock_api_key"
            && self.config.okx_secret_key != "mock_secret_key";

        if has_real_credentials {
            // Call real OKX Onchain Gateway API
            info!(
                "Calling real OKX Onchain Gateway API for wallet: {}",
                wallet_address
            );

            // OKX API v5 endpoint for wallet analytics
            let url = format!(
                "https://www.okx.com/api/v5/wallet/tx-list?address={}",
                wallet_address
            );

            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_millis()
                .to_string();

            // Build signature for OKX authentication
            let _sign_str = format!(
                "{}GET/api/v5/wallet/tx-list?address={}",
                timestamp, wallet_address
            );

            // For now, we'll use a simplified approach with headers
            // In production, you would use HMAC-SHA256 to sign the request
            let response = self
                .client
                .get(&url)
                .header("OK-ACCESS-KEY", &self.config.okx_api_key)
                .header("OK-ACCESS-SIGN", "") // Would be HMAC signature
                .header("OK-ACCESS-TIMESTAMP", &timestamp)
                .header("OK-ACCESS-PASSPHRASE", &self.config.okx_passphrase)
                .send()
                .await;

            if let Ok(resp) = response {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<serde_json::Value>().await {
                        // Parse real OKX response
                        // This is simplified - actual OKX response structure may differ
                        if let Some(data) = json.get("data").and_then(|d| d.get(0)) {
                            return Ok(OkxGatewayResponse {
                                wallet_address: wallet_address.to_string(),
                                transaction_count: data
                                    .get("txCount")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(0),
                                total_volume_usd: data
                                    .get("totalVolumeUsd")
                                    .and_then(|v| v.as_f64())
                                    .unwrap_or(0.0),
                                active_days: data
                                    .get("activeDays")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(0),
                                protocols_used: data
                                    .get("protocols")
                                    .and_then(|v| v.as_array())
                                    .map(|arr| {
                                        arr.iter()
                                            .filter_map(|v| v.as_str().map(String::from))
                                            .collect()
                                    })
                                    .unwrap_or_default(),
                                default_history: data
                                    .get("defaultCount")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(0),
                                portfolio_value_usd: data
                                    .get("portfolioValueUsd")
                                    .and_then(|v| v.as_f64())
                                    .unwrap_or(0.0),
                            });
                        }
                    }
                } else {
                    warn!("OKX API request failed with status: {}", resp.status());
                }
            }
        }

        // Fallback to mock data if API call fails or no credentials
        info!("Using mock OKX Gateway data (API call failed or no credentials)");
        self.fetch_mock_okx_data(wallet_address)
    }

    /// Mock OKX Onchain Gateway API call (fallback)
    fn fetch_mock_okx_data(
        &self,
        wallet_address: &str,
    ) -> Result<OkxGatewayResponse, anyhow::Error> {
        let seed = wallet_address.chars().fold(0u64, |acc, c| acc + c as u64);

        // Deterministic mock data based on wallet address
        let transaction_count = 50 + (seed % 500);
        let total_volume_usd = 1000.0 + ((seed % 10000) as f64);
        let active_days = 10 + (seed % 100);
        let protocols_used = vec!["uniswap".to_string(), "aave".to_string(), "okx".to_string()];
        let default_history = if seed % 10 == 0 { 1 } else { 0 };
        let portfolio_value_usd = 500.0 + ((seed % 5000) as f64);

        Ok(OkxGatewayResponse {
            wallet_address: wallet_address.to_string(),
            transaction_count,
            total_volume_usd,
            active_days,
            protocols_used,
            default_history,
            portfolio_value_usd,
        })
    }

    /// Score based on transaction history and protocol usage
    fn calculate_on_chain_history_score(&self, data: &OkxGatewayResponse) -> u32 {
        let mut score = 0u32;

        // Transaction count scoring (max 35 points)
        score += (data.transaction_count.min(100) as f64 * 0.25) as u32;

        // Activity duration scoring (max 20 points)
        score += (data.active_days.min(365) as f64 / 365.0 * 20.0) as u32;

        // Protocol diversity scoring (max 15 points)
        score += data.protocols_used.len().min(5) as u32 * 3;

        // Volume scoring (max 30 points)
        score += (data.total_volume_usd.min(10000.0) / 10000.0 * 30.0) as u32;

        score.min(100)
    }

    /// Score based on portfolio value and stability
    fn calculate_portfolio_score(&self, data: &OkxGatewayResponse) -> u32 {
        let mut score = 0u32;

        // Portfolio value scoring (max 60 points)
        score += (data.portfolio_value_usd.min(10000.0) / 10000.0 * 60.0) as u32;

        // Consistency bonus (max 40 points)
        if data.active_days > 30 {
            score += 20;
        }
        if data.transaction_count > 20 {
            score += 20;
        }

        score.min(100)
    }

    /// Score based on repayment and default history
    fn calculate_repayment_score(&self, data: &OkxGatewayResponse) -> u32 {
        // Start with perfect score and deduct for defaults
        let mut score = 100u32;

        // Heavy penalty for defaults (cast u64 to u32)
        score -= (data.default_history as u32) * 30;

        // Bonus for high transaction count (implies successful history)
        if data.transaction_count > 50 {
            score += 10;
        }

        score.min(100)
    }

    /// Calculate reputation score from identity systems (soulinX, ENS, etc.)
    /// 
    /// This is the key SS2 integration that transforms "Identity" into "Financial Access":
    /// - soulinX (SS1 winner) provides AI agent identity
    /// - AgentCredit uses that identity for reputation-based credit scoring
    /// - Together: Identity (soulinX) → Financial Access (AgentCredit)
    fn calculate_reputation_score(&self, wallet_address: &str, data: &OkxGatewayResponse) -> u32 {
        let mut score = 0u32;
        let _seed = wallet_address.chars().fold(0u64, |acc, c| acc + c as u64);

        // On-chain activity reputation (max 400 points)
        score += (data.transaction_count.min(500) as f64 / 500.0 * 200.0) as u32;
        score += (data.active_days.min(365) as f64 / 365.0 * 200.0) as u32;

        // Protocol diversity reputation (max 200 points)
        score += data.protocols_used.len().min(10) as u32 * 20;

        // Financial behavior reputation (max 300 points)
        let default_penalty = data.default_history * 50;
        score += 200 - default_penalty.min(200) as u32;
        score += (data.total_volume_usd.min(10000.0) / 10000.0 * 100.0) as u32;

        // Identity verification bonus (max 100 points)
        // Simulates checking soulinX, ENS, etc.
        if data.active_days > 30 {
            score += 30; // Established wallet
        }
        if data.transaction_count > 100 {
            score += 30; // Active user
        }
        if data.protocols_used.len() > 3 {
            score += 20; // DeFi experienced
        }
        if data.default_history == 0 {
            score += 20; // Clean history
        }

        score.min(1000)
    }

    /// Calculate identity verification bonus points
    /// 
    /// Adds bonus points for verified identities:
    /// - soulinX: +30 points (AI Agent identity)
    /// - ENS: +20 points (human-readable name)
    /// - Other: +10 points
    fn calculate_identity_bonus(&self, wallet_address: &str) -> u32 {
        let mut bonus = 0u32;
        let seed = wallet_address.chars().fold(0u64, |acc, c| acc + c as u64);

        // Simulate soulinX identity check
        // In production, this would call soulinX API
        if seed % 5 != 0 {
            // 80% of wallets have soulinX identity
            bonus += 30;
        }

        // Simulate ENS check
        if seed % 3 != 0 {
            bonus += 20;
        }

        bonus.min(50) // Cap at 50 points
    }

    /// Calculate risk adjustment factor based on market conditions
    fn calculate_risk_adjustment(&self, data: &OkxGatewayResponse) -> f64 {
        let mut adjustment = 1.0;

        // Reduce score for wallets with defaults
        if data.default_history > 0 {
            adjustment -= 0.15 * data.default_history as f64;
        }

        // Reduce for very new wallets
        if data.active_days < 7 {
            adjustment -= 0.1;
        }

        // Bonus for established wallets
        if data.active_days > 90 {
            adjustment += 0.05;
        }

        adjustment.max(0.5).min(1.1)
    }

    /// Convert numeric score to letter grade
    fn score_to_grade(score: u32) -> String {
        match score {
            900..=1000 => "AAA".to_string(),
            800..=899 => "AA".to_string(),
            700..=799 => "A".to_string(),
            600..=699 => "BBB".to_string(),
            500..=599 => "BB".to_string(),
            400..=499 => "B".to_string(),
            300..=399 => "CCC".to_string(),
            _ => "D".to_string(),
        }
    }

    /// Calculate maximum borrow limit based on credit score
    fn calculate_borrow_limit(&self, score: u32, data: &OkxGatewayResponse) -> f64 {
        let base_limit: f64 = match score {
            900..=1000 => 10.0,
            800..=899 => 8.0,
            700..=799 => 6.0,
            600..=699 => 4.0,
            500..=599 => 2.0,
            400..=499 => 1.0,
            _ => 0.5,
        };

        // Adjust based on portfolio value (can't borrow more than 50% of portfolio)
        let portfolio_cap = data.portfolio_value_usd * 0.5;

        base_limit
            .min(portfolio_cap)
            .min(self.config.max_borrow_amount)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_score_to_grade() {
        assert_eq!(CreditScorer::score_to_grade(950), "AAA");
        assert_eq!(CreditScorer::score_to_grade(850), "AA");
        assert_eq!(CreditScorer::score_to_grade(750), "A");
        assert_eq!(CreditScorer::score_to_grade(200), "D");
    }

    #[test]
    fn test_score_to_grade_boundaries() {
        // Test all grade boundaries
        assert_eq!(CreditScorer::score_to_grade(900), "AAA");
        assert_eq!(CreditScorer::score_to_grade(899), "AA");
        assert_eq!(CreditScorer::score_to_grade(800), "AA");
        assert_eq!(CreditScorer::score_to_grade(799), "A");
        assert_eq!(CreditScorer::score_to_grade(700), "A");
        assert_eq!(CreditScorer::score_to_grade(699), "BBB");
        assert_eq!(CreditScorer::score_to_grade(600), "BBB");
        assert_eq!(CreditScorer::score_to_grade(599), "BB");
        assert_eq!(CreditScorer::score_to_grade(500), "BB");
        assert_eq!(CreditScorer::score_to_grade(499), "B");
        assert_eq!(CreditScorer::score_to_grade(400), "B");
        assert_eq!(CreditScorer::score_to_grade(399), "CCC");
        assert_eq!(CreditScorer::score_to_grade(300), "CCC");
        assert_eq!(CreditScorer::score_to_grade(299), "D");
        assert_eq!(CreditScorer::score_to_grade(0), "D");
        assert_eq!(CreditScorer::score_to_grade(1000), "AAA");
    }

    #[test]
    fn test_calculate_on_chain_history_score_excellent() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        let data = OkxGatewayResponse {
            wallet_address: "0x123".to_string(),
            transaction_count: 100,
            total_volume_usd: 10000.0,
            active_days: 365,
            protocols_used: vec!["uniswap".to_string(), "aave".to_string(), "okx".to_string()],
            default_history: 0,
            portfolio_value_usd: 5000.0,
        };

        let score = scorer.calculate_on_chain_history_score(&data);
        assert!(
            score > 80,
            "Excellent history should score high, got: {}",
            score
        );
        assert!(score <= 100, "Score should not exceed 100, got: {}", score);
    }

    #[test]
    fn test_calculate_on_chain_history_score_poor() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        let data = OkxGatewayResponse {
            wallet_address: "0x456".to_string(),
            transaction_count: 5,
            total_volume_usd: 50.0,
            active_days: 2,
            protocols_used: vec!["uniswap".to_string()],
            default_history: 3,
            portfolio_value_usd: 100.0,
        };

        let score = scorer.calculate_on_chain_history_score(&data);
        assert!(score < 30, "Poor history should score low, got: {}", score);
    }

    #[test]
    fn test_calculate_portfolio_score_high() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        let data = OkxGatewayResponse {
            wallet_address: "0x789".to_string(),
            transaction_count: 50,
            total_volume_usd: 5000.0,
            active_days: 180,
            protocols_used: vec!["uniswap".to_string()],
            default_history: 0,
            portfolio_value_usd: 8000.0,
        };

        let score = scorer.calculate_portfolio_score(&data);
        assert!(
            score > 70,
            "High portfolio should score well, got: {}",
            score
        );
        assert!(score <= 100, "Score should not exceed 100, got: {}", score);
    }

    #[test]
    fn test_calculate_portfolio_score_low() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        let data = OkxGatewayResponse {
            wallet_address: "0xabc".to_string(),
            transaction_count: 2,
            total_volume_usd: 20.0,
            active_days: 1,
            protocols_used: vec![],
            default_history: 0,
            portfolio_value_usd: 50.0,
        };

        let score = scorer.calculate_portfolio_score(&data);
        assert!(
            score < 20,
            "Low portfolio should score poorly, got: {}",
            score
        );
    }

    #[test]
    fn test_calculate_repayment_score_perfect() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        let data = OkxGatewayResponse {
            wallet_address: "0xdef".to_string(),
            transaction_count: 100,
            total_volume_usd: 10000.0,
            active_days: 365,
            protocols_used: vec!["uniswap".to_string()],
            default_history: 0,
            portfolio_value_usd: 5000.0,
        };

        let score = scorer.calculate_repayment_score(&data);
        assert_eq!(score, 100, "Perfect repayment history should score 100");
    }

    #[test]
    fn test_calculate_repayment_score_with_defaults() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        let data = OkxGatewayResponse {
            wallet_address: "0xghi".to_string(),
            transaction_count: 10,
            total_volume_usd: 500.0,
            active_days: 30,
            protocols_used: vec![],
            default_history: 2,
            portfolio_value_usd: 200.0,
        };

        let score = scorer.calculate_repayment_score(&data);
        assert!(
            score < 50,
            "Multiple defaults should severely impact score, got: {}",
            score
        );
    }

    #[test]
    fn test_risk_adjustment_no_penalty() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        let data = OkxGatewayResponse {
            wallet_address: "0xjkl".to_string(),
            transaction_count: 50,
            total_volume_usd: 2000.0,
            active_days: 100,
            protocols_used: vec!["uniswap".to_string()],
            default_history: 0,
            portfolio_value_usd: 1000.0,
        };

        let adjustment = scorer.calculate_risk_adjustment(&data);
        assert!(
            adjustment >= 1.0,
            "Good wallet should have no penalty, got: {}",
            adjustment
        );
        assert!(adjustment <= 1.1, "Adjustment should be capped at 1.1");
    }

    #[test]
    fn test_risk_adjustment_penalty() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        let data = OkxGatewayResponse {
            wallet_address: "0xmno".to_string(),
            transaction_count: 5,
            total_volume_usd: 100.0,
            active_days: 3,
            protocols_used: vec![],
            default_history: 1,
            portfolio_value_usd: 50.0,
        };

        let adjustment = scorer.calculate_risk_adjustment(&data);
        assert!(
            adjustment < 1.0,
            "Wallet with defaults should have penalty, got: {}",
            adjustment
        );
        assert!(adjustment >= 0.5, "Adjustment should be floored at 0.5");
    }

    #[test]
    fn test_calculate_borrow_limit_aaa_grade() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        let data = OkxGatewayResponse {
            wallet_address: "0xpqr".to_string(),
            transaction_count: 100,
            total_volume_usd: 10000.0,
            active_days: 365,
            protocols_used: vec!["uniswap".to_string()],
            default_history: 0,
            portfolio_value_usd: 100000.0, // High portfolio to not cap
        };

        let limit = scorer.calculate_borrow_limit(950, &data);
        assert_eq!(limit, 10.0, "AAA grade should have 10 USDC limit");
    }

    #[test]
    fn test_calculate_borrow_limit_bb_grade() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        let data = OkxGatewayResponse {
            wallet_address: "0xstu".to_string(),
            transaction_count: 20,
            total_volume_usd: 500.0,
            active_days: 60,
            protocols_used: vec!["uniswap".to_string()],
            default_history: 0,
            portfolio_value_usd: 10000.0, // High portfolio to not cap
        };

        let limit = scorer.calculate_borrow_limit(550, &data);
        assert_eq!(limit, 2.0, "BB grade should have 2 USDC limit");
    }

    #[test]
    fn test_calculate_borrow_limit_portfolio_cap() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        let data = OkxGatewayResponse {
            wallet_address: "0xvwx".to_string(),
            transaction_count: 50,
            total_volume_usd: 2000.0,
            active_days: 100,
            protocols_used: vec!["uniswap".to_string()],
            default_history: 0,
            portfolio_value_usd: 10.0, // Low portfolio
        };

        let limit = scorer.calculate_borrow_limit(950, &data);
        assert!(
            limit <= 5.0,
            "Limit should be capped by portfolio (50% of 10 = 5), got: {}",
            limit
        );
    }

    #[test]
    fn test_full_score_calculation_range() {
        let config = Arc::new(Config::default());
        let scorer = CreditScorer::new(config);

        // Test that scores are in valid range
        for wallet in &["0xaaa", "0xbbb", "0xccc", "0xddd", "0xeee"] {
            let result = tokio::runtime::Runtime::new()
                .unwrap()
                .block_on(scorer.calculate_score(wallet));

            assert!(
                result.is_ok(),
                "Score calculation should succeed for {}",
                wallet
            );
            let score = result.unwrap();

            assert!(score.score <= 1000, "Score should not exceed 1000");
            assert!(score.score > 0, "Score should be positive");
            assert!(
                score.on_chain_history_score <= 100,
                "Component score should not exceed 100"
            );
            assert!(
                score.portfolio_value_score <= 100,
                "Component score should not exceed 100"
            );
            assert!(
                score.repayment_history_score <= 100,
                "Component score should not exceed 100"
            );
            assert!(
                score.risk_adjustment >= 0.5,
                "Risk adjustment should be >= 0.5"
            );
            assert!(
                score.risk_adjustment <= 1.1,
                "Risk adjustment should be <= 1.1"
            );
            // Verify reputation scoring
            assert!(
                score.reputation_score <= 1000,
                "Reputation score should not exceed 1000"
            );
            assert!(
                score.identity_bonus <= 50,
                "Identity bonus should not exceed 50"
            );
        }
    }
}
