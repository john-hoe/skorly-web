import { describe, expect, it } from "vitest";
import { scoreTopicPublishability } from "./filter";

describe("scoreTopicPublishability", () => {
  it("rejects live-stream/link spam", () => {
    const result = scoreTopicPublishability({
      title: "Watch Live Stream Argentina vs Algeria Link 1 Link 2",
      heat: 50,
      signalCount: 2,
      signals: [
        {
          source: "socialdata",
          title: "Watch live stream Argentina vs Algeria link 1 link 2",
        },
      ],
    });

    expect(result.route).toBe("reject");
    expect(result.reasons).toContain("spam/live-stream signal");
  });

  it("rejects odds and prediction-only topics", () => {
    const result = scoreTopicPublishability({
      title: "Argentina vs Algeria betting odds and prediction tips",
      heat: 20,
      signalCount: 2,
      signals: [
        { source: "rss", title: "Argentina vs Algeria odds preview" },
        { source: "socialdata", title: "Prediction tips for Argentina vs Algeria" },
      ],
    });

    expect(result.route).toBe("reject");
    expect(result.reasons).toContain("prediction/odds topic");
  });

  it("routes trusted multi-source result topics to write", () => {
    const result = scoreTopicPublishability({
      title: "Argentina beat Algeria 3-0 as Messi scores hat-trick",
      heat: 30,
      signalCount: 2,
      signals: [
        { source: "rss", title: "Argentina beat Algeria 3-0" },
        { source: "api_football", title: "Argentina 3-0 Algeria full-time" },
      ],
    });

    expect(result.route).toBe("write");
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.trustedSourceCount).toBe(2);
  });

  it("routes a single trusted result topic to brief_only", () => {
    const result = scoreTopicPublishability({
      title: "France beat Senegal 2-1",
      heat: 8,
      signalCount: 1,
      signals: [{ source: "rss", title: "France beat Senegal 2-1" }],
    });

    expect(result.route).toBe("brief_only");
    expect(result.reasons).toContain("single usable signal");
  });

  it("rejects single low-trust transfer rumors", () => {
    const result = scoreTopicPublishability({
      title: "Star striker linked with shock transfer",
      heat: 15,
      signalCount: 1,
      signals: [{ source: "zhibo8", title: "Star striker linked with shock transfer" }],
    });

    expect(result.route).toBe("reject");
    expect(result.reasons).toContain("single low-trust transfer rumour");
  });
});
