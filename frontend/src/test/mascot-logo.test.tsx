import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { AvatarPanel } from "@/components/AvatarPanel";
import { LibrasLiveIcon } from "@/components/LibrasLiveIcon";
import { LibrasLiveLogo } from "@/components/LibrasLiveLogo";
import { LibrasLiveWelcomeVisual } from "@/components/brand/LibrasLiveWelcomeVisual";
import { HeroInclusiveClassroom } from "@/components/illustrations/HeroInclusiveClassroom";

describe("LibrasLive visual identity", () => {
  it("renders the product logo text", () => {
    render(<LibrasLiveLogo />);
    expect(screen.getByText("LibrasLive Edu")).toBeInTheDocument();
    expect(screen.getByText(/educa[cç][aã]o inclusiva ao vivo/i)).toBeInTheDocument();
  });

  it("renders the realistic welcome visual accessibly", () => {
    render(<LibrasLiveWelcomeVisual />);
    expect(screen.getByRole("img", { name: /representante visual do libraslive edu/i })).toBeInTheDocument();
  });

  it("renders the original brand symbol with an accessible name", () => {
    render(<LibrasLiveIcon title="Símbolo institucional LibrasLive" />);
    expect(screen.getByRole("img", { name: /símbolo institucional/i })).toBeInTheDocument();
  });

  it("renders the inclusive classroom illustration accessibly", () => {
    render(<HeroInclusiveClassroom title="Cena inclusiva em sala de aula" />);
    expect(screen.getByRole("img", { name: /cena inclusiva/i })).toBeInTheDocument();
  });

  it("shows the new logo in the app header", () => {
    render(<AppHeader />);
    expect(screen.getByRole("link", { name: /libraslive edu/i })).toBeInTheDocument();
  });

  it("uses the institutional welcome visual as Avatar fallback when there is no animated media", () => {
    render(<AvatarPanel status="fallback" word="teste" />);
    expect(screen.getByRole("img", { name: /representante visual do libraslive edu/i })).toBeInTheDocument();
    expect(screen.getByText(/não representa um sinal ou tradução/i)).toBeInTheDocument();
    expect(screen.getAllByText(/avatar ser/i).length).toBeGreaterThan(0);
  });

  it("renders the institutional footer disclaimer and links", () => {
    render(<AppFooter />);
    expect(screen.getByText(/não substitui intérprete humano/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /direitos de dados/i })).toHaveAttribute("href", "/data-rights");
  });
});
