import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AvatarPanel } from "@/components/AvatarPanel";

describe("AvatarPanel", () => {
  it("renders a GIF when no video is available", () => {
    render(
      <AvatarPanel
        status="success"
        word="professor"
        avatarGifUrl="https://ifpr.edu.br/umuarama/libras-gifs/professor.gif"
      />
    );

    expect(screen.getByAltText(/sinal em libras para professor/i)).toHaveAttribute(
      "src",
      "https://ifpr.edu.br/umuarama/libras-gifs/professor.gif"
    );
    expect(screen.getByText("GIF")).toBeInTheDocument();
  });

  it("prioritizes video when video and GIF are available", () => {
    render(
      <AvatarPanel
        status="success"
        word="professor"
        avatarVideoUrl="https://example.com/professor.mp4"
        avatarGifUrl="https://example.com/professor.gif"
      />
    );

    expect(screen.getByLabelText(/sinal em libras/i)).toHaveAttribute(
      "src",
      "https://example.com/professor.mp4"
    );
    expect(screen.queryByAltText(/sinal em libras para professor/i)).not.toBeInTheDocument();
  });
});
