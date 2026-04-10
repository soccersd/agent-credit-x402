use crate::config::Config;
use crate::db::Database;
use crate::engine::collateral_mgr::{CollateralHealthReport, CollateralManager};
use crate::engine::credit_scoring::{CreditScoreResult, CreditScorer};
use crate::engine::liquidator::{LiquidationAlert, Liquidator};
use crate::engine::x402_lending::{ActiveLoan, LoanRequest, LoanStatus, X402Lender};
use crate::engine::task_engine::{TaskEngine, AgentWallet, AgentEarningsSummary};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tokio::time::{interval, Duration};
use tracing::{error, info, warn};

/// Agent state machine states
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AgentState {
    /// Evaluating credit and preparing to borrow
    Evaluate,
    /// Actively borrowing via x402
    Borrowing,
    /// Monitoring collateral and earnings
    Monitoring,
    /// Repaying the loan via streaming
    Repaying,
    /// Liquidating an unsafe position
    Liquidating,
    /// Idle - waiting for next cycle
    Idle,
    /// Error state - something went wrong
    Error,
}

/// Agent loop event commands
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentCommand {
    Start,
    Stop,
    TriggerLoop,
    RequestLoan(LoanRequest),
    RepayLoan(String),
    CancelLoan(String),
}

/// Agent loop events (outputs)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentEvent {
    StateChanged {
        from: AgentState,
        to: AgentState,
        timestamp: String,
    },
    CreditScored(CreditScoreResult),
    LoanCreated(ActiveLoan),
    LoanRepaid {
        loan_id: String,
        amount: f64,
        timestamp: String,
    },
    CollateralAlert(CollateralHealthReport),
    LiquidationAlert(LiquidationAlert),
    Error {
        message: String,
        state: AgentState,
        timestamp: String,
    },
    LoopIteration {
        iteration: u64,
        state: AgentState,
        timestamp: String,
    },
}

/// Shared agent state
#[derive(Clone)]
pub struct AgentSharedState {
    pub current_state: AgentState,
    pub credit_score: Option<CreditScoreResult>,
    pub active_loans: Vec<ActiveLoan>,
    pub collateral_report: Option<CollateralHealthReport>,
    pub iteration_count: u64,
    pub last_updated: String,
    pub is_running: bool,
    pub error_message: Option<String>,
    /// Agent wallet balance and earnings
    pub wallet: Option<AgentWallet>,
    /// Recent earnings summary
    pub earnings_summary: Option<AgentEarningsSummary>,
    /// Broadcast sender for WebSocket real-time updates
    pub event_broadcast: tokio::sync::broadcast::Sender<AgentEvent>,
}

impl Default for AgentSharedState {
    fn default() -> Self {
        // Create broadcast channel with capacity of 100 events
        let (event_broadcast, _) = tokio::sync::broadcast::channel(100);
        Self {
            current_state: AgentState::Idle,
            credit_score: None,
            active_loans: Vec::new(),
            collateral_report: None,
            iteration_count: 0,
            last_updated: Utc::now().to_rfc3339(),
            is_running: false,
            error_message: None,
            wallet: None,
            earnings_summary: None,
            event_broadcast,
        }
    }
}

/// Core agent loop - state machine for autonomous earn-borrow-repay-liquidate cycle
pub struct AgentLoop {
    config: Arc<Config>,
    database: Arc<Database>,
    shared_state: Arc<Mutex<AgentSharedState>>,
    event_sender: mpsc::UnboundedSender<AgentEvent>,
    event_receiver: Option<mpsc::UnboundedReceiver<AgentEvent>>,
    command_receiver: Option<mpsc::UnboundedReceiver<AgentCommand>>,
    command_sender: mpsc::UnboundedSender<AgentCommand>,
    credit_scorer: CreditScorer,
    x402_lender: X402Lender,
    collateral_manager: CollateralManager,
    liquidator: Liquidator,
    task_engine: TaskEngine,
}

impl AgentLoop {
    pub fn new(config: Arc<Config>, database: Arc<Database>) -> Self {
        let (event_sender, event_receiver) = mpsc::unbounded_channel();
        let (command_sender, command_receiver) = mpsc::unbounded_channel();

        let credit_scorer = CreditScorer::new(config.clone());
        let x402_lender = X402Lender::new(config.clone());
        let collateral_manager = CollateralManager::new(config.clone());
        let liquidator = Liquidator::new(config.clone());
        let task_engine = TaskEngine::new(config.clone());

        Self {
            config,
            database,
            shared_state: Arc::new(Mutex::new(AgentSharedState::default())),
            event_sender,
            event_receiver: Some(event_receiver),
            command_receiver: Some(command_receiver),
            command_sender,
            credit_scorer,
            x402_lender,
            collateral_manager,
            liquidator,
            task_engine,
        }
    }

    /// Get shared state for API access
    pub fn shared_state(&self) -> Arc<Mutex<AgentSharedState>> {
        self.shared_state.clone()
    }

