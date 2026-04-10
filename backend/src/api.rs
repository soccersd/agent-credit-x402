use crate::agent_loop::{AgentCommand, AgentSharedState, AgentState};
use crate::db::Database;
use crate::engine::x402_lending::LoanRequest;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    routing::{get, post},
    Json, Router,
};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, warn};

/// Application state shared with API handlers
pub type SharedState = Arc<Mutex<AgentSharedState>>;

/// Request to trigger agent loop
#[derive(Debug, Deserialize)]
pub struct TriggerLoopRequest {
    pub force: Option<bool>,
}

/// Request to calculate credit score
#[derive(Debug, Deserialize)]
pub struct CalculateScoreRequest {
    pub wallet_address: String,
}

/// Request to create a loan
#[derive(Debug, Deserialize)]
pub struct CreateLoanRequest {
    pub amount: f64,
    pub collateral_token: String,
    pub duration_secs: u64,
}

/// API response wrapper
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub timestamp: String,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.to_string()),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
}

/// Tuple type for Axum state
pub type AppState = (
    SharedState,
    tokio::sync::mpsc::UnboundedSender<AgentCommand>,
    Arc<Database>,
);

/// Build the Axum router with all API endpoints
pub fn create_router(
    state: SharedState,
    command_tx: tokio::sync::mpsc::UnboundedSender<AgentCommand>,
    database: Arc<Database>,
) -> Router {
    Router::new()
        // Public endpoints (no auth required)
        .route("/api/health", get(health_check))
        .route("/api/auth/login", post(login_endpoint))
        .route("/api/auth/token", post(generate_token_endpoint))
        // Protected endpoints (auth required when enabled)
        .route("/api/status", get(get_status))
        .route("/api/trigger_loop", post(trigger_loop))
        .route("/api/credit_score", post(calculate_credit_score))
        .route("/api/loans", get(get_active_loans))
        .route("/api/loans", post(create_loan))
        .route("/api/loans/:loan_id/repay", post(repay_loan))
        .route("/api/loans/:loan_id/cancel", post(cancel_loan))
        .route("/api/collateral", get(get_collateral_report))
        .route("/api/start", post(start_agent))
        .route("/api/stop", post(stop_agent))
        .route("/api/ws/events", get(websocket_events))
        .with_state((state, command_tx, database))
}

/// Login endpoint - accepts API key and returns JWT token
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub api_key: String,
    pub user_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub expires_in: u64,
    pub token_type: String,
}

