import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentJoinForm } from "@/components/StudentJoinForm";
import { AccessibleModeToggle } from "@/components/AccessibleModeToggle";
import { LiveCaption } from "@/components/LiveCaption";
import { StudentAccessibilityBar } from "@/components/StudentAccessibilityBar";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("student mobile entry", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("renders the aluno entry form with a large code field", () => {
    render(<StudentJoinForm />);
    expect(screen.getByRole("heading", { name: /entrar na aula/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/código da aula/i)).toBeInTheDocument();
  });

  it("routes to the join page when a secure code is entered", () => {
    render(<StudentJoinForm />);
    fireEvent.change(screen.getByLabelText(/código da aula/i), { target: { value: "AULA-8F4K-29QX" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar na aula/i }));
    expect(push).toHaveBeenCalledWith("/join/AULA-8F4K-29QX");
  });

  it("rejects invalid class codes", () => {
    render(<StudentJoinForm />);
    fireEvent.change(screen.getByLabelText(/código da aula/i), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar na aula/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("AULA-8F4K-29QX");
    expect(push).not.toHaveBeenCalled();
  });

  it("accepts AULA-4821 only in demo mode", () => {
    render(<StudentJoinForm />);
    fireEvent.change(screen.getByLabelText(/código da aula/i), { target: { value: "AULA-4821" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar na aula/i }));
    expect(push).not.toHaveBeenCalled();

    push.mockClear();
    render(<StudentJoinForm demoModeOverride />);
    const inputs = screen.getAllByLabelText(/código da aula/i);
    fireEvent.change(inputs[1], { target: { value: "AULA-4821" } });
    fireEvent.click(screen.getAllByRole("button", { name: /entrar na aula/i })[1]);
    expect(push).toHaveBeenCalledWith("/join/AULA-4821");
  });
});

describe("accessibility toggles", () => {
  it("exposes pressed state for large text and contrast", () => {
    const onLargeText = vi.fn();
    const onHighContrast = vi.fn();
    render(
      <AccessibleModeToggle
        highContrast={false}
        largeText
        onHighContrast={onHighContrast}
        onLargeText={onLargeText}
      />
    );
    expect(screen.getByRole("button", { name: /fonte grande/i })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /alto contraste/i }));
    expect(onHighContrast).toHaveBeenCalledTimes(1);
  });

  it("shows a clear live caption state and pause control", () => {
    const onTogglePause = vi.fn();
    render(<LiveCaption text="Aguardando a fala do professor..." status="waiting" onTogglePause={onTogglePause} />);

    expect(screen.getByRole("heading", { name: /legenda ao vivo/i })).toBeInTheDocument();
    expect(screen.getByText(/aguardando fala/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /pausar legenda ao vivo/i }));
    expect(onTogglePause).toHaveBeenCalledTimes(1);
  });

  it("offers large labeled classroom accessibility actions", () => {
    const onToggleFocus = vi.fn();
    render(
      <StudentAccessibilityBar
        highContrast={false}
        focusMode={false}
        avatarPaused={false}
        canSaveWord
        reviewHref="/review/AULA-TESTE"
        onDecreaseText={vi.fn()}
        onIncreaseText={vi.fn()}
        onToggleContrast={vi.fn()}
        onToggleFocus={onToggleFocus}
        onToggleAvatar={vi.fn()}
        onRepeatSignal={vi.fn()}
        onSaveWord={vi.fn()}
      />
    );

    expect(screen.getByRole("navigation", { name: /acessibilidade e ações/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aumentar fonte da legenda/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /alternar modo foco/i }));
    expect(onToggleFocus).toHaveBeenCalledTimes(1);
  });
});
