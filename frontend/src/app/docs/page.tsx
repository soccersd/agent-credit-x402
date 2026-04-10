"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Search,
  Menu,
  X,
  Home,
  BookOpen,
  Server,
  Code,
  Settings,
  Shield,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

const navItems = [
  {
    title: "Getting Started",
    items: [
      { id: "introduction", label: "Introduction", icon: <Home className="w-4 h-4" /> },
      { id: "quick-start", label: "Quick Start", icon: <BookOpen className="w-4 h-4" /> },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { id: "architecture", label: "Architecture", icon: <Server className="w-4 h-4" /> },
      { id: "economy-loop", label: "Economy Loop", icon: <Server className="w-4 h-4" /> },
      { id: "x402-protocol", label: "x402 Protocol", icon: <Shield className="w-4 h-4" /> },
    ],
  },
  {
    title: "API Reference",
    items: [
      { id: "rest-api", label: "REST API", icon: <Code className="w-4 h-4" /> },
      { id: "websocket", label: "WebSocket", icon: <Code className="w-4 h-4" /> },
    ],
  },
  {
    title: "Configuration",
    items: [
      { id: "setup", label: "Setup Guide", icon: <Settings className="w-4 h-4" /> },
      { id: "wallet", label: "Wallet & Security", icon: <Shield className="w-4 h-4" /> },
    ],
  },
];

