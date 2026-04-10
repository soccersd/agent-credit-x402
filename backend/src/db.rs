use chrono::Utc;
use sqlx::{sqlite::SqlitePoolOptions, FromRow, SqlitePool};
use std::path::Path;
use tracing::info;
use uuid::Uuid;

/// Database connection wrapper
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Initialize database connection and run migrations
    pub async fn new(database_url: &str) -> Result<Self, anyhow::Error> {
        info!("Connecting to SQLite database: {}", database_url);

        // If using file-based SQLite, ensure the file and directory exist
        if database_url.starts_with("sqlite:") {
            let file_path = database_url.trim_start_matches("sqlite:");
            let path = Path::new(file_path);

            // Create parent directory if needed
            if let Some(dir) = path.parent() {
                if !dir.exists() {
                    info!("Creating database directory: {}", dir.display());
                    std::fs::create_dir_all(dir)?;
                }
            }

            // Create empty database file if it doesn't exist
            if !path.exists() {
                info!("Creating database file: {}", path.display());
                std::fs::File::create(path)?;
            }
        }

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await?;

        let db = Self { pool };
        db.run_migrations().await?;

        info!("Database initialized successfully");
        Ok(db)
    }

    /// Get connection pool
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Run database migrations to create tables
    async fn run_migrations(&self) -> Result<(), anyhow::Error> {
        info!("Running database migrations...");

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS loans (
                loan_id TEXT PRIMARY KEY,
                wallet_address TEXT NOT NULL,
                principal REAL NOT NULL,
                outstanding REAL NOT NULL,
                interest_rate REAL NOT NULL,
                collateral_amount REAL NOT NULL,
                collateral_token TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                due_at TEXT NOT NULL,
                repaid_amount REAL NOT NULL DEFAULT 0.0,
                stream_rate_per_sec REAL NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS agent_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                current_state TEXT NOT NULL,
                is_running BOOLEAN NOT NULL DEFAULT FALSE,
                credit_score_json TEXT,
                collateral_report_json TEXT,
                iteration_count INTEGER NOT NULL DEFAULT 0,
                error_message TEXT,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS agent_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                event_data_json TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create indexes for faster queries
        sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status)"#)
            .execute(&self.pool)
            .await?;

        sqlx::query(r#"CREATE INDEX IF NOT EXISTS idx_events_type ON agent_events(event_type)"#)
            .execute(&self.pool)
            .await?;

        sqlx::query(
            r#"CREATE INDEX IF NOT EXISTS idx_events_timestamp ON agent_events(timestamp)"#,
        )
        .execute(&self.pool)
        .await?;

        info!("Database migrations completed");
        Ok(())
    }

    // === LOAN OPERATIONS ===

    /// Save or update a loan (upsert)
    pub async fn save_loan(&self, loan: &LoanRecord) -> Result<(), anyhow::Error> {
        sqlx::query(
            r#"
            INSERT INTO loans (
                loan_id, wallet_address, principal, outstanding, interest_rate,
                collateral_amount, collateral_token, status, created_at, due_at,
                repaid_amount, stream_rate_per_sec, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(loan_id) DO UPDATE SET
                outstanding = excluded.outstanding,
                status = excluded.status,
                repaid_amount = excluded.repaid_amount,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&loan.loan_id)
        .bind(&loan.wallet_address)
        .bind(loan.principal)
        .bind(loan.outstanding)
        .bind(loan.interest_rate)
        .bind(loan.collateral_amount)
        .bind(&loan.collateral_token)
        .bind(&loan.status)
        .bind(&loan.created_at)
        .bind(&loan.due_at)
        .bind(loan.repaid_amount)
        .bind(loan.stream_rate_per_sec)
        .bind(&loan.updated_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Load all active loans
    pub async fn load_active_loans(&self) -> Result<Vec<LoanRecord>, anyhow::Error> {
        let loans = sqlx::query_as::<_, LoanRecord>(
            r#"SELECT * FROM loans WHERE status IN ('Active', 'Repaying', 'Pending')"#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(loans)
    }

    /// Load a specific loan by ID
    pub async fn load_loan(&self, loan_id: &str) -> Result<Option<LoanRecord>, anyhow::Error> {
        let loan = sqlx::query_as::<_, LoanRecord>(r#"SELECT * FROM loans WHERE loan_id = ?"#)
            .bind(loan_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(loan)
    }

    /// Update loan status
    pub async fn update_loan_status(
        &self,
        loan_id: &str,
        status: &str,
        outstanding: Option<f64>,
        repaid_amount: Option<f64>,
    ) -> Result<(), anyhow::Error> {
        let outstanding = outstanding.unwrap_or(-1.0);
        let repaid_amount = repaid_amount.unwrap_or(-1.0);

        sqlx::query(
            r#"
            UPDATE loans SET
                status = ?,
                outstanding = CASE WHEN ? >= 0 THEN ? ELSE outstanding END,
                repaid_amount = CASE WHEN ? >= 0 THEN ? ELSE repaid_amount END,
                updated_at = ?
            WHERE loan_id = ?
            "#,
        )
        .bind(status)
        .bind(outstanding)
        .bind(outstanding)
        .bind(repaid_amount)
        .bind(repaid_amount)
        .bind(Utc::now().to_rfc3339())
        .bind(loan_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // === AGENT STATE OPERATIONS ===

    /// Save agent state (upsert for single row with id=1)
    pub async fn save_agent_state(&self, state: &AgentStateRecord) -> Result<(), anyhow::Error> {
        sqlx::query(
            r#"
            INSERT INTO agent_state (
                id, current_state, is_running, credit_score_json,
                collateral_report_json, iteration_count, error_message, updated_at
            )
            VALUES (1, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                current_state = excluded.current_state,
                is_running = excluded.is_running,
                credit_score_json = excluded.credit_score_json,
                collateral_report_json = excluded.collateral_report_json,
                iteration_count = excluded.iteration_count,
                error_message = excluded.error_message,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&state.current_state)
        .bind(state.is_running)
        .bind(&state.credit_score_json)
        .bind(&state.collateral_report_json)
        .bind(state.iteration_count)
        .bind(&state.error_message)
        .bind(&state.updated_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Load agent state
    pub async fn load_agent_state(&self) -> Result<Option<AgentStateRecord>, anyhow::Error> {
        let state =
            sqlx::query_as::<_, AgentStateRecord>(r#"SELECT * FROM agent_state WHERE id = 1"#)
                .fetch_optional(&self.pool)
                .await?;

        Ok(state)
    }

    // === EVENT OPERATIONS ===

    /// Record an agent event
    pub async fn record_event(
        &self,
        event_type: &str,
        event_data_json: &str,
        timestamp: &str,
    ) -> Result<(), anyhow::Error> {
        sqlx::query(
            r#"
            INSERT INTO agent_events (event_type, event_data_json, timestamp)
            VALUES (?, ?, ?)
            "#,
        )
        .bind(event_type)
        .bind(event_data_json)
        .bind(timestamp)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get recent events (for replay on WebSocket connect)
    pub async fn get_recent_events(&self, limit: usize) -> Result<Vec<EventRecord>, anyhow::Error> {
        let events = sqlx::query_as::<_, EventRecord>(
            r#"SELECT * FROM agent_events ORDER BY timestamp DESC LIMIT ?"#,
        )
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(events)
    }
}

/// Loan record structure matching ActiveLoan
#[derive(Debug, Clone, FromRow)]
pub struct LoanRecord {
    pub loan_id: String,
    pub wallet_address: String,
    pub principal: f64,
    pub outstanding: f64,
    pub interest_rate: f64,
    pub collateral_amount: f64,
    pub collateral_token: String,
    pub status: String,
    pub created_at: String,
    pub due_at: String,
    pub repaid_amount: f64,
    pub stream_rate_per_sec: f64,
    pub updated_at: String,
}

impl Default for LoanRecord {
    fn default() -> Self {
        Self {
            loan_id: Uuid::new_v4().to_string(),
            wallet_address: String::new(),
            principal: 0.0,
            outstanding: 0.0,
            interest_rate: 0.0,
            collateral_amount: 0.0,
            collateral_token: String::new(),
            status: "Pending".to_string(),
            created_at: Utc::now().to_rfc3339(),
            due_at: Utc::now().to_rfc3339(),
            repaid_amount: 0.0,
            stream_rate_per_sec: 0.0,
            updated_at: Utc::now().to_rfc3339(),
        }
    }
}

/// Agent state record
#[derive(Debug, Clone, FromRow)]
pub struct AgentStateRecord {
    pub id: i64,
    pub current_state: String,
    pub is_running: bool,
    pub credit_score_json: Option<String>,
    pub collateral_report_json: Option<String>,
    pub iteration_count: i64,
    pub error_message: Option<String>,
    pub updated_at: String,
}

impl Default for AgentStateRecord {
    fn default() -> Self {
        Self {
            id: 1,
            current_state: "Idle".to_string(),
            is_running: false,
            credit_score_json: None,
            collateral_report_json: None,
            iteration_count: 0,
            error_message: None,
            updated_at: Utc::now().to_rfc3339(),
        }
    }
}

/// Event record
#[derive(Debug, Clone, FromRow)]
pub struct EventRecord {
    pub id: i64,
    pub event_type: String,
    pub event_data_json: String,
    pub timestamp: String,
    pub created_at: String,
}
