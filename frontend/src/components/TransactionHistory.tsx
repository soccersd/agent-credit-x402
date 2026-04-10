"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";
import { ActiveLoan } from "@/lib/api";

export interface Transaction {
  id: string;
  type: "loan_created" | "loan_repaid" | "loan_cancelled" | "repayment_stream" | "credit_scored" | "collateral_alert" | "liquidation";
  amount: number;
  token: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
  description: string;
  loanId?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  loans?: ActiveLoan[];
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 8;

const typeConfig: Record<
  Transaction["type"],
  { icon: React.ReactNode; label: string; colorClass: string; bgClass: string }
> = {
  loan_created: {
    icon: <ArrowUpRight className="w-4 h-4" />,
    label: "Loan Created",
    colorClass: "text-yellow-400",
    bgClass: "bg-yellow-500/10",
  },
  loan_repaid: {
    icon: <ArrowDownLeft className="w-4 h-4" />,
    label: "Loan Repaid",
    colorClass: "text-green-400",
    bgClass: "bg-green-500/10",
  },
  loan_cancelled: {
    icon: <Clock className="w-4 h-4" />,
    label: "Loan Cancelled",
    colorClass: "text-gray-400",
    bgClass: "bg-gray-500/10",
  },
  repayment_stream: {
    icon: <ArrowDownLeft className="w-4 h-4" />,
    label: "Stream Payment",
    colorClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
  },
  credit_scored: {
    icon: <History className="w-4 h-4" />,
    label: "Credit Scored",
    colorClass: "text-purple-400",
    bgClass: "bg-purple-500/10",
  },
  collateral_alert: {
    icon: <ArrowUpRight className="w-4 h-4" />,
    label: "Collateral Alert",
    colorClass: "text-orange-400",
    bgClass: "bg-orange-500/10",
  },
  liquidation: {
    icon: <ArrowUpRight className="w-4 h-4" />,
    label: "Liquidation",
    colorClass: "text-red-500",
    bgClass: "bg-red-500/10",
  },
};

const statusBadge: Record<Transaction["status"], { label: string; class: string }> = {
  completed: { label: "Done", class: "bg-green-500/20 text-green-400 border-green-500/30" },
  pending: { label: "Pending", class: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  failed: { label: "Failed", class: "bg-red-500/20 text-red-400 border-red-500/30" },
};

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  isLoading = false,
}) => {
  const [filterType, setFilterType] = useState<"all" | Transaction["type"]>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType);
    }
    // Sort by timestamp descending
    return [...filtered].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [transactions, filterType]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const activeFilterCount = filterType !== "all" ? 1 : 0;

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <History className="w-5 h-5" />
            Transaction History
          </h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 border border-border rounded-lg animate-shimmer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted/50" />
                <div>
                  <div className="h-3 w-24 bg-muted/50 rounded mb-1" />
                  <div className="h-2 w-32 bg-muted/50 rounded" />
                </div>
              </div>
              <div className="h-3 w-16 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <History className="w-5 h-5" />
          Transaction History
          <span className="text-sm text-muted-foreground font-normal">
            ({filteredTransactions.length})
          </span>
        </h2>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as "all" | Transaction["type"]);
                setCurrentPage(1);
              }}
              className="pl-7 pr-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="loan_created">Loan Created</option>
              <option value="loan_repaid">Loan Repaid</option>
              <option value="loan_cancelled">Cancelled</option>
              <option value="repayment_stream">Stream Payment</option>
              <option value="credit_scored">Credit Scored</option>
              <option value="collateral_alert">Collateral Alert</option>
              <option value="liquidation">Liquidation</option>
            </select>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilterType("all");
                setCurrentPage(1);
              }}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Transaction List */}
      {paginatedTransactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No transactions found</p>
          <p className="text-xs mt-1">
            {filterType !== "all"
              ? "Try changing the filter"
              : "Transactions will appear here when activity occurs"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedTransactions.map((tx, index) => {
            const config = typeConfig[tx.type];
            const badge = statusBadge[tx.status];
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:border-primary/30 transition-colors animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.bgClass} ${config.colorClass}`}
                  >
                    {config.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {config.label}
                      </span>
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-[10px] rounded-full border ${badge.class}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {tx.description}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right ml-3">
                  <div
                    className={`text-sm font-medium ${
                      tx.type === "loan_created" || tx.type === "liquidation"
                        ? "text-red-400"
                        : tx.type === "loan_repaid" || tx.type === "repayment_stream"
                          ? "text-green-400"
                          : "text-foreground"
                    }`}
                  >
                    {tx.type === "loan_created" || tx.type === "liquidation" ? "-" : "+"}
                    {tx.amount.toFixed(2)} {tx.token}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatTimeAgo(tx.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(safePage * ITEMS_PER_PAGE, filteredTransactions.length)} of{" "}
            {filteredTransactions.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 text-xs rounded-md transition-colors ${
                  page === safePage
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
