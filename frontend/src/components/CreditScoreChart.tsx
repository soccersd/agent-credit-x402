"use client";

import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

export interface CreditScoreHistory {
  id: number;
  wallet_address: string;
  score: number;
  max_score: number;
  grade: string;
  on_chain_history_score: number;
  portfolio_value_score: number;
  repayment_history_score: number;
  reputation_score: number;
  identity_bonus: number;
  risk_adjustment: number;
  max_borrow_limit: number;
  created_at: string;
}

interface CreditScoreChartProps {
  history: CreditScoreHistory[];
  isLoading?: boolean;
}

const CreditScoreChart: React.FC<CreditScoreChartProps> = ({
  history,
  isLoading = false,
}) => {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return null;

    // Calculate min/max for Y axis
    const scores = history.map((h) => h.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    // Add some padding
    const yMin = Math.max(0, minScore - 50);
    const yMax = maxScore + 50;

    // Chart dimensions
    const width = 600;
    const height = 200;
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Generate points
    const points = history.map((item, index) => {
      const x = padding.left + (index / Math.max(history.length - 1, 1)) * chartWidth;
      const y = padding.top + chartHeight - ((item.score - yMin) / (yMax - yMin)) * chartHeight;
      return { x, y, ...item };
    });

    // Generate path
    const pathD = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    // Generate area path
    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    // Y-axis ticks
    const yTicks = [];
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const value = yMin + ((yMax - yMin) / tickCount) * i;
      const y = padding.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;
      yTicks.push({ value: Math.round(value), y });
    }

    // X-axis labels (show max 5)
    const xLabels = history
      .filter((_, index) => {
        if (history.length <= 5) return true;
        const step = Math.ceil(history.length / 5);
        return index % step === 0 || index === history.length - 1;
      })
      .map((item, index) => {
        const pointIndex = history.indexOf(item);
        const x = padding.left + (pointIndex / Math.max(history.length - 1, 1)) * chartWidth;
        return {
          x,
          label: new Date(item.created_at).toLocaleDateString("th-TH", {
            month: "short",
            day: "numeric",
          }),
        };
      });

    // Calculate trend
    const trend =
      history.length >= 2
        ? history[history.length - 1].score - history[history.length - 2].score
        : 0;

    return {
      points,
      pathD,
      areaD,
      yTicks,
      xLabels,
      trend,
      width,
      height,
      padding,
      chartWidth,
      chartHeight,
    };
  }, [history]);

  if (isLoading) {
    return (
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-6 transition-colors duration-300">
        <div className="h-6 bg-muted rounded animate-pulse mb-4 w-48" />
        <div className="h-52 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-6 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#ff2a2a]" />
          Credit Score History
        </h3>
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No credit score history yet</p>
          <p className="text-xs mt-1">Start the agent to build history</p>
        </div>
      </div>
    );
  }

  const trendIcon =
    chartData!.trend > 0 ? (
      <TrendingUp className="w-4 h-4 text-green-400" />
    ) : chartData!.trend < 0 ? (
      <TrendingDown className="w-4 h-4 text-red-400" />
    ) : (
      <Minus className="w-4 h-4 text-muted-foreground" />
    );

  const trendColor =
    chartData!.trend > 0
      ? "text-green-400"
      : chartData!.trend < 0
        ? "text-red-400"
        : "text-muted-foreground";

  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-6 transition-colors duration-300 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#ff2a2a]" />
          Credit Score History
        </h3>
        <div className="flex items-center gap-2">
          {trendIcon}
          <span className={`text-sm font-medium ${trendColor}`}>
            {chartData!.trend > 0 ? "+" : ""}
            <AnimatedCounter value={chartData!.trend} />
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartData!.width} ${chartData!.height}`}
          className="w-full min-w-[500px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {chartData!.yTicks.map((tick, index) => (
            <g key={index}>
              <line
                x1={chartData!.padding.left}
                y1={tick.y}
                x2={chartData!.padding.left + chartData!.chartWidth}
                y2={tick.y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={chartData!.padding.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-xs"
                style={{ fontSize: "11px" }}
              >
                {tick.value}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {chartData!.xLabels.map((label, index) => (
            <text
              key={index}
              x={label.x}
              y={chartData!.height - 5}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: "11px" }}
            >
              {label.label}
            </text>
          ))}

          {/* Area fill */}
          <path
            d={chartData!.areaD}
            fill="url(#areaGradient)"
            opacity="0.3"
          />

          {/* Line */}
          <path
            d={chartData!.pathD}
            fill="none"
            stroke="#ff2a2a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {chartData!.points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#ff2a2a"
                stroke="var(--panel)"
                strokeWidth="2"
                className="hover:r-7 transition-all"
              />
              {/* Tooltip on hover */}
              <title>{`${point.score} (${point.grade}) - ${new Date(point.created_at).toLocaleString()}`}</title>
            </g>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff2a2a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ff2a2a" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--border)]">
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Current</div>
          <div className="text-lg font-bold text-foreground">
            <AnimatedCounter value={history[history.length - 1].score} />
          </div>
          <div className="text-xs text-muted-foreground">
            {history[history.length - 1].grade}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Highest</div>
          <div className="text-lg font-bold text-green-400">
            <AnimatedCounter
              value={Math.max(...history.map((h) => h.score))}
            />
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Lowest</div>
          <div className="text-lg font-bold text-red-400">
            <AnimatedCounter
              value={Math.min(...history.map((h) => h.score))}
            />
          </div>
        </div>
      </div>

      {/* Data points count */}
      <div className="mt-3 text-center text-xs text-muted-foreground">
        {history.length} data point{history.length !== 1 ? "s" : ""} recorded
      </div>
    </div>
  );
};

export default CreditScoreChart;
