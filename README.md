# AgentCredit x402 Lending Hub

> **The Financial Infrastructure Layer for Autonomous AI Agents**
>
> **Build X Season 2 — X Layer Arena Hackathon**
>
> While Season 1 gave AI agents their **Identity**, Season 2 gives them **Capital**.
>
> AgentCredit is the first **autonomous micro-lending engine** that enables AI agents to:
> **Borrow → Work → Earn → Repay → Build Credit** — completely autonomously via **x402 Protocol**.

---

## 🎯 Project Intro

Season 1 projects like soulinX solved **"Who is this AI agent?"** by creating on-chain identities.

But identity alone doesn't make an agent **autonomous**. Agents need **capital** to:
- Pay for API calls and compute resources
- Execute trades and provide liquidity
- Hire other agents for tasks
- Build reputation through financial behavior

**AgentCredit solves: "How does this AI agent get funding and work independently?"**

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTONOMOUS ECONOMY LOOP                    │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │ Evaluate │───▶│ Borrow   │───▶│  Work    │               │
│  │ Credit   │    │ via x402 │    │  & Earn  │               │
│  └──────────┘    └──────────┘    └──────────┘               │
│       ▲                                  │                   │
│       │                                  ▼                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │ Credit   │◀───│  Repay   │◀───│ Monitor  │               │
│  │ Up       │    │ via x402 │    │ & Alert  │               │
│  └──────────┘    └──────────┘    └──────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

- **x402 Streaming Repayment** — Continuous payment streams instead of lump sums
- **Autonomous Task Engine** — Agent executes tasks to earn income autonomously
- **Reputation-based Credit Scoring** — Integrates with soulinX identity system
- **Credit Score History Chart** — Interactive SVG visualization of score trends over time
- **Transaction History** — Complete log of all system events with real-time updates
- **Real-time WebSocket Updates** — Live agent status, earnings, and loan monitoring
- **Dark/Light Mode** — Toggle between themes for comfortable viewing
- **Rust Backend Performance** — Sub-second decisions with memory safety

---

## 🚀 Quick Start

### Prerequisites
- Rust (latest stable)
- Node.js 18+ and npm

### 1. Backend (Rust)

```bash
cd backend
cp .env.example .env  # Edit with your credentials if desired
touch agent_credit.db  # Create database file (first time only)
cargo run             # Starts on port 3302
```

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev           # Starts on port 3000
```

### 3. Test It

1. Open `http://localhost:3000`
2. Click **Launch Dashboard** on the landing page
3. Click **Start** to begin the autonomous agent loop
4. Watch real-time updates in the dashboard!

> **Note:** The backend uses mock data by default. To use real OKX API credentials, edit `.env`

---

## 🤖 Agentic Wallet & Agent Roles

### Agentic Wallet (Onchain Identity)

This project uses an Agentic Wallet as its **onchain identity** on X Layer:

| Property | Value |
|----------|-------|
| **Wallet Address** | `0x21263042d143CD60833E292b735B66Eca5605B28` |
| **Network** | X Layer Mainnet (Chain ID: 196) |
| **Purpose** | Agent's onchain identity for borrowing, earning, and repaying via x402 |

### Agent Roles

This project deploys **one autonomous agent** — the **Credit Agent**:

| Agent | Role | Responsibilities |
|-------|------|------------------|
| **Credit Agent** | Micro-lending & Earning Engine | • Calculate credit scores (on-chain + reputation)<br>• Create loans via x402 payment mandates<br>• Execute autonomous earning tasks<br>• Auto-repay loans from earnings<br>• Monitor collateral health<br>• Liquidate unsafe positions |

---

## 📚 Onchain OS & Uniswap Skill Usage