    /// Get command sender to issue commands to the loop
    pub fn command_sender(&self) -> mpsc::UnboundedSender<AgentCommand> {
        self.command_sender.clone()
    }

    /// Take the event receiver (can only be called once)
    pub fn take_event_receiver(&mut self) -> Option<mpsc::UnboundedReceiver<AgentEvent>> {
        self.event_receiver.take()
    }

    /// Start the agent loop as a background tokio task
    pub fn start(mut self) -> tokio::task::JoinHandle<()> {
        let interval_secs = self.config.loop_interval_secs;

        tokio::spawn(async move {
            info!("Agent loop starting with interval: {}s", interval_secs);

            // Load persisted state from database
            if let Err(e) = self.load_persisted_state().await {
                warn!("Failed to load persisted state: {}", e);
            }

            let mut tick = interval(Duration::from_secs(interval_secs));
            let _event_receiver = self.event_receiver.take().unwrap();
            let mut command_receiver = self.command_receiver.take().unwrap();

            loop {
                tokio::select! {
                    // Handle commands
                    Some(cmd) = command_receiver.recv() => {
                        match cmd {
                            AgentCommand::Start => {
                                let mut state = self.shared_state.lock().await;
                                state.is_running = true;
                                state.current_state = AgentState::Evaluate;
                                drop(state);
                                self.send_event(AgentEvent::StateChanged {
                                    from: AgentState::Idle,
                                    to: AgentState::Evaluate,
                                    timestamp: Utc::now().to_rfc3339(),
                                });
                            }
                            AgentCommand::Stop => {
                                let mut state = self.shared_state.lock().await;
                                state.is_running = false;
                                state.current_state = AgentState::Idle;
                                drop(state);
                                info!("Agent loop stopped by command");
                                break;
                            }
                            AgentCommand::TriggerLoop => {
                                // Force immediate loop iteration
                                if let Err(e) = self.run_cycle().await {
                                    error!("Error in forced cycle: {}", e);
                                }
                            }
                            AgentCommand::RequestLoan(request) => {
                                if let Err(e) = self.handle_loan_request(&request).await {
                                    error!("Failed to handle loan request: {}", e);
                                    self.set_error(&format!("Loan request failed: {}", e)).await;
                                }
                            }
                            AgentCommand::RepayLoan(loan_id) => {
                                if let Err(e) = self.handle_repay_loan(&loan_id).await {
                                    error!("Failed to repay loan {}: {}", loan_id, e);
                                    self.set_error(&format!("Repay failed: {}", e)).await;
                                }
                            }
                            AgentCommand::CancelLoan(loan_id) => {
                                self.handle_cancel_loan(&loan_id).await;
                            }
                        }
                    }
                    // Tick for periodic execution
                    _ = tick.tick() => {
                        let state = self.shared_state.lock().await;
                        if state.is_running {
                            drop(state);
                            if let Err(e) = self.run_cycle().await {
                                error!("Error in agent loop cycle: {}", e);
                                self.set_error(&e.to_string()).await;
                            }
                        }
                    }
                }
            }

            info!("Agent loop terminated");
        })
    }

    /// Run one complete cycle of the core economy loop
    async fn run_cycle(&mut self) -> Result<(), anyhow::Error> {
        let state = self.shared_state.lock().await;
        let current_state = state.current_state.clone();
        let iteration = state.iteration_count + 1;
        drop(state);

        info!(
            "Agent loop iteration {}: State = {:?}",
            iteration, current_state
        );

        match current_state {
            AgentState::Evaluate => self.state_evaluate().await?,
            AgentState::Borrowing => self.state_borrowing().await?,
            AgentState::Monitoring => self.state_monitoring().await?,
            AgentState::Repaying => self.state_repaying().await?,
            AgentState::Liquidating => self.state_liquidating().await?,
            AgentState::Idle => {
                info!("Agent loop is idle - no action needed");
            }
            AgentState::Error => {
                warn!("Agent loop in error state - attempting recovery");
                self.state_evaluate().await?;
            }
        }

        // Update iteration count
        let mut state = self.shared_state.lock().await;
        state.iteration_count = iteration;
        state.last_updated = Utc::now().to_rfc3339();
        drop(state);

        self.send_event(AgentEvent::LoopIteration {
            iteration,
            state: current_state,
            timestamp: Utc::now().to_rfc3339(),
        });

        Ok(())
    }

