import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TransactionHistory, { Transaction } from "@/components/TransactionHistory";

const mockTransactions: Transaction[] = [
  {
    id: "tx-1",
    type: "loan_created",
    amount: 5.0,
    token: "USDC",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    status: "completed",
    description: "Loan abc12345 created",
    loanId: "abc12345def",
  },
  {
    id: "tx-2",
    type: "loan_repaid",
    amount: 2.5,
    token: "USDC",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    status: "completed",
    description: "Repayment on loan abc12345",
    loanId: "abc12345def",
  },
  {
    id: "tx-3",
    type: "repayment_stream",
    amount: 0.5,
    token: "USDC",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    status: "completed",
    description: "Stream payment on loan xyz98765",
  },
  {
    id: "tx-4",
    type: "collateral_alert",
    amount: 3.0,
    token: "USDC",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    status: "failed",
    description: "Collateral alert for loan def45678",
  },
  {
    id: "tx-5",
    type: "credit_scored",
    amount: 0,
    token: "USDC",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    status: "completed",
    description: "Credit score updated: 750 (Grade A)",
  },
];

describe("TransactionHistory", () => {
  it("renders transaction history title", () => {
    render(<TransactionHistory transactions={mockTransactions} />);
    expect(screen.getByText("Transaction History")).toBeInTheDocument();
  });

  it("shows transaction count", () => {
    render(<TransactionHistory transactions={mockTransactions} />);
    expect(screen.getByText("(5)")).toBeInTheDocument();
  });

  it("renders all transactions", () => {
    render(<TransactionHistory transactions={mockTransactions} />);
    // Verify by unique descriptions instead of labels that may appear in filter dropdown
    expect(screen.getByText("Loan abc12345 created")).toBeInTheDocument();
    expect(screen.getByText("Repayment on loan abc12345")).toBeInTheDocument();
    expect(screen.getByText("Stream payment on loan xyz98765")).toBeInTheDocument();
    expect(screen.getByText("Collateral alert for loan def45678")).toBeInTheDocument();
    expect(screen.getByText("Credit score updated: 750 (Grade A)")).toBeInTheDocument();
  });

  it("shows empty state when no transactions", () => {
    render(<TransactionHistory transactions={[]} />);
    expect(screen.getByText("No transactions found")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(
      <TransactionHistory transactions={[]} isLoading={true} />
    );
    // Should have shimmer animations in loading state
    const shimmers = container.querySelectorAll(".animate-shimmer");
    expect(shimmers.length).toBeGreaterThan(0);
  });

  it("filters transactions by type", () => {
    render(<TransactionHistory transactions={mockTransactions} />);
    // Before filter, Loan Repaid should appear in the list
    expect(screen.getByText("Repayment on loan abc12345")).toBeInTheDocument();

    const select = screen.getByDisplayValue("All Types");
    fireEvent.change(select, { target: { value: "loan_created" } });

    // After filtering to loan_created, the Loan Repaid description should be gone
    expect(screen.queryByText("Repayment on loan abc12345")).not.toBeInTheDocument();
    // Loan Created description should still be visible
    expect(screen.getByText("Loan abc12345 created")).toBeInTheDocument();
  });

  it("shows clear filter button when filter is active", () => {
    render(<TransactionHistory transactions={mockTransactions} />);
    const select = screen.getByDisplayValue("All Types");
    fireEvent.change(select, { target: { value: "loan_created" } });

    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("resets filter when clear is clicked", () => {
    render(<TransactionHistory transactions={mockTransactions} />);
    const select = screen.getByDisplayValue("All Types");
    fireEvent.change(select, { target: { value: "loan_created" } });

    // After filtering, Loan Repaid description should be hidden from list
    expect(screen.queryByText("Repayment on loan abc12345")).not.toBeInTheDocument();

    const clearButton = screen.getByText("Clear");
    fireEvent.click(clearButton);

    // All transactions should be visible again after clearing
    expect(screen.getByText("Repayment on loan abc12345")).toBeInTheDocument();
  });

  it("displays transaction amounts correctly", () => {
    render(<TransactionHistory transactions={mockTransactions} />);
    expect(screen.getByText("-5.00 USDC")).toBeInTheDocument();
    expect(screen.getByText("+2.50 USDC")).toBeInTheDocument();
  });

  it("shows status badges", () => {
    render(<TransactionHistory transactions={mockTransactions} />);
    const doneBadges = screen.getAllByText("Done");
    expect(doneBadges.length).toBeGreaterThan(0);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows pagination when many transactions", () => {
    const manyTransactions: Transaction[] = Array.from({ length: 10 }, (_, i) => ({
      id: `tx-many-${i}`,
      type: "loan_created" as const,
      amount: i + 1,
      token: "USDC",
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      status: "completed" as const,
      description: `Transaction ${i + 1}`,
    }));

    render(<TransactionHistory transactions={manyTransactions} />);
    // Should show pagination controls
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
  });
});
