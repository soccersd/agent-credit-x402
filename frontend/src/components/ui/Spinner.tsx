"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-10 h-10",
};

export const Spinner: React.FC<SpinnerProps> = ({ size = "md", className = "" }) => {
  return (
    <Loader2
      className={`animate-spin text-[#ff2a2a] ${sizeMap[size]} ${className}`}
    />
  );
};

interface SpinnerOverlayProps {
  message?: string;
}

export const SpinnerOverlay: React.FC<SpinnerOverlayProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 animate-fade-in">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground font-mono">{message}</p>
    </div>
  );
};

export default Spinner;
