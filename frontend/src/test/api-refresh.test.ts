import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, listCategories, listSubjects } from "@/services/api";

const refreshedSession = {
  access_token: "new-access",
  refresh_token: "new-refresh",
  token_type: "bearer",
  user: {
    id: 2,
    name: "Curadora Demo",
    email: "curadora@example.com",
    role: "curator",
  },
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("automatic API token refresh", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/login");
    window.sessionStorage.setItem("libraslive.access_token", "expired-access");
    window.sessionStorage.setItem("libraslive.refresh_token", "valid-refresh");
  });

  it("refreshes once, stores the rotated tokens and retries the original request", async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      Promise.resolve(jsonResponse([]))
    );
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ code: "HTTP_401", message: "Token expirado." }, 401))
      .mockResolvedValueOnce(jsonResponse(refreshedSession))
      .mockResolvedValueOnce(jsonResponse([{ id: 1, name: "Tecnologia" }]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listSubjects()).resolves.toEqual([{ id: 1, name: "Tecnologia" }]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/api\/auth\/refresh$/);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ refresh_token: "valid-refresh" });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer expired-access");
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).has("Authorization")).toBe(false);
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get("Authorization")).toBe("Bearer new-access");
    expect(window.sessionStorage.getItem("libraslive.access_token")).toBe("new-access");
    expect(window.sessionStorage.getItem("libraslive.refresh_token")).toBe("new-refresh");
  });

  it("clears the session when refresh fails and never retries in a loop", async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      Promise.resolve(jsonResponse([]))
    );
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ code: "HTTP_401", message: "Token expirado." }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ code: "HTTP_401", message: "Refresh token inválido ou expirado." }, 401)
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listSubjects()).rejects.toMatchObject({
      message: "Refresh token inválido ou expirado.",
      status: 401,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(window.sessionStorage.getItem("libraslive.access_token")).toBeNull();
    expect(window.sessionStorage.getItem("libraslive.refresh_token")).toBeNull();
    expect(window.sessionStorage.getItem("libraslive.user")).toBeNull();
  });

  it("exposes the backend friendly error message and compatibility metadata", async () => {
    window.sessionStorage.clear();
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      Promise.resolve(
        jsonResponse(
          {
            code: "VALIDATION_ERROR",
            message: "Revise o campo informado.",
            field: "word",
            request_id: "request-123",
            detail: [{ loc: ["body", "word"] }],
          },
          422
        )
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await listCategories().catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      message: "Revise o campo informado.",
      code: "VALIDATION_ERROR",
      status: 422,
      field: "word",
      requestId: "request-123",
    });
  });
});
