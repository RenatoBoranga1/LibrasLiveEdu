import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const validVideo = {
  valid: true,
  url: "https://dicionario.ines.gov.br/public/media/palavras/videos/abacateSm_Prog001.mp4",
  final_url: "https://dicionario.ines.gov.br/public/media/palavras/videos/abacateSm_Prog001.mp4",
  status_code: 200,
  content_type: "video/mp4",
  content_length: 123,
  media_type: "video",
  reason: "Mídia validada com sucesso.",
};

const validateMediaUrl = vi.fn(() => Promise.resolve(validVideo));
const createManualSign = vi.fn(() =>
  Promise.resolve({
    id: 1,
    word: "abacate",
    normalized_word: "abacate",
    status: "pending",
    video_url: validVideo.final_url,
  })
);

vi.mock("@/features/auth/AuthProvider", () => ({
  useRequireRole: () => ({ loading: false }),
}));

vi.mock("@/services/api", () => ({
  createManualSign,
  validateMediaUrl,
  getAdminStats: vi.fn(() =>
    Promise.resolve({
      total_signs: 0,
      approved_signs: 0,
      pending_signs: 0,
      rejected_signs: 0,
      review_signs: 0,
      import_jobs: 0,
      no_video_signs: 0,
      video_signs: 0,
      gif_signs: 0,
      pending_with_video_signs: 0,
      pending_with_media_signs: 0,
      approved_with_video_signs: 0,
      ready_for_avatar_signs: 0,
      needs_curation_signs: 0,
    })
  ),
  listCategories: vi.fn(() => Promise.resolve([])),
  listSubjects: vi.fn(() => Promise.resolve([])),
  listSigns: vi.fn(() => Promise.resolve([])),
  listSignAudit: vi.fn(() => Promise.resolve([])),
  curateSign: vi.fn(),
  rejectSign: vi.fn(),
  updateSignMedia: vi.fn(),
  importSampleCsv: vi.fn(),
  importSampleJson: vi.fn(),
  importViaApi: vi.fn(),
}));

describe("add words admin flow", () => {
  beforeEach(() => {
    createManualSign.mockClear();
    validateMediaUrl.mockClear();
    validateMediaUrl.mockResolvedValue(validVideo);
  });

  it("renders the route cards and INES link", async () => {
    const { default: Page } = await import("@/app/admin/add-words/page");
    render(<Page />);

    expect(screen.getByRole("heading", { name: /adicionar novas palavras/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /adicionar pelo padrão ines/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /usar preenchimento automático/i })).toHaveAttribute("href", "/admin/ines-standard-video");
    expect(screen.getByText(/qual opção devo escolher/i)).toBeInTheDocument();
  });

  it("shows the manual fields and creates a pending sign", async () => {
    const { default: Page } = await import("@/app/admin/add-words/page");
    render(<Page />);

    fireEvent.change(screen.getByRole("textbox", { name: /^palavra/i }), { target: { value: "abacate" } });
    fireEvent.change(screen.getByLabelText(/url do vídeo/i), { target: { value: validVideo.url } });
    fireEvent.click(screen.getByRole("button", { name: /salvar como pendente/i }));

    await waitFor(() => expect(validateMediaUrl).toHaveBeenCalled());
    await waitFor(() => expect(createManualSign).toHaveBeenCalled());
    expect(await screen.findByText(/foi salva como pendente de revisão/i)).toBeInTheDocument();
    expect(createManualSign).toHaveBeenCalledWith(expect.objectContaining({ word: "abacate", video_url: validVideo.url }));
  });

  it("shows invalid media errors without saving", async () => {
    validateMediaUrl.mockResolvedValueOnce({
      ...validVideo,
      valid: false,
      content_type: "text/html",
      media_type: "none",
      reason: "URL não retornou vídeo válido.",
    });
    const { default: Page } = await import("@/app/admin/add-words/page");
    render(<Page />);

    fireEvent.change(screen.getByRole("textbox", { name: /^palavra/i }), { target: { value: "escola" } });
    fireEvent.change(screen.getByLabelText(/url do vídeo/i), { target: { value: validVideo.url } });
    fireEvent.click(screen.getByRole("button", { name: /testar mídia/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/não será salva como avatar libras/i);
  });

  it("shows the main add words button on admin page", async () => {
    const { default: AdminPage } = await import("@/app/admin/page");
    render(<AdminPage />);

    expect(screen.getAllByRole("link", { name: /adicionar novas palavras/i })[0]).toHaveAttribute("href", "/admin/add-words");
    expect(screen.getByText(/escolha entre cadastro manual/i)).toBeInTheDocument();
  });
});
