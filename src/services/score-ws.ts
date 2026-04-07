import { config } from "../config.js";
import type { ScoreResponse } from "../types/api.js";

function deriveWsUrl(): string {
  if (config.scoreFeed?.wsUrl) return config.scoreFeed.wsUrl;

  const base = config.api.baseUrl.replace(/\/v1\/?$/, "");
  const wsBase = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  return `${wsBase}/ws/scores`;
}

export class ScoreWebSocket {
  private static readonly FAST_RETRY_LIMIT = 3;
  private static readonly FAST_RETRY_INTERVAL = 5_000;
  private static readonly SLOW_RETRY_INTERVAL = 60_000;

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: ((score: ScoreResponse) => void)[] = [];
  private destroyed = false;
  private failedAttempts = 0;
  private readonly url: string;

  constructor() {
    this.url = deriveWsUrl();
  }

  onScore(handler: (score: ScoreResponse) => void): void {
    this.handlers.push(handler);
  }

  connect(): void {
    if (this.destroyed) return;

    console.log(`[ScoreFeed] Connecting to ${this.url}`);

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      console.error("[ScoreFeed] Failed to construct WebSocket:", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.failedAttempts = 0;
      console.log("[ScoreFeed] WebSocket connected");
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(String(event.data));
    };

    this.ws.onclose = (event) => {
      console.log(
        `[ScoreFeed] WebSocket closed (code=${event.code}, reason=${event.reason})`
      );
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = (event) => {
      console.error("[ScoreFeed] WebSocket error:", event);
      this.scheduleReconnect();
    };
  }

  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
    }
    this.ws = null;
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    if (this.reconnectTimer) return;

    this.failedAttempts++;
    const isFastRetry = this.failedAttempts <= ScoreWebSocket.FAST_RETRY_LIMIT;
    const delay = isFastRetry
      ? ScoreWebSocket.FAST_RETRY_INTERVAL
      : ScoreWebSocket.SLOW_RETRY_INTERVAL;

    console.log(
      `[ScoreFeed] Reconnecting in ${delay}ms (attempt ${this.failedAttempts}, ${isFastRetry ? "fast" : "slow"})`
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleMessage(data: string): void {
    try {
      const score = JSON.parse(data) as ScoreResponse;
      for (const handler of this.handlers) {
        try {
          handler(score);
        } catch (err) {
          console.error("[ScoreFeed] Handler error:", err);
        }
      }
    } catch (err) {
      console.error("[ScoreFeed] Failed to parse message:", err);
    }
  }
}
