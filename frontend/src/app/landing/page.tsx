"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Icon component - removed, no icons needed
const Icon = ({ icon, className = "" }: { icon: string; className?: string }) => {
  return null;
};

export default function LandingPage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleLaunchDashboard = () => {
    setIsLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e5e5] antialiased selection:bg-[#ff2a2a] selection:text-white">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-[#050505]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <div className="banter-loader">
            <div className="banter-loader__box"></div>
            <div className="banter-loader__box"></div>
            <div className="banter-loader__box"></div>
            <div className="banter-loader__box"></div>
            <div className="banter-loader__box"></div>
            <div className="banter-loader__box"></div>
            <div className="banter-loader__box"></div>
            <div className="banter-loader__box"></div>
            <div className="banter-loader__box"></div>
          </div>
          <div className="text-[#ff2a2a] font-mono text-sm animate-pulse">
            Initializing AgentCredit x402...
          </div>
        </div>
      )}

      {/* Atmospheric Backgrounds */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 bg-tech-grid w-full h-full pointer-events-none z-0" />
      <div className="glow-spot top-[-200px] left-1/2 -translate-x-1/2" />

      {/* Status Bar (Top Nav) */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="flex md:px-8 h-16 max-w-[1400px] mr-auto ml-auto pr-4 pl-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex bg-center text-xs font-bold text-black bg-gradient-to-br from-[#ff2a2a] to-[#990000] w-8 h-8 bg-contain rounded-sm items-center justify-center">
                A
              </div>
              <span className="text-white font-bold tracking-tight text-lg pl-2">
                AGENTCREDIT
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-white/10 text-[10px] font-mono text-gray-500">
              <span className="w-1.5 h-1.5 bg-[#ff2a2a] rounded-full shadow-[0_0_10px_#ff2a2a]" />
              X LAYER: LIVE
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden md:flex gap-6 font-mono text-xs tracking-wide text-gray-400">
              <button
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                className="hover:text-white transition-colors"
              >
                FEATURES
              </button>
              <button
                onClick={() => document.getElementById("economy")?.scrollIntoView({ behavior: "smooth" })}
                className="hover:text-white transition-colors"
              >
                ECONOMY LOOP
              </button>
              <button
                onClick={() => document.getElementById("docs")?.scrollIntoView({ behavior: "smooth" })}
                className="hover:text-white transition-colors"
              >
                DOCS
              </button>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="hover:bg-[#ff2a2a] transition-colors uppercase text-xs font-bold text-black tracking-wider font-mono bg-white pt-2 pr-5 pb-2 pl-5"
            >
              LAUNCH APP
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`relative z-10 pt-32 pb-20 px-4 md:px-8 max-w-[1400px] mx-auto transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
        {/* Hero Section */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 mb-32 items-center">
          {/* Left: Typography */}
          <div className="lg:col-span-7 flex flex-col relative justify-center">
            <div className="absolute -left-12 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-[#ff2a2a]/50 to-transparent hidden xl:block" />

            <div className="inline-flex items-center gap-3 mb-8">
              <div className="px-3 py-1 rounded-full border border-[#ff2a2a]/30 bg-[#ff2a2a]/10 text-[#ff2a2a] text-[10px] font-mono tracking-widest uppercase">
                Build X Season 2
              </div>
              <div className="h-[1px] w-12 bg-[#ff2a2a]/30" />
            </div>

            <h1 className="md:text-8xl leading-[0.9] text-6xl font-medium text-white tracking-tighter mb-8">
              AUTONOMOUS <br />
              CREDIT FOR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2a2a] to-white glow-text">
                AI AGENTS.
              </span>
            </h1>

            <p className="text-gray-400 text-xl font-light max-w-xl leading-relaxed mb-10">
              The first{" "}
              <span className="text-white">x402-powered micro-lending engine</span>{" "}
              that enables AI agents to borrow, work, earn, and repay — completely
              autonomously on X Layer.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleLaunchDashboard}
                disabled={isLoading}
                className="h-14 px-8 btn-primary flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Initializing..." : "Launch Dashboard"}
              </button>
              <button
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                className="h-14 px-8 btn-secondary flex items-center justify-center gap-3"
              >
                Learn More
              </button>
            </div>

            <div className="mt-12 flex gap-8 border-t border-white/10 pt-8">
              <div>
                <div className="text-2xl font-bold text-white">22+</div>
                <div className="text-xs text-gray-500 uppercase font-mono mt-1">Tests Passed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">&lt;1s</div>
                <div className="text-xs text-gray-500 uppercase font-mono mt-1">Decision Latency</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="text-xs text-gray-500 uppercase font-mono mt-1">Autonomous</div>
              </div>
            </div>
          </div>

          {/* Right: Terminal Module */}
          <div className="lg:col-span-5 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff2a2a]/10 to-transparent blur-3xl -z-10" />

            <div className="glass-panel rounded-lg overflow-hidden technical-border">
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff2a2a]/20 border border-[#ff2a2a]" />
                  <div className="w-3 h-3 rounded-full bg-white/10 border border-white/20" />
                </div>
                <span className="font-mono text-[10px] text-gray-500">AGENT_CONFIG.RS</span>
              </div>

              {/* Terminal Body */}
              <div className="p-6 font-mono text-xs leading-relaxed relative min-h-[340px]">
                <div className="scan-line" />

                <table className="w-full">
                  <tbody>
                    <tr className="text-gray-500">
                      <td className="pr-4 select-none text-gray-700 text-right w-8">1</td>
                      <td>
                        <span className="text-[#ff7b7b]">use</span>{" "}
                        agentcredit::x402::LendingHub;
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 select-none text-gray-700 text-right">2</td>
                      <td />
                    </tr>
                    <tr>
                      <td className="pr-4 select-none text-gray-700 text-right">3</td>
                      <td>
                        <span className="text-gray-500">// Initialize autonomous agent</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 select-none text-gray-700 text-right">4</td>
                      <td>
                        <span className="text-[#ff7b7b]">let</span> agent ={" "}
                        <span className="text-[#ff7b7b]">Agent</span>::new({"{"}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 select-none text-gray-700 text-right">5</td>
                      <td className="pl-4 text-[#e5e5e5]">
                        credit_score: <span className="text-[#88ff88]">750</span>,
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 select-none text-gray-700 text-right">6</td>
                      <td className="pl-4 text-[#e5e5e5]">
                        strategy: <span className="text-[#88ff88]">"EARN_BORROW_REPAY"</span>,
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 select-none text-gray-700 text-right">7</td>
                      <td className="pl-4 text-[#e5e5e5]">
                        chain: <span className="text-[#88ff88]">"X_LAYER"</span>,
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 select-none text-gray-700 text-right">8</td>
                      <td className="pl-4 text-[#e5e5e5]">
                        x402_enabled: <span className="text-[#ff2a2a]">true</span>,
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 select-none text-gray-700 text-right">9</td>
                      <td>{"}"});</td>
                    </tr>
                    <tr>
                      <td className="pr-4 select-none text-gray-700 text-right">10</td>
                      <td />
                    </tr>
                    <tr>
                      <td className="pr-4 select-none text-gray-700 text-right">11</td>
                      <td>
                        <span className="text-[#ff7b7b]">await</span> agent.start_autonomous();
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Live Feed Simulation */}
                <div className="mt-6 pt-4 border-t border-dashed border-white/10">
                  <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">
                    Live Execution Logs
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-green-500">●</span>
                      <span className="text-gray-300">Credit scored: 750 (Grade A)...</span>
                      <span className="ml-auto text-gray-600">32ms</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-[#ff2a2a]">●</span>
                      <span className="text-white">x402 mandate created: 0x8a...f2</span>
                      <span className="ml-auto text-gray-600 font-bold">+6 USDC</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-blue-500">●</span>
                      <span className="text-gray-300">Task completed: Arbitrage</span>
                      <span className="ml-auto text-gray-600">Earned 1.2 USDC</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="border-y border-white/10 py-6 mb-32 relative bg-black/50">
          <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-[#050505] to-transparent z-10" />
          <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-[#050505] to-transparent z-10" />
          <div className="marquee-container font-mono text-sm text-gray-500 tracking-wider">
            <div className="marquee-content flex items-center gap-16">
              <span>RUST BACKEND</span>
              <span>x402 STREAMING</span>
              <span>22+ TESTS PASSED</span>
              <span>X LAYER MAINNET</span>
              <span>TEE SIGNING</span>
              <span>AUTONOMOUS REPAYMENT</span>
              <span>RUST BACKEND</span>
              <span>x402 STREAMING</span>
              <span>22+ TESTS PASSED</span>
              <span>X LAYER MAINNET</span>
              <span>TEE SIGNING</span>
              <span>AUTONOMOUS REPAYMENT</span>
            </div>
          </div>
        </div>

        {/* Features Bento Grid */}
        <div id="features" className="mb-32">
          <div className="mb-12 flex items-end justify-between">
            <h2 className="text-3xl md:text-5xl font-medium tracking-tighter text-white">
              INFRASTRUCTURE <br />
              FOR THE{" "}
              <span className="text-[#ff2a2a] glow-text">MACHINE ECONOMY</span>
            </h2>
            <div className="hidden md:block text-right">
              <div className="text-xs font-mono text-gray-500 mb-1">SYSTEM STATUS</div>
              <div className="flex items-center gap-2 text-[#ff2a2a] text-sm font-bold animate-pulse">
                <span className="w-2 h-2 bg-[#ff2a2a] rounded-full" />
                OPERATIONAL
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-auto md:h-[600px]">
            {/* Large Feature: x402 */}
            <div className="md:col-span-2 md:row-span-2 glass-panel p-8 rounded-xl relative group overflow-hidden border border-white/10 hover:border-[#ff2a2a]/50 transition-colors">
              <div className="h-full flex flex-col justify-between relative z-10">
                <div>
                  <h3 className="text-2xl text-white font-medium mb-2">
                    x402 Streaming Repayment
                  </h3>
                  <p className="text-gray-400 text-sm max-w-sm">
                    Continuous payment streams instead of lump sums. Agents repay
                    loans automatically as they earn, creating real-time cash flow.
                  </p>
                </div>

                <div className="mt-8 bg-black/50 rounded-lg p-4 border border-white/5">
                  <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2 uppercase">
                    <span>Repayment Speed</span>
                    <span>vs Traditional</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-white mb-1">
                        <span>AgentCredit x402</span>
                        <span className="text-[#ff2a2a]">Stream</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full bg-[#ff2a2a] w-[95%] shadow-[0_0_10px_#ff2a2a]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Traditional Lending</span>
                        <span>Monthly</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full bg-gray-600 w-[40%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature: Rust */}
            <div className="md:col-span-1 glass-panel p-6 rounded-xl border border-white/10 hover:border-white/30 transition-colors flex flex-col justify-between group">
              <div>
                <h3 className="text-lg text-white font-medium mb-2">
                  Rust Performance
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  High-frequency micro-lending with memory safety. Sub-second
                  decisions that Node.js/Python can't match.
                </p>
              </div>
            </div>

            {/* Feature: Reputation */}
            <div className="md:col-span-1 glass-panel p-6 rounded-xl border border-white/10 hover:border-white/30 transition-colors flex flex-col justify-between group">
              <div>
                <h3 className="text-lg text-white font-medium mb-2">
                  Reputation Scoring
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Integrates with soulinX identity. Better reputation = lower
                  rates, higher limits, less collateral.
                </p>
              </div>
            </div>

            {/* Wide Feature: Economy Loop */}
            <div className="md:col-span-2 glass-panel p-6 rounded-xl border border-white/10 hover:border-white/30 transition-colors group">
              <div>
                <h3 className="text-xl text-white font-medium mb-1">
                  Autonomous Economy Loop
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  Borrow → Work → Earn → Repay → Credit Up. Complete cycle
                  without human intervention.
                </p>
                <div className="flex gap-2 text-[10px] font-mono">
                  <span className="bg-white/5 px-2 py-1 rounded text-gray-300 border border-white/5">
                    cargo run --release
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Economy Loop Visualization */}
        <div
          id="economy"
          className="grid lg:grid-cols-2 gap-16 items-center mb-32 border border-white/5 bg-[#080808] p-8 md:p-12 rounded-3xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-[#ff2a2a]/10 to-transparent blur-[100px] pointer-events-none" />

          <div>
            <h2 className="text-3xl font-medium text-white mb-6">
              AUTONOMOUS ECONOMY LOOP
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#ff2a2a]/20 border border-[#ff2a2a] text-[#ff2a2a] flex items-center justify-center text-xs font-mono">
                    1
                  </div>
                  <div className="h-full w-[1px] bg-white/10 my-2" />
                </div>
                <div className="pb-8">
                  <h4 className="text-white font-medium">Evaluate & Borrow</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Agent's credit score is calculated using on-chain activity +
                    reputation. x402 payment mandate created for loan.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/20 text-gray-300 flex items-center justify-center text-xs font-mono">
                    2
                  </div>
                  <div className="h-full w-[1px] bg-white/10 my-2" />
                </div>
                <div className="pb-8">
                  <h4 className="text-white font-medium">Work & Earn</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Agent autonomously executes tasks: trading, analysis,
                    liquidity provision. Earns USDC for completed work.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/20 text-gray-300 flex items-center justify-center text-xs font-mono">
                    3
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-medium">Stream Repayment</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Earnings automatically flow to loan repayment via x402
                    streaming. No human intervention needed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Abstract Visualization */}
          <div className="relative h-[400px] w-full bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />

            {/* Nodes */}
            <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-[#ff2a2a] rounded-full shadow-[0_0_20px_#ff2a2a] animate-pulse" />
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full opacity-50" />
            <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-white rounded-full opacity-50" />

            {/* Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1="25%"
                y1="25%"
                x2="50%"
                y2="50%"
                stroke="rgba(255, 42, 42, 0.3)"
                strokeWidth="1"
              />
              <line
                x1="50%"
                y1="50%"
                x2="75%"
                y2="66%"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />
              <circle
                cx="50%"
                cy="50%"
                r="100"
                stroke="rgba(255,42,42,0.1)"
                strokeWidth="1"
                fill="none"
                className="animate-[spin_10s_linear_infinite] origin-center"
              />
            </svg>

            {/* Floating Card */}
            <div className="absolute bottom-6 left-6 right-6 bg-black/80 backdrop-blur border border-[#ff2a2a]/30 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-[#ff2a2a] font-mono uppercase">
                  Active Loans
                </span>
                <span className="text-xs text-white font-mono">2,048</span>
              </div>
              <div className="w-full bg-[#333] h-1 rounded-full overflow-hidden">
                <div className="bg-[#ff2a2a] w-3/4 h-full" />
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-24 border-t border-white/10">
          <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-white mb-6">
            READY TO{" "}
            <span className="text-[#ff2a2a]">DEPLOY?</span>
          </h2>
          <p className="text-gray-400 mb-8 text-lg max-w-lg mx-auto">
            From Identity to Economy. From Name to Capital. From Agent to
            Autonomous Actor.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="h-12 px-8 bg-white text-black hover:bg-gray-200 transition-colors font-mono text-sm font-bold uppercase tracking-wide"
            >
              Launch Dashboard
            </button>
            <button
              onClick={() => window.open("https://github.com", "_blank")}
              className="h-12 px-8 bg-transparent border border-white/20 text-white hover:border-[#ff2a2a] hover:text-[#ff2a2a] transition-colors font-mono text-sm font-bold uppercase tracking-wide"
            >
              View on GitHub
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#020202]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 bg-[#ff2a2a] flex items-center justify-center text-black font-bold text-[10px] rounded-sm">
                  A
                </div>
                <span className="text-white font-bold tracking-tight">
                  AGENTCREDIT
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                The autonomous micro-lending engine for AI agents. Built with
                Rust, powered by x402, deployed on X Layer.
              </p>
            </div>

            <div>
              <h4 className="text-white text-sm font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-xs text-gray-500 font-mono">
                <li>
                  <span className="hover:text-[#ff2a2a] cursor-pointer">
                    Documentation
                  </span>
                </li>
                <li>
                  <span className="hover:text-[#ff2a2a] cursor-pointer">
                    API Reference
                  </span>
                </li>
                <li>
                  <span className="hover:text-[#ff2a2a] cursor-pointer">
                    Status
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white text-sm font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-xs text-gray-500 font-mono">
                <li>
                  <span className="hover:text-[#ff2a2a] cursor-pointer">
                    x402 Protocol
                  </span>
                </li>
                <li>
                  <span className="hover:text-[#ff2a2a] cursor-pointer">
                    X Layer
                  </span>
                </li>
                <li>
                  <span className="hover:text-[#ff2a2a] cursor-pointer">
                    Build X Hackathon
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white text-sm font-bold mb-4">Connect</h4>
              <div className="flex gap-4 text-gray-400 font-mono text-xs">
                <span className="hover:text-white cursor-pointer">Twitter</span>
                <span className="hover:text-white cursor-pointer">GitHub</span>
                <span className="hover:text-white cursor-pointer">Discord</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 gap-4">
            <span className="text-[10px] text-gray-600 font-mono">
              © 2026 AGENTCREDIT X402. BUILT FOR BUILD X SEASON 2.
            </span>
            <div className="flex gap-6 text-[10px] text-gray-600 font-mono uppercase">
              <span className="cursor-pointer">Privacy Policy</span>
              <span className="cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
