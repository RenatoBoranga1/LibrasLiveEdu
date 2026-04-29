import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const login = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ login }),
}));

describe("home page", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })) as unknown as typeof fetch);
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
  });

  it("renders the LibrasLive Edu title", async () => {
    vi.resetModules();
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /libraslive edu/i })).toBeInTheDocument();
  });

  it("does not show the demo card when demo mode is not explicitly enabled", async () => {
    vi.resetModules();
    const { default: HomePage } = await import("@/app/page");
    render(<HomePage />);
    expect(screen.queryByRole("heading", { name: /demonstração/i })).not.toBeInTheDocument();
    expect(screen.getByText(/ambiente de produção/i)).toBeInTheDocument();
  });
});

describe("login page", () => {
  it("does not prefill demo password when demo mode is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.resetModules();
    const { default: LoginPage } = await import("@/app/login/page");
    render(<LoginPage />);
    expect(screen.getByLabelText(/senha/i)).toHaveValue("");
    expect(screen.queryByText(/credenciais de demonstração/i)).not.toBeInTheDocument();
  });
});
