import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const report = {
  status: "completed",
  total_items: 1,
  processed_items: 1,
  valid_videos: 1,
  invalid_videos: 0,
  updated_count: 1,
  created_count: 0,
  pending_count: 1,
  skipped_count: 0,
  error_count: 0,
  warnings: [],
  errors: [],
  items: [
    {
      word: "abacate",
      normalized_word: "abacate",
      generated_url: "https://dicionario.ines.gov.br/public/media/palavras/videos/abacateSm_Prog001.mp4",
      video_url: "https://dicionario.ines.gov.br/public/media/palavras/videos/abacateSm_Prog001.mp4",
      avatar_video_url: "https://dicionario.ines.gov.br/public/media/palavras/videos/abacateSm_Prog001.mp4",
      validated: true,
      http_status: 200,
      content_type: "video/mp4",
      can_use_avatar: true,
      detection_method: "ines_standard_pattern",
      status: "pending",
      reason: "Vídeo validado e vinculado ao sinal.",
      recommended_action: "Revisar fonte/licença e aprovar manualmente.",
    },
  ],
};

const diagnoseInesStandardVideo = vi.fn(() => Promise.resolve({ job_id: null, status: "completed", report }));
const fillSelectedInesStandardVideo = vi.fn(() => Promise.resolve({ job_id: 1, status: "completed", report }));
const fillPendingInesStandardVideo = vi.fn(() => Promise.resolve({ job_id: 2, status: "completed", report }));

vi.mock("@/features/auth/AuthProvider", () => ({
  useRequireRole: () => ({ loading: false, user: { id: 1, name: "Admin", email: "admin@example.com", role: "admin" } }),
  useAuth: () => ({ loading: false, isAuthenticated: true, user: { id: 1, name: "Admin", email: "admin@example.com", role: "admin" } }),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    diagnoseInesStandardVideo,
    fillPendingInesStandardVideo,
    fillSelectedInesStandardVideo,
  };
});

describe("INES standard video admin page", () => {
  it("renders and shows a validated preview", async () => {
    const { default: Page } = await import("@/app/admin/ines-standard-video/page");
    render(<Page />);

    expect(screen.getByRole("heading", { name: /preenchimento por padrão de vídeo ines/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /diagnosticar palavras/i }));

    await waitFor(() => expect(diagnoseInesStandardVideo).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/video\/mp4/i)).toBeInTheDocument();
    expect(document.querySelector("video")).toHaveAttribute(
      "src",
      "https://dicionario.ines.gov.br/public/media/palavras/videos/abacateSm_Prog001.mp4"
    );
  });
});
