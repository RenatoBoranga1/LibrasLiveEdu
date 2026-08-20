import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JoinClassPage from "@/app/join/[accessCode]/page";

const apiMocks = vi.hoisted(() => ({
  joinClass: vi.fn(),
  getClassByAccessCode: vi.fn(),
  getLiveSummaryByAccessCode: vi.fn(),
  saveWord: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ accessCode: "AULA-8F4K-29QX" }),
}));

vi.mock("@/services/api", () => apiMocks);

vi.mock("@/hooks/useLiveClass", () => ({
  useLiveClass: () => ({
    connected: true,
    reconnecting: false,
    connectionError: null,
    segments: [],
    cards: [],
    avatarItems: [],
    currentCaption: "",
    translation: { status: "waiting" },
    summary: null,
    liveSummary: null,
    injectDemo: vi.fn(),
  }),
}));

describe("student classroom page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    apiMocks.joinClass.mockResolvedValue({
      id: 1,
      title: "Aula de Ciências",
      subject_id: 2,
      access_code: "AULA-8F4K-29QX",
      status: "active",
    });
    apiMocks.getLiveSummaryByAccessCode.mockRejectedValue(new Error("Resumo ainda indisponível"));
    apiMocks.saveWord.mockResolvedValue({ id: 1, word: "aprender", status: "saved" });
  });

  it("prioritizes connection, live caption and Avatar Libras", async () => {
    render(<JoinClassPage />);

    expect(await screen.findByRole("heading", { name: "Aula de Ciências" })).toBeInTheDocument();
    expect(screen.getByText(/a legenda e os sinais aprovados serão atualizados/i)).toBeInTheDocument();
    const caption = screen.getByRole("heading", { name: /legenda ao vivo/i });
    const avatar = screen.getByRole("heading", { name: /avatar libras/i });
    expect(caption.compareDocumentPosition(avatar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("navigation", { name: /acessibilidade e ações/i })).toBeInTheDocument();
  });

  it("persists caption size and hides secondary content in focus mode", async () => {
    render(<JoinClassPage />);
    await screen.findByRole("heading", { name: "Aula de Ciências" });

    fireEvent.click(screen.getByRole("button", { name: /aumentar fonte da legenda/i }));
    await waitFor(() => expect(window.localStorage.getItem("libraslive.student.caption-size")).toBe("2"));

    const focusButton = screen.getByRole("button", { name: /alternar modo foco/i });
    fireEvent.click(focusButton);
    expect(focusButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: /histórico dos últimos trechos/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /legenda ao vivo/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /avatar libras/i })).toBeInTheDocument();
  });

  it("normalizes invalid stored preferences without losing viewport containment", async () => {
    window.localStorage.setItem("libraslive.student.caption-size", "999");
    window.localStorage.setItem("libraslive.student.high-contrast", "invalid");
    window.localStorage.setItem("libraslive.saved.AULA-8F4K-29QX", "not-json");

    render(<JoinClassPage />);
    await screen.findByRole("heading", { name: "Aula de Ciências" });

    await waitFor(() => expect(window.localStorage.getItem("libraslive.student.caption-size")).toBe("1"));
    const main = screen.getByRole("main");
    const caption = screen.getByRole("region", { name: /legenda ao vivo/i });
    const accessibilityBar = screen.getByRole("navigation", { name: /acessibilidade e ações/i });

    expect(main).toHaveClass("w-full", "max-w-full", "overflow-x-clip");
    expect(main).not.toHaveClass("high-contrast");
    expect(caption).toHaveAttribute("data-caption-size", "large");
    expect(caption).toHaveClass("max-w-full", "overflow-hidden");
    expect(accessibilityBar).toHaveClass("max-w-full", "overflow-hidden");
  });
});
