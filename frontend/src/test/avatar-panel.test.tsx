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

  it("does not render a static image as Avatar Libras media", () => {
    render(
      <AvatarPanel
        status="success"
        word="configuracao de mao"
        imageUrl="https://example.com/public/media/mao/cg02.jpg"
      />
    );

    expect(screen.queryByAltText(/sinal em libras/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/apenas apoio visual dispon/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/gif ou anima/i)).toBeInTheDocument();
  });
});