async fn login_endpoint(
    State((_, _, _)): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Json<ApiResponse<LoginResponse>> {
    // In production, validate against real API keys from database
    // For now, accept any non-empty API key and generate a token
    if payload.api_key.is_empty() {
        return Json(ApiResponse::error("API key is required"));
    }

    let auth_config = crate::auth::AuthConfig::from_env();
    let user_id = payload.user_id.unwrap_or_else(|| "user".to_string());

    match auth_config.generate_token(&user_id, "user") {
        Ok(token) => Json(ApiResponse::ok(LoginResponse {
            token,
            expires_in: auth_config.token_expiry_secs,
            token_type: "Bearer".to_string(),
        })),
        Err(e) => {
            tracing::error!("Failed to generate token: {}", e);
            Json(ApiResponse::error("Failed to generate token"))
        }
    }
}

/// Generate token endpoint (for admin use)
#[derive(Debug, Deserialize)]
pub struct GenerateTokenRequest {
    pub user_id: String,
    pub role: Option<String>,
}

async fn generate_token_endpoint(
    State((_, _, _)): State<AppState>,
    Json(payload): Json<GenerateTokenRequest>,
) -> Json<ApiResponse<LoginResponse>> {
    let auth_config = crate::auth::AuthConfig::from_env();
    let role = payload.role.unwrap_or_else(|| "user".to_string());

    match auth_config.generate_token(&payload.user_id, &role) {
        Ok(token) => Json(ApiResponse::ok(LoginResponse {
            token,
            expires_in: auth_config.token_expiry_secs,
            token_type: "Bearer".to_string(),
        })),
        Err(e) => {
            tracing::error!("Failed to generate token: {}", e);
            Json(ApiResponse::error("Failed to generate token"))
        }
    }
}

/// WebSocket endpoint for real-time event streaming
async fn websocket_events(
    ws: WebSocketUpgrade,
    State((state, _command_tx, database)): State<AppState>,
) -> impl axum::response::IntoResponse {
    info!("WebSocket client connecting");

    ws.on_upgrade(move |socket| handle_websocket(socket, state, database))
}

/// Handle WebSocket connection
async fn handle_websocket(mut socket: WebSocket, state: SharedState, database: Arc<Database>) {
    // Subscribe to event broadcast channel
    let mut event_receiver = state.lock().await.event_broadcast.subscribe();

    // Send initial state to client
    let initial_state = {
        let state_guard = state.lock().await;
        serde_json::json!({
            "type": "initial_state",
            "data": {
                "current_state": format!("{:?}", state_guard.current_state),
                "is_running": state_guard.is_running,
                "credit_score": state_guard.credit_score,
                "active_loans_count": state_guard.active_loans.len(),
                "active_loans": state_guard.active_loans,
                "collateral_report": state_guard.collateral_report,
                "iteration_count": state_guard.iteration_count,
                "last_updated": state_guard.last_updated,
            }
        })
    };

    if let Ok(json) = serde_json::to_string(&initial_state) {
        if let Err(e) = socket.send(Message::Text(json)).await {
            warn!("Failed to send initial state: {}", e);
            return;
        }
    }

    // Send recent events history
    if let Ok(events) = database.get_recent_events(50).await {
        for event in events {
            let event_msg = serde_json::json!({
                "type": "event",
                "event_type": event.event_type,
                "data": event.event_data_json,
                "timestamp": event.timestamp,
            });

            if let Ok(json) = serde_json::to_string(&event_msg) {
                if let Err(e) = socket.send(Message::Text(json)).await {
                    warn!("Failed to send event history: {}", e);
                    break;
                }
            }
        }
    }

    // Listen for new events and forward to WebSocket
    loop {
        tokio::select! {
            // Listen for new agent events
            Ok(event) = event_receiver.recv() => {
                let event_msg = match event {
                    crate::agent_loop::AgentEvent::StateChanged { from, to, timestamp } => {
                        serde_json::json!({
                            "type": "state_changed",
                            "from": format!("{:?}", from),
                            "to": format!("{:?}", to),
                            "timestamp": timestamp,
                        })
                    }
                    crate::agent_loop::AgentEvent::CreditScored(score) => {
                        serde_json::json!({
                            "type": "credit_scored",
                            "data": score,
                        })
                    }
                    crate::agent_loop::AgentEvent::LoanCreated(loan) => {
                        serde_json::json!({
                            "type": "loan_created",
                            "data": loan,
                        })
                    }
                    crate::agent_loop::AgentEvent::LoanRepaid { loan_id, amount, timestamp } => {
                        serde_json::json!({
                            "type": "loan_repaid",
                            "loan_id": loan_id,
                            "amount": amount,
                            "timestamp": timestamp,
                        })
                    }
                    crate::agent_loop::AgentEvent::CollateralAlert(report) => {
                        serde_json::json!({
                            "type": "collateral_alert",
                            "data": report,
                        })
                    }
                    crate::agent_loop::AgentEvent::LiquidationAlert(alert) => {
                        serde_json::json!({
                            "type": "liquidation_alert",
                            "data": alert,
                        })
                    }
                    crate::agent_loop::AgentEvent::Error { message, state: _, timestamp } => {
                        serde_json::json!({
                            "type": "error",
                            "message": message,
                            "timestamp": timestamp,
                        })
                    }
                    crate::agent_loop::AgentEvent::LoopIteration { iteration, state: _, timestamp } => {
                        serde_json::json!({
                            "type": "loop_iteration",
                            "iteration": iteration,
                            "timestamp": timestamp,
                        })
                    }
                };

                if let Ok(json) = serde_json::to_string(&event_msg) {
                    if let Err(e) = socket.send(Message::Text(json)).await {
                        warn!("Failed to send event to WebSocket: {}", e);
                        break;
                    }
                }
            }
            // Check if client disconnected
            Some(msg) = socket.next() => {
                match msg {
                    Ok(Message::Close(_)) => {
                        info!("WebSocket client disconnected");
                        break;
                    }
                    Ok(Message::Ping(data)) => {
                        if let Err(e) = socket.send(Message::Pong(data)).await {
                            warn!("Failed to send pong: {}", e);
                            break;
                        }
                    }
                    Ok(Message::Text(text)) => {
                        info!("Received from client: {}", text);
                        // Could handle client commands here
                    }
                    Err(e) => {
                        warn!("WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        }
    }

    info!("WebSocket connection closed");
}

/// Health check endpoint
async fn health_check(
    State((_state, _command_tx, _db)): State<AppState>,
) -> Json<ApiResponse<String>> {
    Json(ApiResponse::ok(
        "AgentCredit x402 backend is running".to_string(),
    ))
}

/// Get current agent status
async fn get_status(
    State((state, _command_tx, _db)): State<AppState>,
) -> Json<ApiResponse<AgentStatusResponse>> {
    let state = state.lock().await;

    let response = AgentStatusResponse {
        current_state: state.current_state.clone(),
        is_running: state.is_running,
        credit_score: state.credit_score.clone(),
        active_loans_count: state.active_loans.len(),
        active_loans: state.active_loans.clone(),
        collateral_report: state.collateral_report.clone(),
        iteration_count: state.iteration_count,
        last_updated: state.last_updated.clone(),
        error_message: state.error_message.clone(),
    };

    Json(ApiResponse::ok(response))
}

/// Trigger agent loop iteration
async fn trigger_loop(
    State((_state, command_tx, _db)): State<AppState>,
    Json(_payload): Json<TriggerLoopRequest>,
) -> Json<ApiResponse<String>> {
    let _ = command_tx.send(AgentCommand::TriggerLoop);
    Json(ApiResponse::ok("Agent loop triggered".to_string()))
}

/// Calculate credit score for a wallet
async fn calculate_credit_score(
    State((_state, command_tx, _db)): State<AppState>,
    Json(payload): Json<CalculateScoreRequest>,
) -> Json<ApiResponse<String>> {
    let _ = command_tx.send(AgentCommand::TriggerLoop);
    Json(ApiResponse::ok(format!(
        "Credit score calculation triggered for: {}",
        payload.wallet_address
    )))
}

/// Get all active loans
async fn get_active_loans(
    State((state, _command_tx, _db)): State<AppState>,
) -> Json<ApiResponse<Vec<crate::engine::x402_lending::ActiveLoan>>> {
    let state = state.lock().await;
    Json(ApiResponse::ok(state.active_loans.clone()))
}

/// Create a new loan
async fn create_loan(
    State((state, command_tx, _db)): State<AppState>,
    Json(payload): Json<CreateLoanRequest>,
) -> Json<ApiResponse<String>> {
    let state_guard = state.lock().await;
    let credit_score = state_guard
        .credit_score
        .as_ref()
        .map(|cs| cs.score)
        .unwrap_or(500);

    let wallet_address = state_guard
        .credit_score
        .as_ref()
        .map(|cs| cs.wallet_address.clone())
        .unwrap_or_else(|| "0x0000000000000000000000000000000000000000".to_string());
    drop(state_guard);

    let request = LoanRequest {
        wallet_address,
        amount: payload.amount,
        collateral_token: payload.collateral_token,
        duration_secs: payload.duration_secs,
        credit_score,
    };

    let _ = command_tx.send(AgentCommand::RequestLoan(request));
    Json(ApiResponse::ok("Loan request queued".to_string()))
}

/// Repay a specific loan
async fn repay_loan(
    State((_state, command_tx, _db)): State<AppState>,
    axum::extract::Path(loan_id): axum::extract::Path<String>,
) -> Json<ApiResponse<String>> {
    let _ = command_tx.send(AgentCommand::RepayLoan(loan_id.clone()));
    Json(ApiResponse::ok(format!(
        "Repayment triggered for loan: {}",
        loan_id
    )))
}

/// Cancel a specific loan
async fn cancel_loan(
    State((_state, command_tx, _db)): State<AppState>,
    axum::extract::Path(loan_id): axum::extract::Path<String>,
) -> Json<ApiResponse<String>> {
    let _ = command_tx.send(AgentCommand::CancelLoan(loan_id.clone()));
    Json(ApiResponse::ok(format!(
        "Loan cancellation requested for: {}",
        loan_id
    )))
}

/// Get collateral health report
async fn get_collateral_report(
    State((state, _command_tx, _db)): State<AppState>,
) -> Json<ApiResponse<Option<crate::engine::collateral_mgr::CollateralHealthReport>>> {
    let state = state.lock().await;
    Json(ApiResponse::ok(state.collateral_report.clone()))
}

/// Start the agent loop
async fn start_agent(
    State((_state, command_tx, _db)): State<AppState>,
) -> Json<ApiResponse<String>> {
    let _ = command_tx.send(AgentCommand::Start);
    Json(ApiResponse::ok("Agent loop started".to_string()))
}

/// Stop the agent loop
async fn stop_agent(
    State((_state, command_tx, _db)): State<AppState>,
) -> Json<ApiResponse<String>> {
    let _ = command_tx.send(AgentCommand::Stop);
    Json(ApiResponse::ok("Agent loop stopped".to_string()))
}

/// Status response structure
#[derive(Debug, Serialize, Clone)]
pub struct AgentStatusResponse {
    pub current_state: AgentState,
    pub is_running: bool,
    pub credit_score: Option<crate::engine::credit_scoring::CreditScoreResult>,
    pub active_loans_count: usize,
    pub active_loans: Vec<crate::engine::x402_lending::ActiveLoan>,
    pub collateral_report: Option<crate::engine::collateral_mgr::CollateralHealthReport>,
    pub iteration_count: u64,
    pub last_updated: String,
    pub error_message: Option<String>,
}
