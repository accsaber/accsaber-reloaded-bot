import { config } from "../config.js";
import type { ScoreResponse } from "../types/api.js";

function deriveWsUrl(): string {
  if (config.scoreFeed?.wsUrl) return config.scoreFeed.wsUrl;

  const base = config.api.baseUrl.replace(/\/v1\/?$/, "");
  const wsBase = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  return `${wsBase}/ws/scores`;
}

export class ScoreWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: ((score: ScoreResponse) => void)[] = [];
  private attempt = 0;
  private destroyed = false;
  private readonly url: string;
  private readonly baseInterval: number;
  private static readonly MAX_INTERVAL = 30_000;

  constructor() {
    this.url = deriveWsUrl();
    this.baseInterval = config.scoreFeed?.reconnectIntervalMs ?? 5000;
  }

  onScore(handler: (score: ScoreResponse) => void): void {
    this.handlers.push(handler);
  }

  connect(): void {
    if (this.destroyed) return;

    console.log(`[ScoreFeed] Connecting to ${this.url}`);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.attempt = 0;
      console.log("[ScoreFeed] WebSocket connected");
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(String(event.data));
    };

    this.ws.onclose = (event) => {
      console.log(
        `[ScoreFeed] WebSocket closed (code=${event.code}, reason=${event.reason})`
      );
      this.scheduleReconnect();
    };

    this.ws.onerror = (event) => {
      console.error("[ScoreFeed] WebSocket error:", event);
    };
  }

  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.ws = null;
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;

    const delay = Math.min(
      this.baseInterval * 2 ** this.attempt,
      ScoreWebSocket.MAX_INTERVAL
    );
    this.attempt++;
    console.log(`[ScoreFeed] Reconnecting in ${delay}ms (attempt ${this.attempt})`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
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
