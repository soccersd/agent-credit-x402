// Allow dead_code warnings - many methods are public APIs called externally
#![allow(dead_code)]

mod agent_loop;
mod api;
mod auth;
mod config;
mod db;
mod http_client;
mod engine {
    pub mod collateral_mgr;
    pub mod credit_scoring;
    pub mod liquidator;
    pub mod x402_lending;
    pub mod task_engine;
    pub mod reputation_engine;
}

use crate::agent_loop::AgentLoop;
use crate::api::create_router;
use crate::config::Config;
use crate::db::Database;
use anyhow::Context;
use std::net::SocketAddr;
use std::sync::Arc;
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(true)
                .with_thread_ids(true)
                .with_file(true)
                .with_line_number(true),
        )
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info,agent_credit_x402=debug")),
        )
        .init();

    info!("=================================================");
    info!("  AgentCredit x402 Lending Hub - Backend Server");
    info!("  Build X Season 2 - X Layer Arena Hackathon");
    info!("=================================================");

    // Load configuration
    let config = Config::from_env().unwrap_or_else(|e| {
        error!("Failed to load configuration: {}", e);
        Config::default()
    });

    info!("Configuration loaded successfully");
    info!("  Chain ID: {}", config.chain_id);
    info!("  X Layer RPC: {}", config.x_layer_rpc);
    info!("  Backend Port: {}", config.backend_port);
    info!("  Loop Interval: {}s", config.loop_interval_secs);
    info!(
        "  Liquidation Threshold: {:.2}",
        config.liquidation_threshold
    );
    info!(
        "  Borrow Range: {} - {} USDC",
        config.min_borrow_amount, config.max_borrow_amount
    );

    let config_arc = Arc::new(config);

    // Initialize database
    let database_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:agent_credit.db".to_string());
    let database = Database::new(&database_url).await?;
    let db_arc = Arc::new(database);

    // Initialize agent loop with database
    let agent_loop = AgentLoop::new(config_arc.clone(), db_arc.clone());
    let shared_state = agent_loop.shared_state();
    let command_sender = agent_loop.command_sender();

    // Start agent loop in background
    info!("Starting agent loop...");
    let _agent_handle = agent_loop.start();

    // Build API router with database and WebSocket support
    let app = create_router(shared_state.clone(), command_sender.clone(), db_arc.clone());

    // Initialize authentication
    let auth_config = crate::auth::AuthConfig {
        jwt_secret: config_arc.jwt_secret.clone(),
        token_expiry_secs: config_arc.jwt_token_expiry_secs,
    };

    info!(
        "Authentication: {}",
        if config_arc.auth_enabled {
            "ENABLED"
        } else {
            "DISABLED (development mode)"
        }
    );

    // Apply middleware layers
    let cors_layer = tower_http::cors::CorsLayer::new()
        .allow_origin(
            config_arc
                .frontend_url
                .parse::<axum::http::HeaderValue>()
                .unwrap_or_else(|_| axum::http::HeaderValue::from_static("*")),
        )
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::ACCEPT,
            axum::http::header::AUTHORIZATION,
        ])
        .max_age(std::time::Duration::from_secs(3600));

    // Apply auth middleware only if enabled
    let app = if config_arc.auth_enabled {
        app.layer(axum::middleware::from_fn(crate::auth::auth_middleware))
    } else {
        app
    };

    let app = app
        .layer(axum::Extension(auth_config.clone()))
        .layer(cors_layer);

    // Start Axum server
    let addr = SocketAddr::from(([0, 0, 0, 0], config_arc.backend_port));
    info!("Starting API server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .with_context(|| {
            format!(
                "failed to bind API server to {}. Check whether the port is already in use or set BACKEND_PORT to a free port",
                addr
            )
        })?;

    info!("AgentCredit x402 backend is ready!");
    info!(
        "API endpoints available at: http://localhost:{}/api/*",
        config_arc.backend_port
    );

    // Auto-start agent loop
    command_sender
        .send(crate::agent_loop::AgentCommand::Start)
        .unwrap();

    if let Err(e) = axum::serve(listener, app).await {
        error!("Server error: {}", e);
        return Err(e.into());
    }

    Ok(())
}
