import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const report = {
  status: "completed",
  source: "ines_full_catalog",
  letters_scanned: 1,
  entries_found: 2,
  videos_found: 1,
  images_found: 1,
  without_video: 1,
  imported_count: 0,
  skipped_count: 0,
  errors_count: 0,
  manifest_path: null,
  items: [
    {
      word: "abacate",
      letter: "A",
      media_type: "video",
      video_url: "https://dicionario.ines.gov.br/public/media/palavras/videos/abacateSm_Prog001.mp4",
      image_url: "https://dicionario.ines.gov.br/public/media/mao/cg01.jpg",
      http_status: 200,
      content_type: "video/mp4",
      can_use_avatar: true,
      validated: true,
      status: "manifest",
      detection_method: "site_crawl",
      reason: "Vídeo validado pelo crawler INES.",
    },
    {
      word: "apoio",
      letter: "A",
      media_type: "image",
      image_url: "https://dicionario.ines.gov.br/public/media/mao/cg02.jpg",
      can_use_avatar: false,
      validated: false,
      status: "manifest",
      detection_method: "support_image_only",
      reason: "Sem vídeo validado no catálogo INES.",
    },
  ],
  errors: [],
};

const scanInesCatalog = vi.fn(() => Promise.resolve({ job_id: 1, status: "completed", report, manifest: { entries: [] } }));
const validateInesCatalogManifest = vi.fn(() => Promise.resolve({ job_id: 2, status: "validated", report }));
const importInesCatalog = vi.fn(() => Promise.resolve({ job_id: 3, status: "completed", report: { ...report, imported_count: 1 } }));

vi.mock("@/features/auth/AuthProvider", () => ({
  useRequireRole: () => ({ loading: false, user: { id: 1, name: "Admin", email: "admin@example.com", role: "admin" } }),
  useAuth: () => ({ loading: false, isAuthenticated: true, user: { id: 1, name: "Admin", email: "admin@example.com", role: "admin" } }),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    importInesCatalog,
    scanInesCatalog,
    validateInesCatalogManifest,
  };
});

describe("INES catalog admin page", () => {
  it("renders scan, validation and import controls", async () => {
    const { default: Page } = await import("@/app/admin/ines-catalog/page");
    render(<Page />);

    expect(screen.getByRole("heading", { name: /catálogo completo ines/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /escanear catálogo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /validar manifesto/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /importar catálogo ines para curadoria/i })).toBeInTheDocument();
    expect(screen.getByText(/jpg\/png entram apenas como imagem de apoio/i)).toBeInTheDocument();
  });

  it("shows scan report with video and support image distinction", async () => {
    const { default: Page } = await import("@/app/admin/ines-catalog/page");
    render(<Page />);

    fireEvent.click(screen.getByRole("button", { name: /escanear catálogo/i }));

    await waitFor(() => expect(scanInesCatalog).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/palavras encontradas/i)).toBeInTheDocument();
    expect(screen.getByText(/vídeos válidos/i)).toBeInTheDocument();
    expect(screen.getByText(/imagens válidas/i)).toBeInTheDocument();
    expect(screen.getByText(/com vídeo/i)).toBeInTheDocument();
    expect(screen.getByText(/imagem é apenas apoio visual/i)).toBeInTheDocument();
    expect(screen.getByText(/video\/mp4/i)).toBeInTheDocument();
  });
});