export default function DocsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("introduction");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) setActiveSection(hash);
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e5e5]">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between h-12 px-4 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1 hover:bg-white/5 rounded"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              onClick={() => router.push("/landing")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="font-bold text-lg text-white">AgentCredit x402</span>
              <span className="hidden sm:inline text-xs text-gray-500">Docs</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm text-gray-400 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search docs</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 bg-white/5 rounded text-xs border border-white/10">/</kbd>
            </button>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-start justify-center pt-24 px-4" onClick={() => setSearchOpen(false)}>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Type to search..."
                className="flex-1 outline-none text-white bg-transparent"
                autoFocus
              />
              <button onClick={() => setSearchOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 text-gray-500 text-sm">
              Start typing to search documentation...
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-12 left-0 bottom-0 z-40 w-72 bg-[#0a0a0a] border-r border-white/10 overflow-y-auto transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <nav className="p-4 space-y-4">
          {navItems.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                {group.title}
              </h3>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setActiveSection(item.id);
                        setSidebarOpen(false);
                        window.location.hash = item.id;
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${activeSection === item.id
                          ? "bg-[#ff2a2a]/10 text-[#ff2a2a] font-medium"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                        }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => router.push("/landing")}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-md w-full transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Landing
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 pt-12 min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-10">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6">
            <button onClick={() => router.push("/landing")} className="hover:text-white transition-colors">
              Home
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-300 font-medium">Docs</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#ff2a2a]">
              {navItems.flatMap((g) => g.items).find((i) => i.id === activeSection)?.label || activeSection}
            </span>
          </nav>

          {/* Content */}
          <div className="prose prose-invert max-w-none">
            {activeSection === "introduction" && <IntroductionSection />}
            {activeSection === "quick-start" && <QuickStartSection />}
            {activeSection === "architecture" && <ArchitectureSection />}
            {activeSection === "economy-loop" && <EconomyLoopSection />}
            {activeSection === "x402-protocol" && <X402ProtocolSection />}
            {activeSection === "rest-api" && <RestApiSection />}
            {activeSection === "websocket" && <WebSocketSection />}
            {activeSection === "setup" && <SetupSection />}
            {activeSection === "wallet" && <WalletSection />}
          </div>

          {/* Page Nav */}
          <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={() => router.push("/landing")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">
                <span className="text-gray-600 block text-xs">Previous</span>
                Landing Page
              </span>
            </button>
            <button
              onClick={() => {
                const items = navItems.flatMap((g) => g.items);
                const currentIndex = items.findIndex((i) => i.id === activeSection);
                if (currentIndex < items.length - 1) {
                  const next = items[currentIndex + 1];
                  setActiveSection(next.id);
                  window.location.hash = next.id;
                }
              }}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group text-right"
            >
              <span className="text-sm">
                <span className="text-gray-600 block text-xs">Next</span>
                {(() => {
                  const items = navItems.flatMap((g) => g.items);
                  const currentIndex = items.findIndex((i) => i.id === activeSection);
                  return currentIndex < items.length - 1 ? items[currentIndex + 1].label : "Landing Page";
                })()}
              </span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// Section Components
function IntroductionSection() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-4">Introduction</h1>
      <p className="text-lg text-gray-400 mb-8 leading-relaxed">
        AgentCredit x402 is an autonomous micro-lending engine for AI agents on X Layer. It enables AI agents to{" "}
        <strong className="text-white">Borrow → Work → Earn → Repay → Build Credit</strong> — completely
        autonomously via x402 Protocol.
      </p>

      <div className="bg-[#ff2a2a]/5 border-l-2 border-[#ff2a2a] p-4 mb-8 rounded-r">
        <p className="text-[#ff2a2a] text-sm font-medium">
          Build X Season 2 — X Layer Arena Hackathon
        </p>
        <p className="text-gray-400 text-sm mt-1">
          While Season 1 gave AI agents their Identity, Season 2 gives them Capital.
        </p>
      </div>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Key Features</h2>
      <ul className="space-y-3 mb-8">
        {[
          "x402 Streaming Repayment — Continuous payment streams, not lump sums",
          "Autonomous Task Engine — Agent executes tasks to earn income autonomously",
          "Reputation-based Credit Scoring — Integrates with soulinX identity system",
          "Credit Score History Chart — Visual chart showing score trends over time",
          "Transaction History — Complete log of all system events and operations",
          "Real-time WebSocket Updates — Live agent status, earnings, loan updates",
          "Dark/Light Mode — Toggle between themes for comfortable viewing",
          "Rust Backend Performance — Sub-second decisions, memory safe",
        ].map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-2 w-1.5 h-1.5 bg-[#ff2a2a] rounded-full flex-shrink-0" />
            <span className="text-gray-400">{feature}</span>
          </li>
        ))}
      </ul>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Tech Stack</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0a0a0a]">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300 border border-white/10">
                Component
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300 border border-white/10">
                Technology
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Backend", "Rust (tokio, axum, alloy, sqlx)"],
              ["Frontend", "Next.js 15, TypeScript, Tailwind CSS"],
              ["Blockchain", "X Layer Mainnet (Chain ID: 196)"],
              ["Protocol", "x402 v0.2.1 (Payment Mandates)"],
              ["Real-Time", "WebSocket (axum + native WS)"],
              ["Database", "SQLite (sqlx)"],
              ["UI Features", "SVG Charts, Animations, Dark Mode"],
            ].map(([comp, tech], i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 text-sm text-white border border-white/10 font-medium">{comp}</td>
                <td className="py-3 px-4 text-sm text-gray-400 border border-white/10">{tech}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuickStartSection() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-4">Quick Start</h1>
      <p className="text-lg text-gray-400 mb-8 leading-relaxed">
        Get AgentCredit x402 running in under 5 minutes.
      </p>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">1. Backend (Rust)</h2>
      <CodeBlock id="qs-backend">{`cd backend
cp .env.example .env  # Edit with your credentials if desired
touch agent_credit.db  # Create database file (first time only)
cargo run             # Starts on port 3302`}</CodeBlock>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">2. Frontend (Next.js)</h2>
      <CodeBlock id="qs-frontend">{`cd frontend
npm install
npm run dev           # Starts on port 3000`}</CodeBlock>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">3. Test It</h2>
      <ol className="space-y-3 mb-8 list-decimal list-inside text-gray-400">
        <li>Open <code className="bg-white/5 px-1.5 py-0.5 rounded text-sm text-[#ff2a2a]">http://localhost:3000</code></li>
        <li>Click <strong className="text-white">Launch Dashboard</strong> on the landing page</li>
        <li>Click <strong className="text-white">Start</strong> to begin the autonomous agent loop</li>
        <li>Watch real-time updates in the dashboard!</li>
      </ol>

      <div className="bg-yellow-500/5 border-l-2 border-yellow-500 p-4 rounded-r">
        <p className="text-yellow-500 text-sm">
          <strong>Note:</strong> The backend uses mock data by default. To use real OKX API credentials, edit <code className="bg-yellow-500/10 px-1 rounded">.env</code>
        </p>
      </div>
    </div>
  );
}

function ArchitectureSection() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-4">Architecture</h1>
      <p className="text-lg text-gray-400 mb-8 leading-relaxed">
        AgentCredit x402 is built with a modular architecture designed for autonomous agent operations.
      </p>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Core Components</h2>
      <div className="space-y-4 mb-8">
        {[
          { name: "Agent Loop", file: "agent_loop.rs", desc: "State machine orchestrating the autonomous earn-borrow-repay cycle" },
          { name: "Credit Scorer", file: "credit_scoring.rs", desc: "Multi-factor credit scoring with on-chain data + reputation" },
          { name: "x402 Lender", file: "x402_lending.rs", desc: "x402 payment mandate creation, TEE signing, streaming repayment" },
          { name: "Task Engine", file: "task_engine.rs", desc: "Autonomous task generation and earnings tracking" },
          { name: "Collateral Manager", file: "collateral_mgr.rs", desc: "Real-time collateral monitoring and rebalancing" },
          { name: "Liquidator", file: "liquidator.rs", desc: "Liquidation detection and forced position closure" },
          { name: "Reputation Engine", file: "reputation_engine.rs", desc: "Integration with soulinX, ENS, and other identity systems" },
        ].map((comp, i) => (
          <div key={i} className="border border-white/10 rounded-lg p-4 hover:border-[#ff2a2a]/50 transition-colors bg-[#0a0a0a]/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white">{comp.name}</span>
              <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded text-gray-500">{comp.file}</code>
            </div>
            <p className="text-gray-400 text-sm mt-1">{comp.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Frontend Components</h2>
      <div className="space-y-4 mb-8">
        {[
          { name: "Credit Score Chart", file: "CreditScoreChart.tsx", desc: "Interactive SVG line chart showing credit score history with tooltips and trend indicators" },
          { name: "Transaction History", file: "TransactionHistory.tsx", desc: "Scrollable list of all system events with status badges and timestamps" },
          { name: "Loan Manager", file: "LoanManager.tsx", desc: "Form-based UI for creating and managing loans with validation" },
          { name: "Theme Toggle", file: "ThemeToggle.tsx", desc: "Dark/Light mode switcher with smooth transitions" },
          { name: "Animated Counter", file: "AnimatedCounter.tsx", desc: "Animated number transitions for statistics display" },
        ].map((comp, i) => (
          <div key={i} className="border border-white/10 rounded-lg p-4 hover:border-[#ff2a2a]/50 transition-colors bg-[#0a0a0a]/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white">{comp.name}</span>
              <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded text-gray-500">{comp.file}</code>
            </div>
            <p className="text-gray-400 text-sm mt-1">{comp.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EconomyLoopSection() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-4">Economy Loop</h1>
      <p className="text-lg text-gray-400 mb-8 leading-relaxed">
        The autonomous economy loop is the core mechanism that enables agents to operate independently.
      </p>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Loop Diagram</h2>
      <CodeBlock id="economy-diagram">{`┌─────────────────────────────────────────────────────────────┐
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
└─────────────────────────────────────────────────────────────┘`}</CodeBlock>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Step-by-Step</h2>
      <div className="space-y-6 mb-8">
        {[
          { step: "1", title: "Evaluate Credit", desc: "Agent's credit score is calculated using on-chain activity + reputation from identity systems (soulinX, ENS)." },
          { step: "2", title: "Borrow via x402", desc: "Agent creates an x402 payment mandate with specified rate/sec, total amount, and duration. Mandate is signed via TEE and registered on X Layer." },
          { step: "3", title: "Work & Earn", desc: "Agent autonomously executes tasks (trading, analysis, liquidity provision) to earn USDC." },
          { step: "4", title: "Monitor & Alert", desc: "Collateral health is continuously monitored. Alerts triggered if health ratio drops below threshold." },
          { step: "5", title: "Repay via x402", desc: "Earnings automatically stream to loan repayment. No human intervention needed." },
          { step: "6", title: "Credit Up", desc: "Successful repayment increases credit score. Agent can borrow more with better terms next cycle." },
        ].map((item) => (
          <div key={item.step} className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#ff2a2a]/20 border border-[#ff2a2a]/50 text-[#ff2a2a] flex items-center justify-center font-bold">
              {item.step}
            </div>
            <div>
              <h3 className="font-semibold text-white">{item.title}</h3>
              <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function X402ProtocolSection() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-4">x402 Protocol</h1>
      <p className="text-lg text-gray-400 mb-8 leading-relaxed">
        x402 is a micropayment protocol that enables continuous payment streams instead of lump-sum transfers.
      </p>

      <div className="bg-[#ff2a2a]/5 border-l-2 border-[#ff2a2a] p-4 mb-8 rounded-r">
        <p className="text-[#ff2a2a] text-sm font-medium">Key Concept</p>
        <p className="text-gray-400 text-sm mt-1">
          x402 does NOT deploy new contracts — it creates payment mandates on existing USDC contracts.
          Reference: <a href="https://github.com/coinbase/x402" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#ff2a2a] transition-colors">github.com/coinbase/x402</a>
        </p>
      </div>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">How It Works</h2>
      <ol className="space-y-4 mb-8 list-decimal list-inside text-gray-400">
        <li><strong className="text-white">Create Mandate</strong> — Specify rate/sec, total amount, duration</li>
        <li><strong className="text-white">TEE Signing</strong> — Mandate is signed in Trusted Execution Environment</li>
        <li><strong className="text-white">Register on X Layer</strong> — Facilitator registers mandate on-chain</li>
        <li><strong className="text-white">Stream Repayment</strong> — Every tick: <code className="bg-white/5 px-1 rounded text-sm text-[#ff2a2a]">rate_per_sec × elapsed_secs = repayment</code></li>
        <li><strong className="text-white">Completion</strong> — When outstanding ≤ 0, loan marked as Completed</li>
      </ol>
    </div>
  );
}

function RestApiSection() {
  const endpoints = [
    { method: "GET", path: "/api/health", desc: "Health check" },
    { method: "GET", path: "/api/status", desc: "Current agent status" },
    { method: "GET", path: "/api/loans", desc: "All active loans" },
    { method: "POST", path: "/api/loans", desc: "Create new loan" },
    { method: "POST", path: "/api/loans/:id/repay", desc: "Repay loan" },
    { method: "POST", path: "/api/loans/:id/cancel", desc: "Cancel loan" },
    { method: "POST", path: "/api/start", desc: "Start agent loop" },
    { method: "POST", path: "/api/stop", desc: "Stop agent loop" },
    { method: "POST", path: "/api/trigger_loop", desc: "Force one iteration" },
  ];

  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-4">REST API</h1>
      <p className="text-lg text-gray-400 mb-8 leading-relaxed">
        Base URL: <code className="bg-white/5 px-2 py-0.5 rounded text-[#ff2a2a]">http://localhost:3302</code>
      </p>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Endpoints</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0a0a0a]">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300 border border-white/10">Method</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300 border border-white/10">Path</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300 border border-white/10">Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 border border-white/10">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${ep.method === "GET" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                      }`}
                  >
                    {ep.method}
                  </span>
                </td>
                <td className="py-3 px-4 border border-white/10">
                  <code className="text-sm text-[#ff2a2a] font-mono">{ep.path}</code>
                </td>
                <td className="py-3 px-4 border border-white/10 text-sm text-gray-400">{ep.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Example: Create Loan</h2>
      <CodeBlock id="api-create-loan">{`curl -X POST http://localhost:3302/api/loans \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5.0,
    "collateral_token": "USDC",
    "duration_secs": 86400
  }'`}</CodeBlock>
    </div>
  );
}

function WebSocketSection() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-4">WebSocket</h1>
      <p className="text-lg text-gray-400 mb-8 leading-relaxed">
        Real-time event streaming for live updates from the agent loop.
      </p>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Connection</h2>
      <CodeBlock id="ws-url">{`ws://localhost:3302/api/ws/events`}</CodeBlock>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Events</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {["initial_state", "state_changed", "credit_scored", "loan_created", "loan_repaid", "collateral_alert", "liquidation_alert", "loop_iteration", "error"].map((event) => (
          <div key={event} className="bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2 hover:border-[#ff2a2a]/50 transition-colors">
            <code className="text-sm text-[#ff2a2a] font-mono">{event}</code>
          </div>
        ))}
      </div>

      <div className="bg-[#ff2a2a]/5 border-l-2 border-[#ff2a2a] p-4 rounded-r">
        <p className="text-[#ff2a2a] text-sm font-medium">Tip</p>
        <p className="text-gray-400 text-sm mt-1">
          Connect via browser: <code className="bg-white/5 px-1 rounded text-[#ff2a2a]">const ws = new WebSocket('ws://localhost:3302/api/ws/events')</code>
        </p>
      </div>
    </div>
  );
}

function SetupSection() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-4">Setup Guide</h1>
      <p className="text-lg text-gray-400 mb-8 leading-relaxed">
        Step-by-step guide to deploy AgentCredit x402.
      </p>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Environment Variables</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0a0a0a]">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300 border border-white/10">Variable</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300 border border-white/10">Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["OKX_API_KEY", "OKX API Key (optional, uses mock if not set)"],
              ["X_LAYER_RPC", "X Layer RPC URL (default: https://rpc.xlayer.tech)"],
              ["AGENT_WALLET", "Agent's wallet address on X Layer"],
              ["BACKEND_PORT", "Backend server port (default: 3302)"],
              ["DATABASE_URL", "SQLite database path"],
              ["JWT_SECRET", "JWT secret for authentication"],
              ["AUTH_ENABLED", "Enable API authentication (default: false)"],
            ].map(([key, desc], i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 border border-white/10">
                  <code className="text-sm text-[#ff2a2a] font-mono">{key}</code>
                </td>
                <td className="py-3 px-4 border border-white/10 text-sm text-gray-400">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WalletSection() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-4">Wallet & Security</h1>
      <p className="text-lg text-gray-400 mb-8 leading-relaxed">
        Agentic Wallet configuration and security features.
      </p>

      <div className="bg-[#ff2a2a]/5 border-l-2 border-[#ff2a2a] p-4 mb-8 rounded-r">
        <p className="text-[#ff2a2a] text-sm font-medium">Note</p>
        <p className="text-gray-400 text-sm mt-1">
          The dashboard does not include wallet connection UI (MetaMask/WalletConnect). 
          All wallet operations are handled by the backend agent using a pre-configured wallet address.
        </p>
      </div>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Backend Wallet Info</h2>
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 mb-8 space-y-2">
        {[
          ["Address", "0x21263042d143CD60833E292b735B66Eca5605B28"],
          ["Network", "X Layer Mainnet (Chain ID: 196)"],
          ["RPC", "https://rpc.xlayer.tech"],
          ["USDC", "0x176211869cA2b568f2A7D4EE941E073a821EE1ff"],
        ].map(([key, val], i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-500">{key}</span>
            <code className="text-[#ff2a2a] font-mono text-xs">{val}</code>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-semibold text-white mt-10 mb-4">Security Features</h2>
      <ul className="space-y-3 mb-8">
        {[
          "TEE (Trusted Execution Environment) signing for x402 mandates",
          "Slippage protection (max 1%)",
          "JWT Authentication (optional, disabled by default)",
          "CORS restriction to frontend URL",
          "SQLite persistence across restarts",
          "Backend-only wallet operations (no frontend key exposure)",
        ].map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-2 w-1.5 h-1.5 bg-[#ff2a2a] rounded-full flex-shrink-0" />
            <span className="text-gray-400">{item}</span>
          </li>
        ))}
      </ul>

      <div className="bg-yellow-500/5 border-l-2 border-yellow-500 p-4 rounded-r">
        <p className="text-yellow-500 text-sm font-medium">Important</p>
        <p className="text-yellow-500/80 text-sm mt-1">
          Never commit <code className="bg-yellow-500/10 px-1 rounded">.env</code> file to Git. It contains sensitive API keys and private keys.
        </p>
      </div>
    </div>
  );
}

// Code Block Component
function CodeBlock({ children, id }: { children: string; id?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mb-6" id={id}>
      <pre className="bg-[var(--panel)] border border-[var(--border)] text-gray-300 rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed transition-colors duration-300">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 hover:bg-white/5 rounded transition-colors"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-gray-500" />
        )}
      </button>
    </div>
  );
}
