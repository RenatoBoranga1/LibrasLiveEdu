import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const validateMediaUrl = vi.fn(() =>
  Promise.resolve({
    valid: true,
    url: "https://dicionario.ines.gov.br/public/media/palavras/videos/aprenderSm_Prog001.mp4",
    final_url: "https://dicionario.ines.gov.br/public/media/palavras/videos/aprenderSm_Prog001.mp4",
    status_code: 200,
    content_type: "video/mp4",
    content_length: 123456,
    media_type: "video",
    reason: "Mídia validada com sucesso.",
  })
);

vi.mock("@/features/auth/AuthProvider", () => ({
  useRequireRole: () => ({ loading: false }),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    validateMediaUrl,
  };
});

describe("media validate admin page", () => {
  it("renders and validates a video URL with preview", async () => {
    const { default: Page } = await import("@/app/admin/media-validate/page");
    render(<Page />);

    fireEvent.change(screen.getByLabelText(/url da mídia/i), {
      target: { value: "https://dicionario.ines.gov.br/public/media/palavras/videos/aprenderSm_Prog001.mp4" },
    });
    fireEvent.click(screen.getByRole("button", { name: /testar mídia/i }));

    await waitFor(() => expect(validateMediaUrl).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/validada: sim/i)).toBeInTheDocument();
    expect(screen.getByText(/video\/mp4/i)).toBeInTheDocument();
    expect(document.querySelector("video")).toHaveAttribute(
      "src",
      "https://dicionario.ines.gov.br/public/media/palavras/videos/aprenderSm_Prog001.mp4"
    );
  });
});