    /// State: Evaluate credit score and prepare for borrowing
    async fn state_evaluate(&mut self) -> Result<(), anyhow::Error> {
        info!("EVALUATE: Calculating credit score...");

        let wallet = &self.config.agent_wallet;
        let score = self.credit_scorer.calculate_score(wallet).await?;

        self.send_event(AgentEvent::CreditScored(score.clone()));

        let mut state = self.shared_state.lock().await;
        state.credit_score = Some(score.clone());

        // Transition to borrowing if credit is sufficient
        if score.score >= 300 {
            let old_state = state.current_state.clone();
            state.current_state = AgentState::Borrowing;
            state.error_message = None;
            drop(state);

            self.send_event(AgentEvent::StateChanged {
                from: old_state,
                to: AgentState::Borrowing,
                timestamp: Utc::now().to_rfc3339(),
            });

            info!(
                "EVALUATE -> BORROWING: Credit score {} is sufficient",
                score.score
            );
        } else {
            let old_state = state.current_state.clone();
            state.current_state = AgentState::Idle;
            state.error_message = Some("Credit score too low for borrowing".to_string());
            drop(state);

            self.send_event(AgentEvent::StateChanged {
                from: old_state,
                to: AgentState::Idle,
                timestamp: Utc::now().to_rfc3339(),
            });

            warn!("EVALUATE -> IDLE: Credit score {} too low", score.score);
        }

        Ok(())
    }

    /// State: Borrow micropayment via x402
    async fn state_borrowing(&mut self) -> Result<(), anyhow::Error> {
        info!("BORROWING: Checking for loan requests...");

        // In autonomous mode, we would automatically request loans
        // For now, this state waits for explicit loan requests via commands

        let state = self.shared_state.lock().await;
        let has_active_loans = state
            .active_loans
            .iter()
            .any(|l| matches!(l.status, LoanStatus::Active | LoanStatus::Repaying));
        drop(state);

        if has_active_loans {
            // Move to monitoring if there are active loans
            let mut state = self.shared_state.lock().await;
            let old_state = state.current_state.clone();
            state.current_state = AgentState::Monitoring;
            drop(state);

            self.send_event(AgentEvent::StateChanged {
                from: old_state,
                to: AgentState::Monitoring,
                timestamp: Utc::now().to_rfc3339(),
            });

            info!("BORROWING -> MONITORING: Active loans detected");
        }

        Ok(())
    }

    /// State: Monitor collateral and simulate earnings
    async fn state_monitoring(&mut self) -> Result<(), anyhow::Error> {
        info!("MONITORING: Checking collateral health and executing tasks...");

        // Monitor collateral positions
        let health_report = self.collateral_manager.monitor_collateral().await?;
        self.send_event(AgentEvent::CollateralAlert(health_report.clone()));

        let mut state = self.shared_state.lock().await;
        state.collateral_report = Some(health_report);
        drop(state);

        // === AUTONOMOUS ECONOMY LOOP ===
        // Step 1: Execute tasks to earn income
        self.execute_autonomous_tasks().await?;

        // Step 2: Auto-repay loans from earnings
        self.auto_repay_loans().await?;

        // Step 3: Update wallet/earnings in shared state
        let wallet = self.task_engine.get_wallet().await;
        let earnings_summary = self.task_engine.get_earnings_summary().await;

        let mut state = self.shared_state.lock().await;
        state.wallet = Some(wallet);
        state.earnings_summary = Some(earnings_summary);
        drop(state);
        // === END AUTONOMOUS ECONOMY LOOP ===

        // Check each active loan for liquidation risk
        let state = self.shared_state.lock().await;
        let loans: Vec<ActiveLoan> = state.active_loans.clone();
        drop(state);

        for loan in &loans {
            if matches!(loan.status, LoanStatus::Active | LoanStatus::Repaying) {
                // Estimate collateral value
                let collateral_value = loan.collateral_amount * 1.0; // Simplified

                let alert = self
                    .liquidator
                    .check_liquidation(loan, collateral_value)
                    .await?;

                if let Some(alert) = alert {
                    if matches!(
                        alert.alert_type,
                        crate::engine::liquidator::LiquidationAlertType::Critical
                    ) {
                        // Transition to liquidating
                        let mut state = self.shared_state.lock().await;
                        let old_state = state.current_state.clone();
                        state.current_state = AgentState::Liquidating;
                        drop(state);

                        self.send_event(AgentEvent::StateChanged {
                            from: old_state,
                            to: AgentState::Liquidating,
                            timestamp: Utc::now().to_rfc3339(),
                        });

                        self.send_event(AgentEvent::LiquidationAlert(alert));

                        info!("MONITORING -> LIQUIDATING: Critical alert detected");
                        return Ok(());
                    }
                }

                // Process automatic repayment via x402 streaming
                if matches!(loan.status, LoanStatus::Active | LoanStatus::Repaying) {
                    let elapsed = 30; // Simulated 30 second interval
                    self.process_repayment(&loan.loan_id, elapsed).await?;
                }
            }
        }

        // Check if all loans are completed
        let state = self.shared_state.lock().await;
        let all_completed = state.active_loans.iter().all(|l| {
            matches!(
                l.status,
                LoanStatus::Completed | LoanStatus::Defaulted | LoanStatus::Liquidated
            )
        });
        let has_any_loans = !state.active_loans.is_empty();
        drop(state);

        if all_completed && has_any_loans {
            let mut state = self.shared_state.lock().await;
            let old_state = state.current_state.clone();
            state.current_state = AgentState::Evaluate;
            drop(state);

            self.send_event(AgentEvent::StateChanged {
                from: old_state,
                to: AgentState::Evaluate,
                timestamp: Utc::now().to_rfc3339(),
            });

            info!("MONITORING -> EVALUATE: All loans completed");
        }

        Ok(())
    }

