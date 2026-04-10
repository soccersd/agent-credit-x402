use crate::config::Config;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{info, warn};
use uuid::Uuid;

/// Types of autonomous tasks an AI Agent can perform to earn income
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum TaskType {
    /// Data analysis task (e.g., market analysis, price prediction)
    DataAnalysis,
    /// Trading execution task (e.g., arbitrage, DEX trading)
    TradingExecution,
    /// Liquidity provision task (e.g., Uniswap V3 position management)
    LiquidityProvision,
    /// API service task (e.g., providing oracle data, computation)
    APIService,
    /// Cross-chain bridging task
    CrossChainBridge,
}

/// Status of an agent task
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TaskStatus {
    /// Task is pending/queued
    Pending,
    /// Task is currently being executed
    InProgress,
    /// Task completed successfully - payment received
    Completed,
    /// Task failed - no payment
    Failed,
    /// Task timed out
    TimedOut,
}

/// A task that the agent performs to earn income
/// 
/// This represents the "Earn" part of the Economy Loop:
/// Agent borrows → completes tasks → earns income → repays loan → credit increases
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    /// Unique task identifier
    pub task_id: String,
    /// Type of task
    pub task_type: TaskType,
    /// Current status
    pub status: TaskStatus,
    /// Expected reward in USDC
    pub expected_reward: f64,
    /// Actual reward received (may differ from expected)
    pub actual_reward: f64,
    /// Task created timestamp
    pub created_at: String,
    /// Task started timestamp
    pub started_at: Option<String>,
    /// Task completed timestamp
    pub completed_at: Option<String>,
    /// Task execution duration in seconds
    pub execution_duration_secs: u64,
    /// Task description/metadata
    pub description: String,
    /// Associated loan ID (if task is for loan repayment)
    pub associated_loan_id: Option<String>,
}

/// Agent's earnings wallet
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentWallet {
    /// Current balance in USDC
    pub balance_usdc: f64,
    /// Total earned lifetime
    pub total_earned: f64,
    /// Total spent on loan repayments
    pub total_spent_on_repayments: f64,
    /// Number of tasks completed
    pub tasks_completed: u64,
    /// Number of tasks failed
    pub tasks_failed: u64,
    /// Success rate (tasks_completed / total_tasks)
    pub success_rate: f64,
    /// Last earning timestamp
    pub last_earning_at: Option<String>,
}

impl Default for AgentWallet {
    fn default() -> Self {
        Self {
            balance_usdc: 0.0,
            total_earned: 0.0,
            total_spent_on_repayments: 0.0,
            tasks_completed: 0,
            tasks_failed: 0,
            success_rate: 100.0,
            last_earning_at: None,
        }
    }
}

/// Summary of agent's financial state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentEarningsSummary {
    pub wallet: AgentWallet,
    pub pending_tasks: u64,
    pub active_tasks: u64,
    pub recent_earnings: Vec<TaskSummary>,
    pub earnings_per_hour_avg: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskSummary {
    pub task_id: String,
    pub task_type: String,
    pub reward: f64,
    pub completed_at: String,
}

/// Autonomous task engine for agent income generation
/// 
/// This module implements the "Earn" part of the Economy Loop:
/// 1. Agent picks up tasks based on credit score and available capital
/// 2. Agent executes tasks autonomously (simulated or real)
/// 3. Agent receives payment for completed tasks
/// 4. Earnings are automatically used for loan repayment
/// 
/// This creates a self-sustaining economic cycle:
/// Borrow → Earn → Repay → Credit Up → Borrow More
pub struct TaskEngine {
    config: Arc<Config>,
    wallet: Arc<tokio::sync::Mutex<AgentWallet>>,
    active_tasks: Arc<tokio::sync::Mutex<Vec<AgentTask>>>,
    completed_tasks: Arc<tokio::sync::Mutex<Vec<AgentTask>>>,
}

