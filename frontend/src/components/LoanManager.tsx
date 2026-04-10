"use client";

import React, { useState } from "react";
import {
  PlusCircle,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ActiveLoan } from "@/lib/api";
import { LoanListSkeleton } from "@/components/ui/Skeleton";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

interface LoanManagerProps {
  loans: ActiveLoan[];
  onCreateLoan: (amount: number, token: string, duration: number) => void;
  onRepayLoan: (loanId: string) => void;
  onCancelLoan: (loanId: string) => void;
  isLoading?: boolean;
  maxBorrowLimit?: number;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "Active":
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case "Repaying":
      return <Clock className="w-4 h-4 text-blue-400" />;
    case "Completed":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "Defaulted":
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case "Liquidated":
      return <XCircle className="w-4 h-4 text-red-600" />;
    default:
      return <Clock className="w-4 h-4 text-yellow-400" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "Active":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "Repaying":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Completed":
      return "bg-green-600/20 text-green-500 border-green-600/30";
    case "Defaulted":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "Liquidated":
      return "bg-red-600/20 text-red-500 border-red-600/30";
    default:
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  }
}

const LoanManager: React.FC<LoanManagerProps> = ({
  loans,
  onCreateLoan,
  onRepayLoan,
  onCancelLoan,
  isLoading = false,
  maxBorrowLimit = 10,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loanAmount, setLoanAmount] = useState<string>("1");
  const [loanDuration, setLoanDuration] = useState<string>("3600");
  const [selectedToken, setSelectedToken] = useState("USDC");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(loanAmount);
    const duration = parseInt(loanDuration);

    if (isNaN(amount) || isNaN(duration)) return;
    if (amount < 0.1 || amount > maxBorrowLimit) return;

    setIsSubmitting(true);
    try {
      onCreateLoan(amount, selectedToken, duration);
      setShowCreateForm(false);
      setLoanAmount("1");
      setLoanDuration("3600");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeLoans = loans.filter(
    (l) => l.status === "Active" || l.status === "Repaying"
  );

  const completedLoans = loans.filter(
    (l) =>
      l.status === "Completed" ||
      l.status === "Defaulted" ||
      l.status === "Liquidated"
  );

  if (isLoading && loans.length === 0) {
    return <LoanListSkeleton />;
  }

  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-6 transition-colors duration-300 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#ff2a2a]" />
          Loan Manager
          <span className="text-sm text-muted-foreground font-normal">
            ({activeLoans.length} active)
          </span>
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
        >
          <PlusCircle className="w-4 h-4" />
          New Loan
        </button>
      </div>

      {/* Create Loan Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateLoan}
          className="mb-6 p-4 bg-muted/50 border border-[var(--border)] rounded-lg animate-scale-in"
        >
          <h3 className="text-sm font-medium text-foreground mb-4">
            Create New Loan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Amount (USDC)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={maxBorrowLimit}
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-[var(--border)] rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Range: 0.1 - {maxBorrowLimit} USDC
              </p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Collateral Token
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-[var(--border)] rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              >
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="ETH">WETH</option>
                <option value="OKB">OKB</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Duration (seconds)
              </label>
              <input
                type="number"
                min="60"
                max="86400"
                value={loanDuration}
                onChange={(e) => setLoanDuration(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-[var(--border)] rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {((parseInt(loanDuration || "0") || 0) / 60).toFixed(1)} minutes
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              {isSubmitting ? "Creating..." : "Create Loan"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Active Loans */}
      {activeLoans.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Active Loans
          </h3>
          <div className="space-y-3">
            {activeLoans.map((loan, index) => (
              <LoanCard
                key={loan.loan_id}
                loan={loan}
                onRepay={() => onRepayLoan(loan.loan_id)}
                onCancel={() => onCancelLoan(loan.loan_id)}
                animationDelay={index * 100}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Loans (collapsible) */}
      {completedLoans.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-medium text-foreground mb-3 hover:text-primary transition-colors group"
          >
            Loan History
            <span className="text-muted-foreground font-normal text-xs">
              ({completedLoans.length})
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </button>
          {showHistory && (
            <div className="space-y-3 animate-fade-in-up">
              {completedLoans.map((loan, index) => (
                <LoanCard
                  key={loan.loan_id}
                  loan={loan}
                  onRepay={() => {}}
                  onCancel={() => {}}
                  compact
                  animationDelay={index * 50}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {loans.length === 0 && !showCreateForm && (
        <div className="text-center py-12 text-muted-foreground animate-fade-in">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No loans yet</p>
          <p className="text-xs mt-1">
            Create a loan to start borrowing via x402
          </p>
        </div>
      )}
    </div>
  );
};

interface LoanCardProps {
  loan: ActiveLoan;
  onRepay: () => void;
  onCancel: () => void;
  compact?: boolean;
  animationDelay?: number;
}

const LoanCard: React.FC<LoanCardProps> = ({
  loan,
  onRepay,
  onCancel,
  compact = false,
  animationDelay = 0,
}) => {
  const repaymentPercentage =
    loan.principal > 0
      ? Math.min(
          100,
          (loan.repaid_amount / (loan.principal * (1 + loan.interest_rate))) *
            100
        ).toFixed(1)
      : "0";

  return (
    <div
      className="p-4 bg-background border border-[var(--border)] rounded-lg hover:border-primary/30 transition-all duration-200 animate-fade-in-up"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(loan.status)}
          <div>
            <p className="text-sm font-mono text-foreground">
              {loan.loan_id.slice(0, 8)}...
            </p>
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded-full border ${getStatusColor(loan.status)}`}
            >
              {loan.status}
            </span>
          </div>
        </div>
        {!compact &&
          (loan.status === "Active" || loan.status === "Repaying") && (
            <div className="flex gap-2">
              <button
                onClick={onRepay}
                className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
              >
                Repay
              </button>
              <button
                onClick={onCancel}
                className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
      </div>

      {!compact && (
        <>
          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
            <div>
              <span className="text-muted-foreground">Principal</span>
              <p className="text-foreground font-medium">
                <AnimatedCounter value={loan.principal} decimals={2} suffix=" USDC" />
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Outstanding</span>
              <p className="text-foreground font-medium">
                <AnimatedCounter value={loan.outstanding} decimals={2} suffix=" USDC" />
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Interest Rate</span>
              <p className="text-foreground font-medium">
                <AnimatedCounter value={loan.interest_rate * 100} decimals={1} suffix="%" />
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Collateral</span>
              <p className="text-foreground font-medium">
                <AnimatedCounter value={loan.collateral_amount} decimals={2} suffix={` ${loan.collateral_token}`} />
              </p>
            </div>
          </div>

          {/* Repayment Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Repayment Progress</span>
              <span className="text-foreground">{repaymentPercentage}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${repaymentPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Stream Rate</span>
            <span>{loan.stream_rate_per_sec.toFixed(4)} USDC/sec</span>
          </div>

          <div className="mt-2 pt-2 border-t border-[var(--border)] flex justify-between text-xs text-muted-foreground">
            <span>Created: {new Date(loan.created_at).toLocaleString()}</span>
            <span>Due: {new Date(loan.due_at).toLocaleString()}</span>
          </div>
        </>
      )}

      {compact && (
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Principal</span>
            <p className="text-foreground font-medium">
              <AnimatedCounter value={loan.principal} decimals={2} suffix=" USDC" />
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Repaid</span>
            <p className="text-foreground font-medium">
              <AnimatedCounter value={loan.repaid_amount} decimals={2} suffix=" USDC" />
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Completed</span>
            <p className="text-foreground font-medium">
              {new Date(loan.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManager;