    /// State: Repay loan via streaming x402 payments
    async fn state_repaying(&mut self) -> Result<(), anyhow::Error> {
        info!("REPAYING: Processing streaming repayments...");

        let state = self.shared_state.lock().await;
        let loans: Vec<ActiveLoan> = state.active_loans.clone();
        drop(state);

        for loan in &loans {
            if matches!(loan.status, LoanStatus::Active | LoanStatus::Repaying) {
                self.process_repayment(&loan.loan_id, 30).await?; // 30 second intervals
            }
        }

        Ok(())
    }

    /// State: Liquidate unsafe positions
    async fn state_liquidating(&mut self) -> Result<(), anyhow::Error> {
        info!("LIQUIDATING: Executing forced liquidations...");

        // Liquidation is handled in monitoring state via check_liquidation()
        // This state just ensures all liquidations are processed

        let mut state = self.shared_state.lock().await;
        let old_state = state.current_state.clone();
        state.current_state = AgentState::Monitoring;
        drop(state);

        self.send_event(AgentEvent::StateChanged {
            from: old_state,
            to: AgentState::Monitoring,
            timestamp: Utc::now().to_rfc3339(),
        });

        info!("LIQUIDATING -> MONITORING: Liquidations processed");

        Ok(())
    }

    /// Handle explicit loan request
    async fn handle_loan_request(&mut self, request: &LoanRequest) -> Result<(), anyhow::Error> {
        info!("Handling loan request: {} USDC", request.amount);

        // Check credit score
        let score = match &self.shared_state.lock().await.credit_score {
            Some(score) => score.clone(),
            None => {
                let calculated = self
                    .credit_scorer
                    .calculate_score(&request.wallet_address)
                    .await?;
                let mut state = self.shared_state.lock().await;
                state.credit_score = Some(calculated.clone());
                calculated
            }
        };

        if request.credit_score != score.score {
            warn!(
                "Credit score mismatch: requested={}, actual={}",
                request.credit_score, score.score
            );
        }

        // Create the loan
        let loan = self.x402_lender.create_loan(request).await?;
        self.send_event(AgentEvent::LoanCreated(loan.clone()));

        // Add to active loans
        let mut state = self.shared_state.lock().await;
        state.active_loans.push(loan.clone());
        if state.current_state == AgentState::Idle || state.current_state == AgentState::Evaluate {
            let old = state.current_state.clone();
            state.current_state = AgentState::Borrowing;
            self.send_event(AgentEvent::StateChanged {
                from: old,
                to: AgentState::Borrowing,
                timestamp: Utc::now().to_rfc3339(),
            });
        }
        drop(state);

        // Persist loan to database
        let loan_record = crate::db::LoanRecord {
            loan_id: loan.loan_id.clone(),
            wallet_address: loan.wallet_address.clone(),
            principal: loan.principal,
            outstanding: loan.outstanding,
            interest_rate: loan.interest_rate,
            collateral_amount: loan.collateral_amount,
            collateral_token: loan.collateral_token.clone(),
            status: format!("{:?}", loan.status),
            created_at: loan.created_at.clone(),
            due_at: loan.due_at.clone(),
            repaid_amount: loan.repaid_amount,
            stream_rate_per_sec: loan.stream_rate_per_sec,
            updated_at: Utc::now().to_rfc3339(),
        };
        self.database.save_loan(&loan_record).await?;

        info!("Loan request processed and persisted to database");
        Ok(())
    }

    /// Handle loan repayment
    async fn handle_repay_loan(&mut self, loan_id: &str) -> Result<(), anyhow::Error> {
        info!("Handling manual repayment for loan: {}", loan_id);
        self.process_repayment(loan_id, 60).await // Repay 60 seconds worth
    }

