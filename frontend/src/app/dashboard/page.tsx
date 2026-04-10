"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  Shield,
  DollarSign,
  TrendingUp,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import CreditScoreCard from "@/components/CreditScoreCard";
import LoanManager from "@/components/LoanManager";
import {
  getAgentStatus,
  triggerAgentLoop,
  startAgent,
  stopAgent,
  createLoan,
  repayLoan,
  cancelLoan,
  AgentStatus,
} from "@/lib/api";
import { BACKEND_WS_URL } from "@/lib/constants";
import { getWebSocketInstance, WebSocketMessage } from "@/lib/websocket";

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<any>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await getAgentStatus();
      if (response.success) {
        setStatus(response.data);
        setBackendOnline(true);
        setError(null);
      } else {
        setError(response.error || "Failed to fetch status");
      }
    } catch (err) {
      setBackendOnline(false);
      setError("Cannot connect to backend server");
      console.error("Failed to fetch status:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const ws = getWebSocketInstance(BACKEND_WS_URL);
    wsRef.current = ws;

    ws.on('initial_state', (message: WebSocketMessage) => {
      if (message.data) {
        setStatus(message.data as AgentStatus);
        setBackendOnline(true);
        setWsConnected(true);
      }
    });

    ws.on('state_changed', () => fetchStatus());
    ws.on('credit_scored', () => fetchStatus());
    ws.on('loan_created', () => fetchStatus());
    ws.on('loan_repaid', () => fetchStatus());
    ws.on('collateral_alert', () => fetchStatus());
    ws.on('liquidation_alert', () => fetchStatus());
    ws.on('error', (message: WebSocketMessage) => {
      setError(message.message || 'An error occurred');
    });

    ws.connect();

    // Wait a bit before checking connection
    const timer = setTimeout(() => {
      setWsConnected(ws.isConnected());
    }, 500);

    return () => {
      clearTimeout(timer);
      // Only disconnect if component is truly unmounting
      if (wsRef.current === ws) {
        ws.disconnect();
        setWsConnected(false);
      }
    };
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const getStateColor = (state: string) => {
    switch (state) {
      case "Evaluate": return "text-blue-400";
      case "Borrowing": return "text-yellow-400";
      case "Monitoring": return "text-green-400";
      case "Repaying": return "text-cyan-400";
      case "Liquidating": return "text-red-400";
      case "Idle": return "text-gray-400";
      case "Error": return "text-red-500";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/landing")}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div className="p-2 bg-[#ff2a2a]/20 rounded-lg">
                <Shield className="w-6 h-6 text-[#ff2a2a]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  AgentCredit x402
                </h1>
                <p className="text-xs text-gray-500">
                  Dashboard • Build X Season 2
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${wsConnected ? "bg-blue-500/20 text-blue-400" : backendOnline ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                <div className={`w-2 h-2 rounded-full ${wsConnected ? "bg-blue-400 animate-pulse" : backendOnline ? "bg-green-400" : "bg-red-400"}`} />
                {wsConnected ? "WebSocket" : backendOnline ? "Online" : "Offline"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Control Panel */}
        <div className="mb-6 p-4 bg-[#0a0a0a] border border-white/10 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className={`w-5 h-5 ${getStateColor(status?.current_state || "Idle")}`} />
                <div>
                  <p className="text-xs text-gray-500">State</p>
                  <p className={`text-sm font-semibold ${getStateColor(status?.current_state || "Idle")}`}>
                    {status?.current_state || "Unknown"}
                  </p>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-xs text-gray-500">Iteration</p>
                <p className="text-sm font-semibold text-white">#{status?.iteration_count || 0}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!status?.is_running ? (
                <button onClick={async () => { await startAgent(); fetchStatus(); }} className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-md hover:bg-green-500/30 transition-colors text-sm">
                  <Play className="w-4 h-4" /> Start
                </button>
              ) : (
                <button onClick={async () => { await stopAgent(); fetchStatus(); }} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30 transition-colors text-sm">
                  <Square className="w-4 h-4" /> Stop
                </button>
              )}
              <button onClick={async () => { await triggerAgentLoop(); fetchStatus(); }} className="flex items-center gap-2 px-4 py-2 bg-[#ff2a2a]/20 text-[#ff2a2a] rounded-md hover:bg-[#ff2a2a]/30 transition-colors text-sm">
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} /> Trigger
              </button>
              <button onClick={fetchStatus} className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-400 rounded-md hover:bg-white/10 transition-colors text-sm">
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <CreditScoreCard score={status?.credit_score || null} isLoading={isLoading} onRefresh={fetchStatus} />

            {/* Agent Wallet & Earnings */}
            {status?.wallet && (
              <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  💰 Agent Wallet
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Balance</span>
                    <span className="text-lg font-bold text-[#ff2a2a]">{status.wallet.balance_usdc.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Total Earned</span>
                    <span className="text-sm font-semibold text-white">{status.wallet.total_earned.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Total Repaid</span>
                    <span className="text-sm font-semibold text-white">{status.wallet.total_spent_on_repayments.toFixed(2)} USDC</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Tasks Completed</span>
                      <span className="text-sm font-semibold text-white">{status.wallet.tasks_completed}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-400">Success Rate</span>
                      <span className="text-sm font-semibold text-green-400">{status.wallet.success_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" /> Quick Stats
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Active Loans</span>
                  </div>
                  <span className="text-lg font-bold text-white">{status?.active_loans_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Total Borrowed</span>
                  </div>
                  <span className="text-lg font-bold text-white">
                    {(status?.active_loans || []).reduce((sum, l) => sum + l.principal, 0).toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Activity className="w-4 h-4" />
                    <span className="text-sm">Total Repaid</span>
                  </div>
                  <span className="text-lg font-bold text-white">
                    {(status?.active_loans || []).reduce((sum, l) => sum + l.repaid_amount, 0).toFixed(2)} USDC
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <LoanManager
              loans={status?.active_loans || []}
              onCreateLoan={async (amount, token, duration) => { await createLoan(amount, token, duration); fetchStatus(); }}
              onRepayLoan={async (id) => { await repayLoan(id); fetchStatus(); }}
              onCancelLoan={async (id) => { await cancelLoan(id); fetchStatus(); }}
              isLoading={isRefreshing}
              maxBorrowLimit={status?.credit_score?.max_borrow_limit || 10}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-gray-500">
            AgentCredit x402 Lending Hub • Built for Build X Season 2 - X Layer Arena Hackathon
          </p>
        </footer>
      </main>
    </div>
  );
}
