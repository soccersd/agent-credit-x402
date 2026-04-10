import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LoanManager from "@/components/LoanManager";
import { ActiveLoan } from "@/lib/api";

const mockActiveLoan: ActiveLoan = {
  loan_id: "abc12345def67890",
  wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
  principal: 5.0,
  outstanding: 3.5,
  interest_rate: 0.05,
  collateral_amount: 6.0,
  collateral_token: "USDC",
  status: "Active",
  created_at: new Date(Date.now() - 86400000).toISOString(),
  due_at: new Date(Date.now() + 86400000).toISOString(),
  repaid_amount: 1.5,
  stream_rate_per_sec: 0.0001,
};

const mockCompletedLoan: ActiveLoan = {
  ...mockActiveLoan,
  loan_id: "completed1234567890",
  status: "Completed",
  repaid_amount: 5.25,
  outstanding: 0,
};

describe("LoanManager", () => {
  it("renders loan manager title", () => {
    render(<LoanManager loans={[]} onCreateLoan={jest.fn()} onRepayLoan={jest.fn()} onCancelLoan={jest.fn()} />);
    expect(screen.getByText("Loan Manager")).toBeInTheDocument();
  });

  it("shows empty state when no loans", () => {
    render(<LoanManager loans={[]} onCreateLoan={jest.fn()} onRepayLoan={jest.fn()} onCancelLoan={jest.fn()} />);
    expect(screen.getByText("No loans yet")).toBeInTheDocument();
  });

  it("shows active loan count", () => {
    render(
      <LoanManager
        loans={[mockActiveLoan]}
        onCreateLoan={jest.fn()}
        onRepayLoan={jest.fn()}
        onCancelLoan={jest.fn()}
      />
    );
    expect(screen.getByText("(1 active)")).toBeInTheDocument();
  });

  it("renders active loan details", () => {
    render(
      <LoanManager
        loans={[mockActiveLoan]}
        onCreateLoan={jest.fn()}
        onRepayLoan={jest.fn()}
        onCancelLoan={jest.fn()}
      />
    );
    expect(screen.getByText("Active Loans")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows New Loan button", () => {
    render(<LoanManager loans={[]} onCreateLoan={jest.fn()} onRepayLoan={jest.fn()} onCancelLoan={jest.fn()} />);
    expect(screen.getByText("New Loan")).toBeInTheDocument();
  });

  it("toggles create loan form", () => {
    render(<LoanManager loans={[]} onCreateLoan={jest.fn()} onRepayLoan={jest.fn()} onCancelLoan={jest.fn()} />);
    const newLoanButton = screen.getByText("New Loan");
    fireEvent.click(newLoanButton);

    expect(screen.getByText("Create New Loan")).toBeInTheDocument();
    expect(screen.getByText("Create Loan")).toBeInTheDocument();
  });

  it("hides form on cancel", () => {
    render(<LoanManager loans={[]} onCreateLoan={jest.fn()} onRepayLoan={jest.fn()} onCancelLoan={jest.fn()} />);
    const newLoanButton = screen.getByText("New Loan");
    fireEvent.click(newLoanButton);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(screen.queryByText("Create New Loan")).not.toBeInTheDocument();
  });

  it("shows repay and cancel buttons for active loans", () => {
    render(
      <LoanManager
        loans={[mockActiveLoan]}
        onCreateLoan={jest.fn()}
        onRepayLoan={jest.fn()}
        onCancelLoan={jest.fn()}
      />
    );
    expect(screen.getByText("Repay")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onRepayLoan when repay is clicked", () => {
    const onRepay = jest.fn();
    render(
      <LoanManager
        loans={[mockActiveLoan]}
        onCreateLoan={jest.fn()}
        onRepayLoan={onRepay}
        onCancelLoan={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText("Repay"));
    expect(onRepay).toHaveBeenCalledWith("abc12345def67890");
  });

  it("calls onCancelLoan when cancel is clicked", () => {
    const onCancel = jest.fn();
    render(
      <LoanManager
        loans={[mockActiveLoan]}
        onCreateLoan={jest.fn()}
        onRepayLoan={jest.fn()}
        onCancelLoan={onCancel}
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledWith("abc12345def67890");
  });

  it("renders loading skeleton when loading with no loans", () => {
    const { container } = render(
      <LoanManager
        loans={[]}
        onCreateLoan={jest.fn()}
        onRepayLoan={jest.fn()}
        onCancelLoan={jest.fn()}
        isLoading={true}
      />
    );
    const shimmers = container.querySelectorAll(".animate-shimmer");
    expect(shimmers.length).toBeGreaterThan(0);
  });

  it("shows loan history section for completed loans", () => {
    render(
      <LoanManager
        loans={[mockCompletedLoan]}
        onCreateLoan={jest.fn()}
        onRepayLoan={jest.fn()}
        onCancelLoan={jest.fn()}
      />
    );
    // Loan History is collapsed by default, click to expand
    const historyButton = screen.getByText(/Loan History/);
    expect(historyButton).toBeInTheDocument();
  });
});