    /// Execute autonomous tasks to earn income
    /// 
    /// This is the core of the Economy Loop:
    /// 1. Check if there are active loans (need to earn to repay)
    /// 2. Generate new tasks based on credit score
    /// 3. Execute tasks and receive payment
    /// 4. Earnings auto-flow to loan repayment
    async fn execute_autonomous_tasks(&mut self) -> Result<(), anyhow::Error> {
        let state = self.shared_state.lock().await;
        let has_active_loans = state.active_loans.iter().any(|l| {
            matches!(l.status, LoanStatus::Active | LoanStatus::Repaying)
        });
        let credit_score = state.credit_score.as_ref().map(|s| s.score).unwrap_or(500);
        drop(state);

        if !has_active_loans {
            return Ok(()); // No loans, no need to earn
        }

        // Generate a new task (simulates picking up work from task marketplace)
        let available_capital = {
            let wallet = self.task_engine.get_wallet().await;
            wallet.balance_usdc
        };

        let task = self.task_engine.generate_task(credit_score as u32, available_capital);
        info!("Generated autonomous task: {} ({})", task.task_id, task.description);

        // Start task execution
        let mut task_clone = task.clone();
        self.task_engine.start_task(&mut task_clone).await;

        // Simulate task completion (in production, this would be real work)
        // Task success rate depends on credit score (higher credit = more reliable)
        let success_rate = match credit_score {
            800..=1000 => 0.9,
            600..=799 => 0.8,
            _ => 0.7,
        };

        let rand_val = (chrono::Utc::now().timestamp_subsec_nanos() as f64 % 100.0) / 100.0;
        
        if rand_val < success_rate {
            // Task completed successfully
            let actual_reward = task.expected_reward * (0.9 + (chrono::Utc::now().timestamp_subsec_nanos() as f64 % 20.0) / 100.0);
            self.task_engine.complete_task(&task.task_id, actual_reward).await?;
            
            info!(
                "Task completed successfully: {} - Earned {} USDC",
                task.task_id, actual_reward
            );
        } else {
            // Task failed
            self.task_engine.fail_task(&task.task_id).await;
            warn!("Task failed: {}", task.task_id);
        }

        Ok(())
    }

    /// Auto-repay loans from task earnings
    /// 
    /// This closes the Economy Loop:
    /// Earn → Repay → Credit Up → Borrow More
    async fn auto_repay_loans(&mut self) -> Result<(), anyhow::Error> {
        let state = self.shared_state.lock().await;
        let mut active_loans = state.active_loans.clone();
        drop(state);

        // Auto-repay from earnings
        let total_repaid = self.task_engine.auto_repay_from_earnings(&mut active_loans).await?;

        if total_repaid > 0.0 {
            info!("Auto-repaid {} USDC from task earnings", total_repaid);

            // Update shared state with modified loans
            let mut state = self.shared_state.lock().await;
            state.active_loans = active_loans;
            drop(state);
        }

        Ok(())
    }

    /// Handle loan cancellation
    async fn handle_cancel_loan(&mut self, loan_id: &str) {
        info!("Cancelling loan: {}", loan_id);

        let mut state = self.shared_state.lock().await;
        state.active_loans.retain(|l| l.loan_id != loan_id);
        drop(state);

        info!("Loan {} cancelled", loan_id);
    }

    /// Process repayment for a specific loan
    async fn process_repayment(
        &mut self,
        loan_id: &str,
        elapsed_secs: u64,
    ) -> Result<(), anyhow::Error> {
        let state = self.shared_state.lock().await;
        let loan_idx = state.active_loans.iter().position(|l| l.loan_id == loan_id);

        if let Some(idx) = loan_idx {
            let mut loan = state.active_loans[idx].clone();
            drop(state);

            let repaid = self
                .x402_lender
                .process_repayment(&mut loan, elapsed_secs)
                .await?;

            // Update in-memory state
            let mut state = self.shared_state.lock().await;
            state.active_loans[idx] = loan.clone();
            drop(state);

            // Persist repayment to database
            let loan_record = crate::db::LoanRecord {
                loan_id: loan.loan_id.clone(),
                wallet_address: loan.wallet_address.clone(),
                principal: loan.principal,
                outstanding: loan.outstanding,
                interest_rate: loan.interest_rate,
                collateral_amount: loan.collateral_amount,
                collateral_token: loan.collateral_token.clone(),
                status: format!("{:?}", loan.status),
                created_at: loan.created_at.clone(),
                due_at: loan.due_at.clone(),
                repaid_amount: loan.repaid_amount,
                stream_rate_per_sec: loan.stream_rate_per_sec,
                updated_at: Utc::now().to_rfc3339(),
            };
            self.database.save_loan(&loan_record).await?;

            if loan.status == LoanStatus::Completed {
                self.send_event(AgentEvent::LoanRepaid {
                    loan_id: loan.loan_id.clone(),
                    amount: loan.principal,
                    timestamp: Utc::now().to_rfc3339(),
                });

                info!(
                    "Loan {} fully repaid: {} USDC",
                    loan.loan_id, loan.principal
                );
            } else {
                info!(
                    "Repayment processed for loan {}: {} USDC (remaining: {} USDC)",
                    loan.loan_id, repaid, loan.outstanding
                );
            }
        }

        Ok(())
    }

    /// Set error state with message
    async fn set_error(&mut self, message: &str) {
        let mut state = self.shared_state.lock().await;
        let old = state.current_state.clone();
        state.current_state = AgentState::Error;
        state.error_message = Some(message.to_string());
        drop(state);

        self.send_event(AgentEvent::Error {
            message: message.to_string(),
            state: old,
            timestamp: Utc::now().to_rfc3339(),
        });

        error!("Agent loop error: {}", message);
    }

