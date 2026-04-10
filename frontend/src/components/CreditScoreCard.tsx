"use client";

import React from "react";
import { Shield, TrendingUp, TrendingDown, Wallet, Clock, RefreshCw } from "lucide-react";
import { CreditScore } from "@/lib/api";
import { CREDIT_GRADES } from "@/lib/constants";
import { AnimatedScoreRing, AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { CreditScoreSkeleton } from "@/components/ui/Skeleton";

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
  if (isLoading) {
    return <CreditScoreSkeleton />;
  }

  if (!score) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Credit Score
          </h2>
        </div>
        <div className="text-muted-foreground text-center py-8">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No credit score data available</p>
          <p className="text-xs mt-1">Start the agent to generate a score</p>
        </div>
      </div>
    );
  }

  const gradeConfig =
    CREDIT_GRADES[score.grade as keyof typeof CREDIT_GRADES] || CREDIT_GRADES.D;
  const scorePercentage =
    score.max_score > 0 ? (score.score / score.max_score) * 100 : 0;

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
    <div className="bg-card border border-border rounded-lg p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Credit Score
        </h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors group"
          >
            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            Refresh
          </button>
        )}
      </div>

      {/* Animated Circular Score Display */}
      <div className="flex items-center justify-center mb-6">
        <AnimatedScoreRing
          score={score.score}
          maxScore={score.max_score}
          grade={score.grade}
          color={gradeConfig.color}
          size={128}
          strokeWidth={8}
          className="animate-score-ring"
        />
      </div>

      {/* Score Breakdown with Animated Progress */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Overall Score</span>
            <AnimatedCounter
              value={score.score}
              className="text-foreground font-medium"
            />
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ease-out ${getScoreBarColor(score.grade)}`}
              style={{ width: `${scorePercentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center animate-fade-in-up delay-100">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xs text-muted-foreground">History</div>
            <AnimatedCounter
              value={score.on_chain_history_score}
              className="text-sm font-semibold text-foreground"
            />
          </div>
          <div className="text-center animate-fade-in-up delay-200">
            <div className="flex items-center justify-center mb-1">
              <Wallet className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xs text-muted-foreground">Portfolio</div>
            <AnimatedCounter
              value={score.portfolio_value_score}
              className="text-sm font-semibold text-foreground"
            />
          </div>
          <div className="text-center animate-fade-in-up delay-300">
            <div className="flex items-center justify-center mb-1">
              <TrendingDown className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-xs text-muted-foreground">Repayment</div>
            <AnimatedCounter
              value={score.repayment_history_score}
              className="text-sm font-semibold text-foreground"
            />
          </div>
        </div>

        {/* Reputation Score (SS2) */}
        {(score.reputation_score > 0 || score.identity_bonus > 0) && (
          <div className="pt-4 border-t border-border animate-fade-in-up delay-400">
            <div className="text-xs text-muted-foreground mb-2 text-center">
              Reputation (SS2)
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Reputation</div>
                <AnimatedCounter
                  value={score.reputation_score}
                  className="text-sm font-semibold text-[#ff2a2a]"
                />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Identity Bonus</div>
                <span className="text-sm font-semibold text-green-400">
                  +<AnimatedCounter
                    value={score.identity_bonus}
                    className="text-green-400"
                  />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm animate-fade-in-up delay-500">
        <div className="flex justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Risk Factor
          </span>
          <span className="text-foreground">
            <AnimatedCounter
              value={score.risk_adjustment * 100}
              decimals={1}
              suffix="%"
            />
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Borrow Limit</span>
          <span className="text-foreground font-medium">
            <AnimatedCounter
              value={score.max_borrow_limit}
              decimals={2}
              suffix=" USDC"
            />
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
