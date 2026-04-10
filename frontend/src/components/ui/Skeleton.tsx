"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  width,
  height,
}) => {
  const variantClasses = {
    text: "rounded-sm h-4",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`bg-muted/50 animate-shimmer ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Pre-built skeleton layouts for common UI patterns
export const CreditScoreSkeleton: React.FC = () => (
  <div className="bg-card border border-border rounded-lg p-6 animate-fade-in">
    <div className="flex items-center justify-between mb-6">
      <Skeleton width={140} height={24} variant="text" />
      <Skeleton width={60} height={20} variant="text" />
    </div>
    <div className="flex items-center justify-center mb-6">
      <Skeleton width={128} height={128} variant="circular" />
    </div>
    <div className="space-y-4">
      <Skeleton width="100%" height={8} variant="rectangular" className="rounded-full" />
      <div className="grid grid-cols-3 gap-4 pt-4">
        <Skeleton height={48} variant="rectangular" />
        <Skeleton height={48} variant="rectangular" />
        <Skeleton height={48} variant="rectangular" />
      </div>
    </div>
  </div>
);

export const LoanListSkeleton: React.FC = () => (
  <div className="bg-card border border-border rounded-lg p-6 animate-fade-in">
    <div className="flex items-center justify-between mb-6">
      <Skeleton width={160} height={24} variant="text" />
      <Skeleton width={100} height={32} variant="rectangular" className="rounded-md" />
    </div>
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 bg-background border border-border rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2">
              <Skeleton width={80} height={16} variant="text" />
              <Skeleton width={60} height={20} variant="rectangular" className="rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton width={48} height={24} variant="rectangular" className="rounded" />
              <Skeleton width={48} height={24} variant="rectangular" className="rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton width="80%" height={14} variant="text" />
            <Skeleton width="60%" height={14} variant="text" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const TransactionHistorySkeleton: React.FC = () => (
  <div className="bg-card border border-border rounded-lg p-6 animate-fade-in">
    <div className="flex items-center justify-between mb-6">
      <Skeleton width={180} height={24} variant="text" />
      <Skeleton width={120} height={32} variant="rectangular" className="rounded-md" />
    </div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg">
          <div className="flex items-center gap-3">
            <Skeleton width={32} height={32} variant="circular" />
            <div className="space-y-1">
              <Skeleton width={100} height={14} variant="text" />
              <Skeleton width={140} height={12} variant="text" />
            </div>
          </div>
          <Skeleton width={80} height={14} variant="text" />
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
