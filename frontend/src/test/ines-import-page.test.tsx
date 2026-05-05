import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const validateInesMediaImport = vi.fn(() =>
  Promise.resolve({
    job_id: null,
    status: "validated",
    report: {
      total_items: 1,
      processed_items: 0,
      created_count: 0,
      updated_count: 0,
      approved_count: 0,
      pending_count: 0,
      skipped_count: 0,
      error_count: 0,
      errors: [],
      warnings: [],
    },
  })
);

vi.mock("@/features/auth/AuthProvider", () => ({
  useRequireRole: () => ({ loading: false }),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    validateInesMediaImport,
    startInesMediaImport: vi.fn(),
  };
});

describe("INES media import admin page", () => {
  it("renders the administrative import routine", async () => {
    const { default: Page } = await import("@/app/admin/import/ines-media/page");
    render(<Page />);

    expect(screen.getByRole("heading", { name: /importar vídeos autorizados do ines/i })).toBeInTheDocument();
    expect(screen.getByText(/não roda no build\/deploy/i)).toBeInTheDocument();
  });

  it("shows validation report after clicking validar", async () => {
    const { default: Page } = await import("@/app/admin/import/ines-media/page");
    render(<Page />);

    fireEvent.click(screen.getByRole("button", { name: /validar/i }));

    await waitFor(() => expect(validateInesMediaImport).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: /relatório/i })).toBeInTheDocument();
  });
});
