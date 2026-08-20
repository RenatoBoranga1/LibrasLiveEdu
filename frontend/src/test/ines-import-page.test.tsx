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
const diagnoseInesMediaImport = vi.fn(() =>
  Promise.resolve({
    status: "completed",
    total_items: 1,
    results: [
      {
        word: "bom dia",
        normalized_word: "bom dia",
        search_url: "https://dicionario.ines.gov.br/?q=bom+dia",
        http_status: 200,
        page_loaded: true,
        word_found_in_page: true,
        source_reference_url: "https://dicionario.ines.gov.br/?q=bom+dia",
        image_found: false,
        image_url: null,
        video_found: false,
        video_url: null,
        video_host_allowed: false,
        can_import: false,
        reason: "Página carregada, mas nenhuma URL de vídeo .mp4, .webm ou .mov foi encontrada no HTML.",
        warnings: ["Pode ser que o vídeo seja carregado por JavaScript/API."],
        errors: [],
      },
    ],
  })
);
const autoImportSelectedInesMedia = vi.fn(() =>
  Promise.resolve({
    job_id: 10,
    status: "completed",
    report: {
      total_items: 1,
      processed_items: 1,
      created_count: 0,
      updated_count: 1,
      approved_count: 0,
      pending_count: 1,
      skipped_count: 0,
      error_count: 0,
      video_found_count: 1,
      video_missing_count: 0,
      errors: [],
      warnings: [],
      items: [{ word: "bom dia", page_loaded: true, word_found: true, video_found: true, status: "pending", reason: "Vídeo encontrado.", recommended_action: "Pronto para revisar" }],
      manual_required: [],
    },
  })
);
const autoImportPendingInesMedia = vi.fn(() => autoImportSelectedInesMedia());

vi.mock("@/features/auth/AuthProvider", () => ({
  useRequireRole: () => ({ loading: false, user: { id: 1, name: "Admin", email: "admin@example.com", role: "admin" } }),
  useAuth: () => ({ loading: false, isAuthenticated: true, user: { id: 1, name: "Admin", email: "admin@example.com", role: "admin" } }),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    autoImportPendingInesMedia,
    autoImportSelectedInesMedia,
    diagnoseInesMediaImport,
    validateInesMediaImport,
    startInesMediaImport: vi.fn(),
  };
});

describe("INES media import admin page", () => {
  it("renders the administrative import routine", async () => {
    const { default: Page } = await import("@/app/admin/import/ines-media/page");
    render(<Page />);

    expect(screen.getByRole("heading", { name: /importar mídias autorizadas/i })).toBeInTheDocument();
    expect(screen.getByText(/não roda no build\/deploy/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /automação ines/i })).toBeInTheDocument();
  });

  it("shows validation report after clicking validar", async () => {
    const { default: Page } = await import("@/app/admin/import/ines-media/page");
    render(<Page />);

    fireEvent.click(screen.getByRole("button", { name: /validar/i }));

    await waitFor(() => expect(validateInesMediaImport).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: /relatório/i })).toBeInTheDocument();
  });

  it("shows diagnostic results after clicking diagnosticar", async () => {
    const { default: Page } = await import("@/app/admin/import/ines-media/page");
    render(<Page />);

    fireEvent.click(screen.getByRole("button", { name: /diagnosticar/i }));

    await waitFor(() => expect(diagnoseInesMediaImport).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: /resultado do diagnóstico/i })).toBeInTheDocument();
    expect(screen.getAllByText(/página carregada/i).length).toBeGreaterThan(0);
  });

  it("starts selected word automation from the admin page", async () => {
    const { default: Page } = await import("@/app/admin/import/ines-media/page");
    render(<Page />);

    fireEvent.click(screen.getByRole("button", { name: /importar selecionadas/i }));

    await waitFor(() => expect(autoImportSelectedInesMedia).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: /relatório/i })).toBeInTheDocument();
    expect(screen.getByText(/pronto para revisar/i)).toBeInTheDocument();
  });
});