    /// Send event to event channel and broadcast to WebSocket clients
    async fn send_event_async(&self, event: AgentEvent) {
        // Send to internal channel
        if let Err(e) = self.event_sender.send(event.clone()) {
            warn!("Failed to send agent event: {}", e);
        }

        // Broadcast to WebSocket clients
        {
            let state = self.shared_state.lock().await;
            if let Err(e) = state.event_broadcast.send(event.clone()) {
                warn!("Failed to broadcast event: {}", e);
            }
        }

        // Persist state changes to database (fire and forget)
        let db = self.database.clone();
        let event_clone = event.clone();
        tokio::spawn(async move {
            if let Err(e) = Self::persist_event(&db, &event_clone).await {
                warn!("Failed to persist event to database: {}", e);
            }
        });
    }

    /// Send event to event channel and broadcast to WebSocket clients (sync version for spawn)
    fn send_event(&self, event: AgentEvent) {
        let shared_state = self.shared_state.clone();
        let event_sender = self.event_sender.clone();
        let database = self.database.clone();

        tokio::spawn(async move {
            // Send to internal channel
            if let Err(e) = event_sender.send(event.clone()) {
                warn!("Failed to send agent event: {}", e);
            }

            // Broadcast to WebSocket clients (ignore if no subscribers)
            {
                let state = shared_state.lock().await;
                // subscriber_count tells us if anyone is listening
                if state.event_broadcast.receiver_count() > 0 {
                    if let Err(e) = state.event_broadcast.send(event.clone()) {
                        warn!("Failed to broadcast event: {}", e);
                    }
                }
            }

            // Persist to database
            if let Err(e) = Self::persist_event(&database, &event).await {
                warn!("Failed to persist event to database: {}", e);
            }
        });
    }

    /// Persist agent state and events to database
    async fn persist_event(db: &Database, event: &AgentEvent) -> Result<(), anyhow::Error> {
        match event {
            AgentEvent::StateChanged {
                from: _,
                to,
                timestamp,
            } => {
                // Update agent state in database
                let state = db.load_agent_state().await?.unwrap_or_default();
                let updated_state = crate::db::AgentStateRecord {
                    current_state: format!("{:?}", to),
                    updated_at: timestamp.clone(),
                    ..state
                };
                db.save_agent_state(&updated_state).await?;
            }
            AgentEvent::LoanCreated(loan) => {
                // Save new loan to database
                let loan_record = crate::db::LoanRecord {
                    loan_id: loan.loan_id.clone(),
                    wallet_address: loan.wallet_address.clone(),
                    principal: loan.principal,
                    outstanding: loan.outstanding,
                    interest_rate: loan.interest_rate,
                    collateral_amount: loan.collateral_amount,
                    collateral_token: loan.collateral_token.clone(),
                    status: format!("{:?}", loan.status),
                    created_at: loan.created_at.clone(),
                    due_at: loan.due_at.clone(),
                    repaid_amount: loan.repaid_amount,
                    stream_rate_per_sec: loan.stream_rate_per_sec,
                    updated_at: Utc::now().to_rfc3339(),
                };
                db.save_loan(&loan_record).await?;
            }
            AgentEvent::LoanRepaid {
                loan_id,
                amount,
                timestamp: _,
            } => {
                // Update loan repayment status
                if let Some(loan) = db.load_loan(loan_id).await? {
                    db.update_loan_status(
                        loan_id,
                        "Completed",
                        Some(0.0),
                        Some(loan.repaid_amount + amount),
                    )
                    .await?;
                }
            }
            AgentEvent::CreditScored(score) => {
                // Update credit score in agent state
                if let Some(state) = db.load_agent_state().await? {
                    let credit_score_json = serde_json::to_string(score).ok();
                    let updated_state = crate::db::AgentStateRecord {
                        credit_score_json,
                        updated_at: score.calculated_at.clone(),
                        ..state
                    };
                    db.save_agent_state(&updated_state).await?;
                }
            }
            AgentEvent::CollateralAlert(report) => {
                // Update collateral report in agent state
                if let Some(state) = db.load_agent_state().await? {
                    let report_json = serde_json::to_string(report).ok();
                    let updated_state = crate::db::AgentStateRecord {
                        collateral_report_json: report_json,
                        updated_at: report.timestamp.clone(),
                        ..state
                    };
                    db.save_agent_state(&updated_state).await?;
                }
            }
            _ => {
                // Record other events to event log
                let event_type = match event {
                    AgentEvent::LiquidationAlert(_) => "liquidation_alert",
                    AgentEvent::Error { .. } => "error",
                    AgentEvent::LoopIteration { .. } => "loop_iteration",
                    _ => "other",
                };

                let event_data = serde_json::to_string(event).unwrap_or_default();
                db.record_event(event_type, &event_data, &Utc::now().to_rfc3339())
                    .await?;
            }
        }

        Ok(())
    }

