import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppHeader } from "@/components/AppHeader";
import { AvatarPanel } from "@/components/AvatarPanel";
import { LibrasLiveLogo } from "@/components/LibrasLiveLogo";
import { LibrasLiveMascot } from "@/components/LibrasLiveMascot";

describe("LibrasLive visual identity", () => {
  it("renders the Liva mascot with an accessible label", () => {
    render(<LibrasLiveMascot ariaLabel="Mascote Liva sinalizando em Libras" />);
    expect(screen.getByRole("img", { name: /mascote liva/i })).toBeInTheDocument();
  });

  it("renders the product logo text", () => {
    render(<LibrasLiveLogo />);
    expect(screen.getByText("LibrasLive Edu")).toBeInTheDocument();
    expect(screen.getByText(/educacao inclusiva ao vivo/i)).toBeInTheDocument();
  });

  it("shows the new logo in the app header", () => {
    render(<AppHeader />);
    expect(screen.getByRole("link", { name: /libraslive edu/i })).toBeInTheDocument();
  });

  it("uses the mascot as Avatar fallback when there is no animated media", () => {
    render(<AvatarPanel status="fallback" word="teste" />);
    expect(screen.getByRole("img", { name: /liva, mascote/i })).toBeInTheDocument();
    expect(screen.getByText(/avatar ser/i)).toBeInTheDocument();
  });
});
