"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/landing");
    }, 500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center transition-colors duration-300">
      <div className="text-center">
        <div className="text-[var(--lobster)] font-mono text-sm animate-pulse mb-4">
          Initializing AgentCredit x402...
        </div>
        <div className="text-gray-500 font-mono text-xs">
          {redirecting ? "Redirecting to landing page..." : "Ready"}
        </div>
      </div>
    </div>
  );
}