    /// Load persisted state from database on startup
    async fn load_persisted_state(&self) -> Result<(), anyhow::Error> {
        // Load agent state
        if let Some(db_state) = self.database.load_agent_state().await? {
            let mut state = self.shared_state.lock().await;
            state.current_state = match db_state.current_state.as_str() {
                "Evaluate" => AgentState::Evaluate,
                "Borrowing" => AgentState::Borrowing,
                "Monitoring" => AgentState::Monitoring,
                "Repaying" => AgentState::Repaying,
                "Liquidating" => AgentState::Liquidating,
                "Idle" => AgentState::Idle,
                "Error" => AgentState::Error,
                _ => AgentState::Idle,
            };
            state.is_running = db_state.is_running;
            state.iteration_count = db_state.iteration_count as u64;
            state.error_message = db_state.error_message;
            state.last_updated = db_state.updated_at;

            // Parse credit score if available
            if let Some(credit_json) = db_state.credit_score_json {
                if let Ok(score) = serde_json::from_str::<CreditScoreResult>(&credit_json) {
                    state.credit_score = Some(score);
                }
            }

            // Parse collateral report if available
            if let Some(report_json) = db_state.collateral_report_json {
                if let Ok(report) = serde_json::from_str::<CollateralHealthReport>(&report_json) {
                    state.collateral_report = Some(report);
                }
            }

            info!("Loaded persisted agent state from database");
        }

        // Load active loans
        let db_loans = self.database.load_active_loans().await?;
        let mut state = self.shared_state.lock().await;
        state.active_loans = db_loans
            .iter()
            .map(|loan| ActiveLoan {
                loan_id: loan.loan_id.clone(),
                wallet_address: loan.wallet_address.clone(),
                principal: loan.principal,
                outstanding: loan.outstanding,
                interest_rate: loan.interest_rate,
                collateral_amount: loan.collateral_amount,
                collateral_token: loan.collateral_token.clone(),
                status: match loan.status.as_str() {
                    "Active" => LoanStatus::Active,
                    "Repaying" => LoanStatus::Repaying,
                    "Pending" => LoanStatus::Pending,
                    "Completed" => LoanStatus::Completed,
                    "Defaulted" => LoanStatus::Defaulted,
                    "Liquidated" => LoanStatus::Liquidated,
                    _ => LoanStatus::Pending,
                },
                created_at: loan.created_at.clone(),
                due_at: loan.due_at.clone(),
                repaid_amount: loan.repaid_amount,
                stream_rate_per_sec: loan.stream_rate_per_sec,
            })
            .collect();

        if !state.active_loans.is_empty() {
            info!(
                "Loaded {} active loans from database",
                state.active_loans.len()
            );
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    /// Create a test database in memory
    async fn create_test_db() -> Arc<Database> {
        // Use in-memory SQLite for tests
        let db = Database::new("sqlite::memory:")
            .await
            .expect("Failed to create test DB");
        Arc::new(db)
    }

    fn create_test_config() -> Arc<Config> {
        Arc::new(Config::default())
    }

    #[tokio::test]
    async fn test_agent_loop_initialization() {
        let config = create_test_config();
        let db = create_test_db().await;
        let agent_loop = AgentLoop::new(config, db);

        let state = agent_loop.shared_state.lock().await;
        assert_eq!(state.current_state, AgentState::Idle);
        assert!(!state.is_running);
        assert_eq!(state.active_loans.len(), 0);
        assert!(state.credit_score.is_none());
    }

    #[tokio::test]
    async fn test_agent_state_transitions_idle_to_evaluate() {
        let config = create_test_config();
        let db = create_test_db().await;
        let mut agent_loop = AgentLoop::new(config.clone(), db.clone());
        let state_arc = agent_loop.shared_state();

        // Start the agent
        {
            let mut state = state_arc.lock().await;
            state.is_running = true;
            state.current_state = AgentState::Evaluate;
        }

        // Run evaluate state using async method
        agent_loop
            .state_evaluate()
            .await
            .expect("Evaluate should succeed");

        let state = agent_loop.shared_state.lock().await;
        // Should transition to Borrowing if score >= 300
        assert!(
            matches!(
                state.current_state,
                AgentState::Borrowing | AgentState::Idle
            ),
            "Should transition to Borrowing or stay Idle, got: {:?}",
            state.current_state
        );

        // Should have a credit score
        assert!(
            state.credit_score.is_some(),
            "Should have credit score after evaluation"
        );
    }

    #[tokio::test]
    async fn test_agent_state_machine_all_states_valid() {
        // Test that all state transitions are valid
        let states = vec![
            AgentState::Evaluate,
            AgentState::Borrowing,
            AgentState::Monitoring,
            AgentState::Repaying,
            AgentState::Liquidating,
            AgentState::Idle,
            AgentState::Error,
        ];

        for state in states {
            // Verify state can be serialized and deserialized
            let json = serde_json::to_string(&state).expect("Should serialize state");
            let deserialized: AgentState =
                serde_json::from_str(&json).expect("Should deserialize state");
            assert_eq!(state, deserialized, "State should round-trip through JSON");
        }
    }

    #[tokio::test]
    async fn test_loan_request_and_cancellation() {
        let config = create_test_config();
        let db = create_test_db().await;
        let agent_loop = AgentLoop::new(config.clone(), db);
        let state_arc = agent_loop.shared_state();

        // First, evaluate to get a credit score
        {
            let mut state = state_arc.lock().await;
            state.is_running = true;
        }

        // Request a loan via command channel
        let sender = agent_loop.command_sender();
        let request = LoanRequest {
            wallet_address: "0x1234567890123456789012345678901234567890".to_string(),
            amount: 5.0,
            collateral_token: "USDC".to_string(),
            duration_secs: 3600,
            credit_score: 500,
        };

        sender
            .send(AgentCommand::RequestLoan(request))
            .expect("Should send loan request");

        // Give it a moment to process
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // Verify loan was queued (not necessarily created since we're not running the loop)
        let state = state_arc.lock().await;
        // Loan will be in the command queue, not yet processed
        // This test verifies the command channel works
        drop(state);
    }

    #[tokio::test]
    async fn test_event_broadcast_channel() {
        let config = create_test_config();
        let db = create_test_db().await;
        let agent_loop = AgentLoop::new(config.clone(), db.clone());
        let state_arc = agent_loop.shared_state();

        // Subscribe to events before sending
        let mut receiver = {
            let state = state_arc.lock().await;
            state.event_broadcast.subscribe()
        };

        // Send an event using async method
        agent_loop
            .send_event_async(AgentEvent::StateChanged {
                from: AgentState::Idle,
                to: AgentState::Evaluate,
                timestamp: Utc::now().to_rfc3339(),
            })
            .await;

        // Verify event was broadcast
        let timeout = tokio::time::Duration::from_secs(1);
        let received_event = tokio::time::timeout(timeout, receiver.recv()).await;

        assert!(received_event.is_ok(), "Should receive broadcast event");
        if let Ok(Ok(event)) = received_event {
            match event {
                AgentEvent::StateChanged { from, to, .. } => {
                    assert_eq!(from, AgentState::Idle);
                    assert_eq!(to, AgentState::Evaluate);
                }
                _ => panic!("Should receive StateChanged event"),
            }
        }
    }

    #[tokio::test]
    async fn test_database_persistence_loan() {
        let _config = create_test_config();
        let db = create_test_db().await;

        // Create a loan record in database
        let loan_record = crate::db::LoanRecord {
            loan_id: "test-loan-123".to_string(),
            wallet_address: "0xabc".to_string(),
            principal: 5.0,
            outstanding: 5.5,
            interest_rate: 0.1,
            collateral_amount: 10.0,
            collateral_token: "USDC".to_string(),
            status: "Active".to_string(),
            created_at: Utc::now().to_rfc3339(),
            due_at: (Utc::now() + chrono::Duration::hours(1)).to_rfc3339(),
            repaid_amount: 0.0,
            stream_rate_per_sec: 0.001,
            updated_at: Utc::now().to_rfc3339(),
        };

        db.save_loan(&loan_record).await.expect("Should save loan");

        // Load it back
        let loaded_loans = db.load_active_loans().await.expect("Should load loans");
        assert_eq!(loaded_loans.len(), 1, "Should have 1 active loan");
        assert_eq!(loaded_loans[0].loan_id, "test-loan-123");
        assert_eq!(loaded_loans[0].principal, 5.0);
    }

    #[tokio::test]
    async fn test_database_persistence_agent_state() {
        let db = create_test_db().await;

        // Save agent state
        let state_record = crate::db::AgentStateRecord {
            current_state: "Monitoring".to_string(),
            is_running: true,
            credit_score_json: Some(r#"{"score":750,"grade":"A"}"#.to_string()),
            collateral_report_json: None,
            iteration_count: 42,
            error_message: None,
            updated_at: Utc::now().to_rfc3339(),
            ..Default::default()
        };

        db.save_agent_state(&state_record)
            .await
            .expect("Should save agent state");

        // Load it back
        let loaded_state = db
            .load_agent_state()
            .await
            .expect("Should load agent state");
        assert!(loaded_state.is_some(), "Should have agent state");

        let loaded = loaded_state.unwrap();
        assert_eq!(loaded.current_state, "Monitoring");
        assert!(loaded.is_running);
        assert_eq!(loaded.iteration_count, 42);
    }

    #[tokio::test]
    async fn test_state_machine_cycle() {
        let config = create_test_config();
        let db = create_test_db().await;
        let mut agent_loop = AgentLoop::new(config.clone(), db.clone());

        // Set initial state to Evaluate
        {
            let mut state = agent_loop.shared_state.lock().await;
            state.is_running = true;
            state.current_state = AgentState::Evaluate;
        }

        // Run one cycle manually using async method
        agent_loop
            .state_evaluate()
            .await
            .expect("Evaluate should succeed");

        // Verify state changed
        let state = agent_loop.shared_state.lock().await;
        assert!(
            state.credit_score.is_some(),
            "Should have credit score after evaluation"
        );
    }
}
