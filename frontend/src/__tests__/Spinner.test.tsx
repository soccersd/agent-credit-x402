import React from "react";
import { render, screen } from "@testing-library/react";
import { Spinner, SpinnerOverlay } from "@/components/ui/Spinner";

describe("Spinner", () => {
  it("renders with default size", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders with small size", () => {
    const { container } = render(<Spinner size="sm" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.contains("w-4")).toBe(true);
  });

  it("renders with large size", () => {
    const { container } = render(<Spinner size="lg" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.contains("w-10")).toBe(true);
  });

  it("applies custom className", () => {
    const { container } = render(<Spinner className="text-blue-500" />);
    const svg = container.querySelector("svg");
    expect(svg?.classList.contains("text-blue-500")).toBe(true);
  });
});

describe("SpinnerOverlay", () => {
  it("renders with default message", () => {
    render(<SpinnerOverlay />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders with custom message", () => {
    render(<SpinnerOverlay message="Fetching data..." />);
    expect(screen.getByText("Fetching data...")).toBeInTheDocument();
  });
});