| # | Skill | Module | Purpose |
|---|-------|--------|---------|
| 1 | **okx-x402-payment** | `x402_lending.rs` | x402 mandate creation, TEE signing, streaming |
| 2 | **okx-onchain-gateway** | `credit_scoring.rs` | Wallet analytics, transaction history |
| 3 | **okx-dex-market** | `collateral_mgr.rs` | Real-time token prices, market depth |
| 4 | **swap-integration** | `collateral_mgr.rs` | Uniswap swaps for collateral rebalancing |
| 5 | **liquidity-planner** | `collateral_mgr.rs` | Slippage protection, depth checks |

---

## ⚙️ Working Mechanics

### How x402 Micropayment Works

```
1. LOAN CREATION
   Agent requests loan → Creates x402 payment mandate
   └─> Mandate specifies: rate/sec, total amount, duration
   └─> Sign via TEE (Trusted Execution Environment)
   └─> Register with x402 facilitator on X Layer

2. STREAMING REPAYMENT
   Agent works → Earns USDC → Stream repays loan
   └─> Every tick: rate_per_sec × elapsed_secs = repayment
   └─> Deducted from agent's earnings wallet
   └─> Mandate balance decreases in real-time

3. LOAN COMPLETION
   When outstanding ≤ 0:
   └─> Loan marked as Completed
   └─> Mandate deactivated
   └─> Agent's credit score increases
   └─> Agent can borrow more next cycle
```

### How Other Agents Can Integrate

AgentCredit is designed as an **infrastructure layer**. Other AI agents can:

1. **REST API** — Call `POST /api/loans` to borrow, `POST /api/loans/:id/repay` to repay
2. **WebSocket** — Subscribe to `/api/ws/events` for real-time updates
3. **Self-Host** — Deploy your own instance with a unique wallet address

---

## 🌐 Deployment Address

| Component | Environment | Address |
|-----------|-------------|---------|
| Backend (Rust) | Local Development | `http://localhost:3302` |
| Frontend (Next.js) | Local Development | `http://localhost:3000` |
| Agentic Wallet | X Layer Mainnet | `0x21263042d143CD60833E292b735B66Eca5605B28` |
| Blockchain Network | X Layer | Chain ID: `196` |
| X Layer RPC | Production | `https://rpc.xlayer.tech` |

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Rust (tokio, axum, alloy, sqlx) |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Blockchain | X Layer Mainnet (Chain ID: 196) |
| Protocol | x402 v0.2.1 (Payment Mandates) |
| Real-Time | WebSocket (axum + native WS) |
| Database | SQLite (sqlx) |
| UI Features | SVG Charts, Animations, Dark Mode |

---

## 👥 Team Members

| Name | Role | Contact |
|------|------|---------|
| soccer | Full-Stack Developer (Rust, TypeScript, Next.js) | [@soccer](https://x.com/) |

*Solo developer project for Build X Season 2 - X Layer Arena Hackathon*

---

## 📝 Positioning in X Layer Ecosystem

**AgentCredit x402 is the first financial infrastructure that transforms AI agent identities into autonomous economic actors.**

While Season 1 established **who agents are** (identity/reputation), Season 2's challenge is **what agents can do** (autonomous economy). AgentCredit bridges this gap by providing:

1. **x402 Micropayment Engine** — Streaming repayment creates continuous cash flow, enabling agents to borrow small amounts and repay automatically as they earn.

2. **Autonomous Task Execution** — Agents don't just borrow; they work. The task engine simulates real agent activities (trading, data analysis, liquidity provision) that generate income for repayment.

3. **Reputation-to-Credit Pipeline** — Building on Season 1's identity systems (soulinX), we transform reputation into tangible financial benefits: lower rates, higher limits, less collateral.

This creates a self-sustaining cycle: **Identity → Reputation → Credit → Work → Repay → Better Credit**. Agents become truly autonomous economic actors on X Layer.

---

**Built for Build X Season 2 - X Layer Arena Hackathon** 🚀

**From Identity to Economy. From Name to Capital. From Agent to Autonomous Actor.**
