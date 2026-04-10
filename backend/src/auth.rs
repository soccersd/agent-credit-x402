use axum::{
    extract::Request,
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{info, warn};

/// JWT Claims structure for authentication
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// User ID or API key identifier
    pub sub: String,
    /// Expiration time (Unix timestamp)
    pub exp: usize,
    /// Issued at time
    pub iat: usize,
    /// Role (admin, user, agent)
    pub role: String,
}

/// Authentication middleware configuration
#[derive(Debug, Clone)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub token_expiry_secs: u64,
}

impl AuthConfig {
    pub fn from_env() -> Self {
        let secret = std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "dev-secret-change-me-in-production".to_string());

        let expiry_secs = std::env::var("JWT_TOKEN_EXPIRY_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(86400); // 24 hours

        Self {
            jwt_secret: secret,
            token_expiry_secs: expiry_secs,
        }
    }

    /// Generate a new JWT token for the given user
    pub fn generate_token(&self, user_id: &str, role: &str) -> Result<String, anyhow::Error> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as usize;

        let claims = Claims {
            sub: user_id.to_string(),
            exp: now + self.token_expiry_secs as usize,
            iat: now,
            role: role.to_string(),
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        )?;

        info!("Generated JWT token for user: {} (role: {})", user_id, role);
        Ok(token)
    }

    /// Validate and decode a JWT token
    pub fn validate_token(&self, token: &str) -> Result<Claims, anyhow::Error> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_bytes()),
            &Validation::default(),
        )?;

        Ok(token_data.claims)
    }
}

/// JWT Authentication Middleware
pub async fn auth_middleware(mut request: Request, next: Next) -> Result<Response, StatusCode> {
    // Get the auth config from request extensions
    let auth_config = request.extensions().get::<AuthConfig>().ok_or_else(|| {
        warn!("AuthConfig not found in request extensions");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Extract the Authorization header
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| {
            warn!("Missing Authorization header");
            StatusCode::UNAUTHORIZED
        })?;

    // Parse the Bearer token
    if !auth_header.starts_with("Bearer ") {
        warn!("Invalid Authorization header format (expected 'Bearer <token>')");
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = &auth_header[7..]; // Remove "Bearer " prefix

    // Validate the token
    match auth_config.validate_token(token) {
        Ok(claims) => {
            // Add claims to request extensions for downstream handlers
            request.extensions_mut().insert(claims);
            info!("Request authenticated successfully");
            Ok(next.run(request).await)
        }
        Err(e) => {
            warn!("Invalid JWT token: {}", e);
            Err(StatusCode::UNAUTHORIZED)
        }
    }
}

/// Optional auth middleware - allows requests without auth but attaches claims if present
pub async fn optional_auth_middleware(mut request: Request, next: Next) -> Response {
    let auth_config = request.extensions().get::<AuthConfig>().cloned();

    if let Some(config) = auth_config {
        if let Some(auth_header) = request.headers().get(AUTHORIZATION) {
            if let Ok(header_str) = auth_header.to_str() {
                if header_str.starts_with("Bearer ") {
                    let token = &header_str[7..];
                    if let Ok(claims) = config.validate_token(token) {
                        request.extensions_mut().insert(claims);
                    }
                }
            }
        }
    }

    next.run(request).await
}

/// Helper to extract claims from request extensions
pub fn get_claims(request: &Request) -> Option<Claims> {
    request.extensions().get::<Claims>().cloned()
}

/// Require admin role
pub fn require_admin(claims: &Claims) -> Result<(), StatusCode> {
    if claims.role == "admin" {
        Ok(())
    } else {
        warn!(
            "Admin access denied for user: {} (role: {})",
            claims.sub, claims.role
        );
        Err(StatusCode::FORBIDDEN)
    }
}
