import { describe, expect, it } from "vitest";
import { normalizeApiBase } from "@/services/api";

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
});