impl TaskEngine {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            config,
            wallet: Arc::new(tokio::sync::Mutex::new(AgentWallet::default())),
            active_tasks: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            completed_tasks: Arc::new(tokio::sync::Mutex::new(Vec::new())),
        }
    }

    /// Get agent wallet balance
    pub async fn get_wallet(&self) -> AgentWallet {
        self.wallet.lock().await.clone()
    }

    /// Get earnings summary
    pub async fn get_earnings_summary(&self) -> AgentEarningsSummary {
        let wallet = self.wallet.lock().await.clone();
        let active_tasks = self.active_tasks.lock().await;
        let completed_tasks = self.completed_tasks.lock().await;

        let pending_tasks = active_tasks.iter().filter(|t| t.status == TaskStatus::Pending).count() as u64;
        let in_progress_tasks = active_tasks.iter().filter(|t| t.status == TaskStatus::InProgress).count() as u64;

        // Get recent completions (last 10)
        let recent_earnings: Vec<TaskSummary> = completed_tasks
            .iter()
            .rev()
            .take(10)
            .map(|t| TaskSummary {
                task_id: t.task_id.clone(),
                task_type: format!("{:?}", t.task_type),
                reward: t.actual_reward,
                completed_at: t.completed_at.clone().unwrap_or_default(),
            })
            .collect();

        // Calculate average earnings per hour
        let earnings_per_hour = if !completed_tasks.is_empty() {
            let total_rewards: f64 = completed_tasks.iter().map(|t| t.actual_reward).sum();
            let total_tasks = completed_tasks.len() as f64;
            let avg_duration_hours = completed_tasks
                .iter()
                .map(|t| t.execution_duration_secs as f64 / 3600.0)
                .sum::<f64>() / total_tasks;
            
            if avg_duration_hours > 0.0 {
                total_rewards / (avg_duration_hours * total_tasks) * total_tasks
            } else {
                0.0
            }
        } else {
            0.0
        };

        AgentEarningsSummary {
            wallet,
            pending_tasks,
            active_tasks: in_progress_tasks,
            recent_earnings,
            earnings_per_hour_avg: earnings_per_hour,
        }
    }

    /// Generate a new task for the agent to execute
    /// 
    /// Task type and reward are based on:
    /// - Agent's credit score (higher = better tasks)
    /// - Available capital (for collateral-dependent tasks)
    /// - Random task generation (simulates real task marketplace)
    pub fn generate_task(&self, credit_score: u32, _available_capital: f64) -> AgentTask {
        let task_type = self.select_task_type(credit_score);
        let expected_reward = self.calculate_expected_reward(&task_type, credit_score);
        
        let task_id = format!("task_{}", Uuid::new_v4().simple());
        let description = self.generate_task_description(&task_type);

        AgentTask {
            task_id,
            task_type,
            status: TaskStatus::Pending,
            expected_reward,
            actual_reward: 0.0,
            created_at: Utc::now().to_rfc3339(),
            started_at: None,
            completed_at: None,
            execution_duration_secs: 0,
            description,
            associated_loan_id: None,
        }
    }

    /// Select task type based on credit score and capabilities
    fn select_task_type(&self, credit_score: u32) -> TaskType {
        // Higher credit = access to better task types
        match credit_score {
            800..=1000 => {
                // Excellent credit: access to all task types
                let tasks = [
                    TaskType::DataAnalysis,
                    TaskType::TradingExecution,
                    TaskType::LiquidityProvision,
                    TaskType::APIService,
                    TaskType::CrossChainBridge,
                ];
                tasks[chrono::Utc::now().timestamp_subsec_nanos() as usize % tasks.len()]
            }
            600..=799 => {
                // Good credit: standard tasks
                let tasks = [
                    TaskType::DataAnalysis,
                    TaskType::TradingExecution,
                    TaskType::APIService,
                ];
                tasks[chrono::Utc::now().timestamp_subsec_nanos() as usize % tasks.len()]
            }
            _ => {
                // Lower credit: basic tasks only
                let tasks = [
                    TaskType::DataAnalysis,
                    TaskType::APIService,
                ];
                tasks[chrono::Utc::now().timestamp_subsec_nanos() as usize % tasks.len()]
            }
        }
    }

    /// Calculate expected reward based on task type and credit score
    fn calculate_expected_reward(&self, task_type: &TaskType, credit_score: u32) -> f64 {
        let base_reward = match task_type {
            TaskType::DataAnalysis => 0.5,
            TaskType::TradingExecution => 1.0,
            TaskType::LiquidityProvision => 1.5,
            TaskType::APIService => 0.3,
            TaskType::CrossChainBridge => 2.0,
        };

        // Credit score multiplier (higher credit = better rewards)
        let credit_multiplier = match credit_score {
            900..=1000 => 1.5,
            800..=899 => 1.3,
            700..=799 => 1.1,
            600..=699 => 1.0,
            500..=599 => 0.8,
            _ => 0.6,
        };

        // Add some randomness (±20%)
        let randomness = 0.8 + (chrono::Utc::now().timestamp_subsec_nanos() as f64 % 40.0) / 100.0;

        base_reward * credit_multiplier * randomness
    }

    /// Generate human-readable task description
    fn generate_task_description(&self, task_type: &TaskType) -> String {
        match task_type {
            TaskType::DataAnalysis => "Analyze market trends and generate price prediction report".to_string(),
            TaskType::TradingExecution => "Execute arbitrage trade between Uniswap and OKX DEX".to_string(),
            TaskType::LiquidityProvision => "Rebalance Uniswap V3 liquidity position for optimal yield".to_string(),
            TaskType::APIService => "Provide oracle price feed for DeFi protocol".to_string(),
            TaskType::CrossChainBridge => "Bridge USDC from Base to X Layer for yield optimization".to_string(),
        }
    }

    /// Start executing a task
    pub async fn start_task(&self, task: &mut AgentTask) {
        info!("Starting task: {} ({})", task.task_id, task.description);
        
        task.status = TaskStatus::InProgress;
        task.started_at = Some(Utc::now().to_rfc3339());

        // Add to active tasks
        let mut active = self.active_tasks.lock().await;
        active.push(task.clone());
    }

    /// Complete a task and credit earnings to wallet
    /// 
    /// This is the key function that closes the Economy Loop:
    /// 1. Mark task as completed
    /// 2. Add earnings to wallet
    /// 3. Trigger automatic loan repayment from earnings
    pub async fn complete_task(&self, task_id: &str, actual_reward: f64) -> Result<f64, anyhow::Error> {
        // Find and update the task
        let completed_task = {
            let mut active = self.active_tasks.lock().await;
            if let Some(idx) = active.iter().position(|t| t.task_id == task_id) {
                let mut task = active.remove(idx);
                task.status = TaskStatus::Completed;
                task.actual_reward = actual_reward;
                task.completed_at = Some(Utc::now().to_rfc3339());
                task.execution_duration_secs = if let Some(started) = &task.started_at {
                    let start_time = chrono::DateTime::parse_from_rfc3339(started)
                        .unwrap_or_else(|_| chrono::Utc::now().into());
                    let now_utc = chrono::Utc::now();
                    let elapsed = now_utc - start_time.with_timezone(&chrono::Utc);
                    elapsed.num_seconds().max(0) as u64
                } else {
                    30 // Default 30 seconds
                };
                Some(task)
            } else {
                None
            }
        };

        if let Some(task) = completed_task {
            // Credit earnings to wallet
            {
                let mut wallet = self.wallet.lock().await;
                wallet.balance_usdc += actual_reward;
                wallet.total_earned += actual_reward;
                wallet.tasks_completed += 1;
                wallet.last_earning_at = Some(Utc::now().to_rfc3339());
                
                // Update success rate
                let total_tasks = wallet.tasks_completed + wallet.tasks_failed;
                wallet.success_rate = if total_tasks > 0 {
                    (wallet.tasks_completed as f64 / total_tasks as f64) * 100.0
                } else {
                    100.0
                };
            }

            // Store completed task
            {
                let mut completed = self.completed_tasks.lock().await;
                completed.push(task.clone());
            }

            info!(
                "Task completed: {} - Earned {} USDC (expected: {} USDC)",
                task.task_id, actual_reward, task.expected_reward
            );

            Ok(actual_reward)
        } else {
            Err(anyhow::anyhow!("Task not found: {}", task_id))
        }
    }

    /// Mark a task as failed
    pub async fn fail_task(&self, task_id: &str) {
        let mut active = self.active_tasks.lock().await;
        if let Some(idx) = active.iter().position(|t| t.task_id == task_id) {
            let mut task = active.remove(idx);
            task.status = TaskStatus::Failed;
            task.completed_at = Some(Utc::now().to_rfc3339());

            {
                let mut wallet = self.wallet.lock().await;
                wallet.tasks_failed += 1;
                
                let total_tasks = wallet.tasks_completed + wallet.tasks_failed;
                wallet.success_rate = if total_tasks > 0 {
                    (wallet.tasks_completed as f64 / total_tasks as f64) * 100.0
                } else {
                    100.0
                };
            }

            {
                let mut completed = self.completed_tasks.lock().await;
                completed.push(task);
            }

            warn!("Task failed: {}", task_id);
        }
    }

    /// Spend from wallet balance (used for loan repayments)
    pub async fn spend(&self, amount: f64) -> Result<(), anyhow::Error> {
        let mut wallet = self.wallet.lock().await;
        
        if wallet.balance_usdc < amount {
            return Err(anyhow::anyhow!(
                "Insufficient balance: {} < {}",
                wallet.balance_usdc,
                amount
            ));
        }

        wallet.balance_usdc -= amount;
        wallet.total_spent_on_repayments += amount;

        info!("Wallet spent: {} USDC (remaining: {} USDC)", amount, wallet.balance_usdc);
        Ok(())
    }

    /// Auto-repay loans from wallet earnings
    /// 
    /// This function:
    /// 1. Checks if there are active loans
    /// 2. Uses available balance to repay loans
    /// 3. Prioritizes loans closest to liquidation
    pub async fn auto_repay_from_earnings(
        &self,
        active_loans: &mut Vec<crate::engine::x402_lending::ActiveLoan>,
    ) -> Result<f64, anyhow::Error> {
        let wallet_balance = {
            let wallet = self.wallet.lock().await;
            wallet.balance_usdc
        };

        if wallet_balance < 0.01 {
            return Ok(0.0); // Nothing to repay
        }

        // Find loans that need repayment (sorted by urgency)
        let mut total_repaid = 0.0;

        for loan in active_loans.iter_mut() {
            if loan.status != crate::engine::x402_lending::LoanStatus::Active 
                && loan.status != crate::engine::x402_lending::LoanStatus::Repaying 
            {
                continue;
            }

            let available = {
                let wallet = self.wallet.lock().await;
                wallet.balance_usdc
            };

            if available < 0.01 {
                break; // No more funds
            }

            let repay_amount = available.min(loan.outstanding);
            
            // Spend from wallet
            self.spend(repay_amount).await?;

            // Update loan
            loan.repaid_amount += repay_amount;
            loan.outstanding -= repay_amount;

            if loan.outstanding <= 0.001 {
                loan.status = crate::engine::x402_lending::LoanStatus::Completed;
                loan.outstanding = 0.0;
                info!(
                    "Loan {} fully repaid from task earnings!",
                    loan.loan_id
                );
            } else {
                loan.status = crate::engine::x402_lending::LoanStatus::Repaying;
            }

            total_repaid += repay_amount;

            info!(
                "Auto-repaid {} USDC from earnings (loan: {}, remaining: {} USDC)",
                repay_amount, loan.loan_id, loan.outstanding
            );
        }

        Ok(total_repaid)
    }

    /// Get pending tasks that need execution
    pub async fn get_pending_tasks(&self) -> Vec<AgentTask> {
        let active = self.active_tasks.lock().await;
        active.iter()
            .filter(|t| t.status == TaskStatus::Pending)
            .cloned()
            .collect()
    }

    /// Get all active tasks
    pub async fn get_all_active_tasks(&self) -> Vec<AgentTask> {
        self.active_tasks.lock().await.clone()
    }

    /// Get task completion statistics
    pub async fn get_task_stats(&self) -> serde_json::Value {
        let wallet = self.wallet.lock().await;
        
        serde_json::json!({
            "total_earned": wallet.total_earned,
            "total_spent_on_repayments": wallet.total_spent_on_repayments,
            "current_balance": wallet.balance_usdc,
            "tasks_completed": wallet.tasks_completed,
            "tasks_failed": wallet.tasks_failed,
            "success_rate": wallet.success_rate,
            "last_earning_at": wallet.last_earning_at,
        })
    }
}
