import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const login = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    login,
    user: null,
    loading: false,
    isAuthenticated: false,
  }),
}));

describe("home page", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })) as unknown as typeof fetch);
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
  });

  it("renders the inclusive classroom offer", async () => {
    vi.resetModules();
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /apoio inclusivo em sala de aula/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sou professor/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sou aluno/i })).toBeInTheDocument();
    expect(screen.getByText(/ferramenta de apoio pedagógico/i)).toBeInTheDocument();
  });

  it("does not show the demo card when demo mode is not explicitly enabled", async () => {
    vi.resetModules();
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);
    expect(screen.queryByRole("heading", { name: /demonstração/i })).not.toBeInTheDocument();
    expect(screen.getByText(/não substitui o intérprete humano/i)).toBeInTheDocument();
  });
});

describe("about page", () => {
  it("explains the social education project", async () => {
    vi.resetModules();
    const { default: AboutPage } = await import("@/app/about/page");
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /sobre o libraslive edu/i })).toBeInTheDocument();
    expect(screen.getAllByText(/não substitui intérprete humano/i).length).toBeGreaterThan(0);
  });
});

describe("login page", () => {
  beforeEach(() => {
    login.mockReset();
    replace.mockReset();
    window.history.replaceState({}, "", "/login");
  });

  it("does not prefill demo password when demo mode is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.resetModules();
    const { default: LoginPage } = await import("@/app/login/page");
    render(<LoginPage />);
    expect(screen.getByLabelText(/senha/i)).toHaveValue("");
    expect(screen.queryByText(/credenciais de demonstração/i)).not.toBeInTheDocument();
  });

  it.each([
    ["admin", "/admin"],
    ["curator", "/admin"],
    ["professor", "/teacher"],
    ["student", "/aluno"],
  ])("redirects a %s session to the correct area", async (role, destination) => {
    login.mockResolvedValueOnce({
      access_token: "access",
      refresh_token: "refresh",
      token_type: "bearer",
      user: { id: 1, name: "Usuário Demo", email: "demo@example.com", role },
    });
    const { default: LoginPage } = await import("@/app/login/page");
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "demo@example.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "LibrasLive#2026" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar com segurança/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(destination));
  });
});
