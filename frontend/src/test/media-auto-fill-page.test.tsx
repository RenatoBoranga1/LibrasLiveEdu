import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const report = {
  status: "completed",
  total_items: 1,
  processed_items: 1,
  media_found_count: 1,
  video_found_count: 0,
  gif_found_count: 1,
  image_found_count: 0,
  media_missing_count: 0,
  created_count: 0,
  updated_count: 1,
  pending_count: 1,
  skipped_count: 0,
  error_count: 0,
  warnings: [],
  errors: [],
  items: [
    {
      word: "aluno",
      normalized_word: "aluno",
      source_used: "ifpr",
      media_type: "gif",
      media_found: true,
      avatar_gif_url: "https://ifpr.edu.br/umuarama/libras-gifs/aluno.gif",
      status: "pending",
      reason: "GIF encontrado na fonte IFPR.",
      recommended_action: "Revisar e aprovar manualmente",
      warnings: [],
      errors: [],
    },
  ],
};

const diagnoseMediaAutoFill = vi.fn(() => Promise.resolve({ job_id: null, status: "completed", report }));
const startMediaAutoFillSelected = vi.fn(() => Promise.resolve({ job_id: 1, status: "completed", report }));
const startMediaAutoFillPending = vi.fn(() => Promise.resolve({ job_id: 2, status: "completed", report }));

vi.mock("@/features/auth/AuthProvider", () => ({
  useRequireRole: () => ({ loading: false }),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    diagnoseMediaAutoFill,
    startMediaAutoFillPending,
    startMediaAutoFillSelected,
  };
});

describe("media auto fill admin page", () => {
  it("renders the controlled media autofill routine", async () => {
    const { default: Page } = await import("@/app/admin/media-auto-fill/page");
    render(<Page />);

    expect(screen.getByRole("heading", { name: /preenchimento automático de mídias/i })).toBeInTheDocument();
    expect(screen.getByText(/não roda no build\/deploy\/startup/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /diagnosticar palavras/i })).toBeInTheDocument();
  });

  it("shows diagnostic report after clicking diagnosticar", async () => {
    const { default: Page } = await import("@/app/admin/media-auto-fill/page");
    render(<Page />);

    fireEvent.click(screen.getByRole("button", { name: /diagnosticar palavras/i }));

    await waitFor(() => expect(diagnoseMediaAutoFill).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/gif encontrado na fonte ifpr/i)).toBeInTheDocument();
    expect(screen.getByText(/abrir mídia/i)).toBeInTheDocument();
  });

  it("starts selected word fill from the page", async () => {
    const { default: Page } = await import("@/app/admin/media-auto-fill/page");
    render(<Page />);

    fireEvent.click(screen.getByRole("button", { name: /preencher palavras selecionadas/i }));

    await waitFor(() => expect(startMediaAutoFillSelected).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/revisar e aprovar manualmente/i)).toBeInTheDocument();
  });
});
