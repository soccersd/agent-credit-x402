import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CreditScoreCard from "@/components/CreditScoreCard";
import { CreditScore } from "@/lib/api";

const mockCreditScore: CreditScore = {
  score: 750,
  max_score: 1000,
  grade: "A",
  on_chain_history_score: 250,
  portfolio_value_score: 300,
  repayment_history_score: 200,
  reputation_score: 50,
  identity_bonus: 10,
  risk_adjustment: 0.15,
  calculated_at: new Date().toISOString(),
  wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
  max_borrow_limit: 10.0,
};

describe("CreditScoreCard", () => {
  it("renders credit score card with data", () => {
    render(<CreditScoreCard score={mockCreditScore} />);
    expect(screen.getByText("Credit Score")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("shows empty state when no score", () => {
    render(<CreditScoreCard score={null} />);
    expect(screen.getByText("No credit score data available")).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    const { container } = render(<CreditScoreCard score={null} isLoading={true} />);
    // Skeleton should have shimmer animation
    const shimmers = container.querySelectorAll(".animate-shimmer");
    expect(shimmers.length).toBeGreaterThan(0);
  });

  it("displays wallet address truncated", () => {
    render(<CreditScoreCard score={mockCreditScore} />);
    expect(screen.getByText("0x1234...5678")).toBeInTheDocument();
  });

  it("shows refresh button when onRefresh provided", () => {
    const onRefresh = jest.fn();
    render(<CreditScoreCard score={mockCreditScore} onRefresh={onRefresh} />);
    const refreshButton = screen.getByText("Refresh");
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not show refresh button when onRefresh not provided", () => {
    render(<CreditScoreCard score={mockCreditScore} />);
    expect(screen.queryByText("Refresh")).not.toBeInTheDocument();
  });

  it("renders sub-scores", () => {
    render(<CreditScoreCard score={mockCreditScore} />);
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Repayment")).toBeInTheDocument();
  });

  it("renders reputation section when scores are positive", () => {
    render(<CreditScoreCard score={mockCreditScore} />);
    expect(screen.getByText("Reputation (SS2)")).toBeInTheDocument();
  });

  it("hides reputation section when scores are zero", () => {
    const noRepScore = {
      ...mockCreditScore,
      reputation_score: 0,
      identity_bonus: 0,
    };
    render(<CreditScoreCard score={noRepScore} />);
    expect(screen.queryByText("Reputation (SS2)")).not.toBeInTheDocument();
  });

  it("shows risk factor and max borrow limit", () => {
    render(<CreditScoreCard score={mockCreditScore} />);
    expect(screen.getByText("Risk Factor")).toBeInTheDocument();
    expect(screen.getByText("Max Borrow Limit")).toBeInTheDocument();
  });
});
