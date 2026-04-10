use serde::{Deserialize, Serialize};
use std::env;

/// Application configuration loaded from environment variables.
/// Never expose real keys - use .env file for secrets.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub okx_api_key: String,
    pub okx_secret_key: String,
    pub okx_passphrase: String,
    pub x_layer_rpc: String,
    pub chain_id: u64,
    pub agent_wallet: String,
    pub backend_port: u16,
    pub frontend_url: String,
    pub loop_interval_secs: u64,
    pub liquidation_threshold: f64,
    pub max_borrow_amount: f64,
    pub min_borrow_amount: f64,
    /// JWT secret for API authentication
    pub jwt_secret: String,
    /// JWT token expiry in seconds
    pub jwt_token_expiry_secs: u64,
    /// Enable authentication (default: false for development)
    pub auth_enabled: bool,
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        // Load .env file if present
        let _ = dotenvy::dotenv();

        let okx_api_key = env::var("OKX_API_KEY").unwrap_or_else(|_| "mock_api_key".to_string());
        let okx_secret_key =
            env::var("OKX_SECRET_KEY").unwrap_or_else(|_| "mock_secret_key".to_string());
        let okx_passphrase =
            env::var("OKX_PASSPHRASE").unwrap_or_else(|_| "mock_passphrase".to_string());
        let x_layer_rpc =
            env::var("X_LAYER_RPC").unwrap_or_else(|_| "https://rpc.xlayer.tech".to_string());
        let chain_id = env::var("CHAIN_ID")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(196u64); // X Layer Mainnet chain ID
        let agent_wallet = env::var("AGENT_WALLET")
            .unwrap_or_else(|_| "0x0000000000000000000000000000000000000000".to_string());
        let backend_port = env::var("BACKEND_PORT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(3001u16);
        let frontend_url =
            env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
        let loop_interval_secs = env::var("LOOP_INTERVAL_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(30u64);
        let liquidation_threshold = env::var("LIQUIDATION_THRESHOLD")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1.2f64);
        let max_borrow_amount = env::var("MAX_BORROW_AMOUNT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(10.0f64);
        let min_borrow_amount = env::var("MIN_BORROW_AMOUNT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.1f64);

        let jwt_secret =
            env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-change-me".to_string());

        let jwt_token_expiry_secs = env::var("JWT_TOKEN_EXPIRY_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(86400u64); // 24 hours

        let auth_enabled = env::var("AUTH_ENABLED")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(false); // Disabled by default for development

        Ok(Config {
            okx_api_key,
            okx_secret_key,
            okx_passphrase,
            x_layer_rpc,
            chain_id,
            agent_wallet,
            backend_port,
            frontend_url,
            loop_interval_secs,
            liquidation_threshold,
            max_borrow_amount,
            min_borrow_amount,
            jwt_secret,
            jwt_token_expiry_secs,
            auth_enabled,
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Missing required env var: {0}")]
    MissingEnvVar(String),
    #[error("Invalid config: {0}")]
    InvalidConfig(String),
}

impl Default for Config {
    fn default() -> Self {
        Self {
            okx_api_key: "mock_api_key".to_string(),
            okx_secret_key: "mock_secret_key".to_string(),
            okx_passphrase: "mock_passphrase".to_string(),
            x_layer_rpc: "https://rpc.xlayer.tech".to_string(),
            chain_id: 196,
            agent_wallet: "0x0000000000000000000000000000000000000000".to_string(),
            backend_port: 3001,
            frontend_url: "http://localhost:3000".to_string(),
            loop_interval_secs: 30,
            liquidation_threshold: 1.2,
            max_borrow_amount: 10.0,
            min_borrow_amount: 0.1,
            jwt_secret: "dev-secret-change-me".to_string(),
            jwt_token_expiry_secs: 86400,
            auth_enabled: false,
        }
    }
}
