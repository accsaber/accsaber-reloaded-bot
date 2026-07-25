import WebSocket from "ws";
import { config } from "../config.js";
import type { CrateFeedFrame } from "../types/api.js";

const CRATE_OPENED = "crate_opened";

function deriveWsUrl(): string {
  if (config.crateFeed?.wsUrl) return config.crateFeed.wsUrl;

  const base = config.api.baseUrl.replace(/\/v1\/?$/, "");
  const wsBase = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  return `${wsBase}/ws/crates`;
}

export class CrateWebSocket {
  private static readonly FAST_RETRY_LIMIT = 3;
  private static readonly FAST_RETRY_INTERVAL = 5_000;
  private static readonly SLOW_RETRY_INTERVAL = 60_000;
  private static readonly PING_INTERVAL = 30_000;
  private static readonly PONG_TIMEOUT = 10_000;

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: ((frame: CrateFeedFrame) => void)[] = [];
  private destroyed = false;
  private failedAttempts = 0;
  private readonly url: string;

  constructor() {
    this.url = deriveWsUrl();
  }

  onCrateOpened(handler: (frame: CrateFeedFrame) => void): void {
    this.handlers.push(handler);
  }

  connect(): void {
    if (this.destroyed) return;

    console.log(`[CrateFeed] Connecting to ${this.url}`);

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      console.error("[CrateFeed] Failed to construct WebSocket:", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      this.failedAttempts = 0;
      console.log("[CrateFeed] WebSocket connected");
      this.startHeartbeat();
    });

    this.ws.on("message", (data) => {
      this.handleMessage(data.toString());
    });

    this.ws.on("pong", () => {
      this.clearPongTimer();
    });

    this.ws.on("close", (code, reason) => {
      console.log(
        `[CrateFeed] WebSocket closed (code=${code}, reason=${reason.toString()})`
      );
      this.stopHeartbeat();
      this.ws = null;
      this.scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      console.error("[CrateFeed] WebSocket error:", err);
    });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
    }
    this.ws = null;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      try {
        this.ws.ping();
      } catch (err) {
        console.error("[CrateFeed] Failed to send ping:", err);
        return;
      }
      this.pongTimer = setTimeout(() => {
        console.warn("[CrateFeed] Pong timeout, terminating connection");
        this.ws?.terminate();
      }, CrateWebSocket.PONG_TIMEOUT);
    }, CrateWebSocket.PING_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.clearPongTimer();
  }

  private clearPongTimer(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    if (this.reconnectTimer) return;

    this.failedAttempts++;
    const isFastRetry = this.failedAttempts <= CrateWebSocket.FAST_RETRY_LIMIT;
    const delay = isFastRetry
      ? CrateWebSocket.FAST_RETRY_INTERVAL
      : CrateWebSocket.SLOW_RETRY_INTERVAL;

    console.log(
      `[CrateFeed] Reconnecting in ${delay}ms (attempt ${this.failedAttempts}, ${isFastRetry ? "fast" : "slow"})`
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleMessage(data: string): void {
    let frame: CrateFeedFrame;
    try {
      frame = JSON.parse(data) as CrateFeedFrame;
    } catch (err) {
      console.error("[CrateFeed] Failed to parse message:", err);
      return;
    }

    if (frame?.type !== CRATE_OPENED) return;
    if (!frame.player || !frame.open?.reward?.item) {
      console.warn("[CrateFeed] Dropping malformed crate_opened frame");
      return;
    }

    for (const handler of this.handlers) {
      try {
        handler(frame);
      } catch (err) {
        console.error("[CrateFeed] Handler error:", err);
      }
    }
  }
}
