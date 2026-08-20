import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SequentialAvatarPlayer } from "@/components/SequentialAvatarPlayer";
import type { SignCard } from "@/types/live";

function card(overrides: Partial<SignCard>): SignCard {
  return {
    word: "aprender",
    normalizedWord: "aprender",
    status: "approved",
    ...overrides,
  };
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SequentialAvatarPlayer", () => {
  it("plays two video signs in arrival order", async () => {
    render(
      <SequentialAvatarPlayer
        items={[
          card({ word: "aprender", queueKey: "1", videoUrl: "https://example.com/aprender.mp4" }),
          card({ word: "abacate", normalizedWord: "abacate", queueKey: "2", videoUrl: "https://example.com/abacate.mp4" }),
        ]}
      />
    );

    expect(await screen.findByText("Sinal atual: aprender")).toBeInTheDocument();
    fireEvent.ended(screen.getByLabelText(/video do sinal em libras para aprender/i));
    expect(await screen.findByText("Sinal atual: abacate")).toBeInTheDocument();
  });

  it("does not enqueue signs without animated media", async () => {
    render(
      <SequentialAvatarPlayer
        items={[
          card({ word: "apoio", queueKey: "image", imageUrl: "https://example.com/apoio.jpg" }),
          card({ word: "sem midia", queueKey: "empty" }),
        ]}
      />
    );

    expect(screen.getByText("Sem sinal animado na fila")).toBeInTheDocument();
    expect(screen.queryByText(/Sinal atual: apoio/i)).not.toBeInTheDocument();
  });

  it("advances from GIF after the default duration", async () => {
    vi.useFakeTimers();
    render(
      <SequentialAvatarPlayer
        gifDurationMs={2500}
        items={[
          card({ word: "professor", normalizedWord: "professor", queueKey: "gif", avatarGifUrl: "https://example.com/professor.gif" }),
          card({ word: "livro", normalizedWord: "livro", queueKey: "video", videoUrl: "https://example.com/livro.mp4" }),
        ]}
      />
    );

    await flushEffects();
    expect(screen.getByText("Sinal atual: professor")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    await flushEffects();
    expect(screen.getByText("Sinal atual: livro")).toBeInTheDocument();
  });

  it("video errors skip to the next item", async () => {
    render(
      <SequentialAvatarPlayer
        items={[
          card({ word: "aprender", queueKey: "bad", videoUrl: "https://example.com/bad.mp4" }),
          card({ word: "abacate", normalizedWord: "abacate", queueKey: "ok", videoUrl: "https://example.com/ok.mp4" }),
        ]}
      />
    );

    expect(await screen.findByText("Sinal atual: aprender")).toBeInTheDocument();
    fireEvent.error(screen.getByLabelText(/video do sinal em libras para aprender/i));
    expect(await screen.findByText("Sinal atual: abacate")).toBeInTheDocument();
  });

  it("pause and resume control automatic GIF advancement", async () => {
    vi.useFakeTimers();
    render(
      <SequentialAvatarPlayer
        gifDurationMs={2500}
        items={[
          card({ word: "professor", normalizedWord: "professor", queueKey: "gif", avatarGifUrl: "https://example.com/professor.gif" }),
          card({ word: "livro", normalizedWord: "livro", queueKey: "video", videoUrl: "https://example.com/livro.mp4" }),
        ]}
      />
    );

    await flushEffects();
    expect(screen.getByText("Sinal atual: professor")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /pausar avatar/i }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("Sinal atual: professor")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retomar avatar/i }));
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    await flushEffects();
    expect(screen.getByText("Sinal atual: livro")).toBeInTheDocument();
  });

  it("ignores an immediate duplicate sign", async () => {
    render(
      <SequentialAvatarPlayer
        items={[
          card({ word: "aprender", normalizedWord: "aprender", queueKey: "a1", videoUrl: "https://example.com/a1.mp4" }),
          card({ word: "aprender", normalizedWord: "aprender", queueKey: "a2", videoUrl: "https://example.com/a2.mp4" }),
          card({ word: "abacate", normalizedWord: "abacate", queueKey: "b", videoUrl: "https://example.com/b.mp4" }),
        ]}
      />
    );

    expect(await screen.findByText("Sinal atual: aprender")).toBeInTheDocument();
    fireEvent.ended(screen.getByLabelText(/video do sinal em libras para aprender/i));
    expect(await screen.findByText("Sinal atual: abacate")).toBeInTheDocument();
  });

  it("clears the current signal and queued items", async () => {
    render(
      <SequentialAvatarPlayer
        items={[
          card({ word: "aprender", normalizedWord: "aprender", queueKey: "a1", videoUrl: "https://example.com/a1.mp4" }),
          card({ word: "abacate", normalizedWord: "abacate", queueKey: "b", videoUrl: "https://example.com/b.mp4" }),
        ]}
      />
    );

    expect(await screen.findByText("Sinal atual: aprender")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /limpar fila do avatar/i }));
    expect(screen.getByText("Sem sinal animado na fila")).toBeInTheDocument();
    expect(screen.getByText("Nenhum sinal aguardando.")).toBeInTheDocument();
  });
});

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}
