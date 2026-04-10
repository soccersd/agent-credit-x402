import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentCredit x402 - Lending Hub",
  description: "AI Agent Lending Hub with x402 protocol on X Layer - Build X Season 2 Hackathon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
