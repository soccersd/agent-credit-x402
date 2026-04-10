"use client";

import React from "react";
import { Shield, TrendingUp, TrendingDown, Wallet, Clock } from "lucide-react";
import { CreditScore } from "@/lib/api";
import { CREDIT_GRADES } from "@/lib/constants";

interface CreditScoreCardProps {
  score: CreditScore | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const CreditScoreCard: React.FC<CreditScoreCardProps> = ({
  score,
  isLoading = false,
  onRefresh,
}) => {
  if (!score && !isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Credit Score
          </h2>
        </div>
        <div className="text-muted-foreground text-center py-8">
          No credit score data available
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-32 mb-4"></div>
        <div className="h-24 bg-muted rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!score) return null;

  const gradeConfig =
    CREDIT_GRADES[score.grade as keyof typeof CREDIT_GRADES] || CREDIT_GRADES.D;
  const scorePercentage =
    score.max_score > 0 ? (score.score / score.max_score) * 100 : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset =
    circumference - (scorePercentage / 100) * circumference;

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      AAA: "text-green-400",
      AA: "text-green-400",
      A: "text-lime-400",
      BBB: "text-yellow-400",
      BB: "text-orange-400",
      B: "text-red-400",
      CCC: "text-red-500",
      D: "text-red-600",
    };
    return colors[grade] || "text-gray-400";
  };

  const getScoreBarColor = (grade: string) => {
    const colors: Record<string, string> = {
      AAA: "bg-green-500",
      AA: "bg-green-500",
      A: "bg-lime-500",
      BBB: "bg-yellow-500",
      BB: "bg-orange-500",
      B: "bg-red-500",
      CCC: "bg-red-600",
      D: "bg-red-700",
    };
    return colors[grade] || "bg-gray-500";
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Credit Score
        </h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Circular Score Display */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={gradeConfig.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-3xl font-bold ${getGradeColor(score.grade)}`}
            >
              {score.grade}
            </span>
            <span className="text-sm text-muted-foreground">
              {score.score}/{score.max_score}
            </span>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Overall Score</span>
            <span className="text-foreground font-medium">{score.score}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${getScoreBarColor(score.grade)}`}
              style={{ width: `${scorePercentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xs text-muted-foreground">History</div>
            <div className="text-sm font-semibold text-foreground">
              {score.on_chain_history_score}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Wallet className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xs text-muted-foreground">Portfolio</div>
            <div className="text-sm font-semibold text-foreground">
              {score.portfolio_value_score}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingDown className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-xs text-muted-foreground">Repayment</div>
            <div className="text-sm font-semibold text-foreground">
              {score.repayment_history_score}
            </div>
          </div>
        </div>

        {/* Reputation Score (NEW SS2) */}
        {(score.reputation_score > 0 || score.identity_bonus > 0) && (
          <div className="pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2 text-center">Reputation (SS2)</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Reputation</div>
                <div className="text-sm font-semibold text-[#ff2a2a]">
                  {score.reputation_score}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Identity Bonus</div>
                <div className="text-sm font-semibold text-green-400">
                  +{score.identity_bonus}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Risk Factor
          </span>
          <span className="text-foreground">
            {(score.risk_adjustment * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Borrow Limit</span>
          <span className="text-foreground font-medium">
            {score.max_borrow_limit.toFixed(2)} USDC
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Wallet</span>
          <span className="text-foreground font-mono text-xs">
            {score.wallet_address && score.wallet_address.length >= 10
              ? `${score.wallet_address.slice(0, 6)}...${score.wallet_address.slice(-4)}`
              : score.wallet_address || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CreditScoreCard;
