import { describe, expect, it, vi } from "vitest";
import { login, normalizeApiBase } from "@/services/api";

describe("normalizeApiBase", () => {
  it("keeps a backend origin without an API suffix", () => {
    expect(normalizeApiBase("http://localhost:8000")).toBe("http://localhost:8000");
  });

  it("removes a trailing API segment and slash", () => {
    expect(normalizeApiBase("http://localhost:8000/api/")).toBe("http://localhost:8000");
  });

  it("removes repeated API suffixes so requests never contain /api/api", () => {
    expect(normalizeApiBase("http://localhost:8000/api/api/")).toBe("http://localhost:8000");
  });

  it("uses the local backend when the environment value is empty", () => {
    expect(normalizeApiBase(" ")).toBe("http://localhost:8000");
  });

  it("calls the login endpoint once without forwarding a token from the previous account", async () => {
    window.sessionStorage.setItem("libraslive.access_token", "stale-access");
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "new-access",
            refresh_token: "new-refresh",
            token_type: "bearer",
            user: { id: 2, name: "Curadora", email: "curadora@example.com", role: "curator" },
          }),
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await login({ email: "curadora@example.com", password: "password" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^http:\/\/localhost:8000\/api\/auth\/login$/);
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    window.sessionStorage.clear();
  });
});
