import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider, useAuth, useRequireRole } from "@/features/auth/AuthProvider";

const apiMocks = vi.hoisted(() => ({
  clearAuthTokens: vi.fn(),
  getMe: vi.fn(),
  getStoredAccessToken: vi.fn(),
  login: vi.fn(),
  logoutRequest: vi.fn(),
  register: vi.fn(),
  storeAuthTokens: vi.fn(),
}));

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/add-words",
  useRouter: () => ({ replace }),
}));

vi.mock("@/services/api", () => apiMocks);

const users = {
  admin: { id: 1, name: "Admin Demo", email: "admin@example.com", role: "admin" },
  curator: { id: 2, name: "Curadora Demo", email: "curadora@example.com", role: "curator" },
  professor: { id: 3, name: "Professor Demo", email: "professor@example.com", role: "professor" },
};

function responseFor(role: keyof typeof users) {
  return {
    access_token: `access-${role}`,
    refresh_token: `refresh-${role}`,
    token_type: "bearer" as const,
    user: users[role],
  };
}

function SessionHarness() {
  const auth = useAuth();
  return (
    <>
      <AppHeader />
      <button onClick={() => void auth.login("admin@example.com", "password")}>Login admin</button>
      <button onClick={() => void auth.login("curadora@example.com", "password")}>Login curator</button>
      <button onClick={() => void auth.login("professor@example.com", "password")}>Login professor</button>
      <button onClick={() => void auth.logout()}>Encerrar sessão</button>
    </>
  );
}

function CuratorArea() {
  const auth = useRequireRole(["admin", "curator"]);
  if (auth.loading) return <p>Carregando</p>;
  return <p>Cadastro de palavras liberado</p>;
}

function AdminOnlyArea() {
  const auth = useRequireRole(["admin"]);
  if (auth.loading) return <p>Carregando</p>;
  return <p>Ferramenta exclusiva</p>;
}

describe("frontend authentication session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    apiMocks.getStoredAccessToken.mockReturnValue(null);
    apiMocks.logoutRequest.mockResolvedValue({ status: "ok" });
    apiMocks.register.mockResolvedValue(responseFor("professor"));
    apiMocks.login.mockImplementation(({ email }: { email: string }) => {
      if (email.startsWith("admin")) return Promise.resolve(responseFor("admin"));
      if (email.startsWith("curadora")) return Promise.resolve(responseFor("curator"));
      return Promise.resolve(responseFor("professor"));
    });
  });

  it("updates the header immediately for admin and curator sessions without showing Entrar", async () => {
    render(
      <AuthProvider>
        <SessionHarness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getAllByRole("link", { name: /entrar/i }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole("button", { name: /login admin/i }));
    await waitFor(() => expect(screen.getAllByRole("link", { name: /administração/i }).length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /login curator/i }));
    await waitFor(() => expect(screen.getAllByRole("link", { name: /curadoria/i }).length).toBeGreaterThan(0));
    expect(screen.queryByRole("link", { name: /^entrar$/i })).not.toBeInTheDocument();
    expect(apiMocks.storeAuthTokens).toHaveBeenLastCalledWith(responseFor("curator"));
  });

  it("clears the previous role on logout before a different account logs in", async () => {
    render(
      <AuthProvider>
        <SessionHarness />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /login curator/i }));
    await waitFor(() => expect(screen.getAllByRole("link", { name: /curadoria/i }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole("button", { name: /encerrar sessão/i }));
    await waitFor(() => expect(screen.getAllByRole("link", { name: /entrar/i }).length).toBeGreaterThan(0));
    expect(apiMocks.clearAuthTokens).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /login professor/i }));
    await waitFor(() => expect(screen.getAllByRole("link", { name: /sala do professor/i }).length).toBeGreaterThan(0));
    expect(screen.queryByRole("link", { name: /curadoria/i })).not.toBeInTheDocument();
  });

  it("restores a curator session and permits the shared add-words route", async () => {
    apiMocks.getStoredAccessToken.mockReturnValue("stored-access");
    apiMocks.getMe.mockResolvedValue({ ...users.curator, role: "CURATOR" });

    render(
      <AuthProvider>
        <CuratorArea />
      </AuthProvider>
    );

    expect(await screen.findByText(/cadastro de palavras liberado/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalledWith("/unauthorized");
  });

  it("keeps an admin-only route unavailable to a curator", async () => {
    apiMocks.getStoredAccessToken.mockReturnValue("stored-access");
    apiMocks.getMe.mockResolvedValue(users.curator);

    render(
      <AuthProvider>
        <AdminOnlyArea />
      </AuthProvider>
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/unauthorized"));
  });
});
