import type { Client, TextChannel } from "discord.js";
import WebSocket from "ws";
import { config } from "../config.js";

const FAST_RETRY_LIMIT = 3;
const FAST_RETRY_INTERVAL = 5_000;
const SLOW_RETRY_INTERVAL = 60_000;
const PING_INTERVAL = 30_000;
const PONG_TIMEOUT = 10_000;

export function feedChannel(
  client: Client,
  channelId: string
): () => Promise<TextChannel | null> {
  let channel: TextChannel | null = null;
  return async () => {
    if (channel) return channel;
    const ch = await client.channels.fetch(channelId);
    if (ch?.isTextBased()) channel = ch as TextChannel;
    return channel;
  };
}

function deriveWsUrl(path: string): string {
  const base = config.api.baseUrl.replace(/\/v1\/?$/, "");
  const wsBase = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  return `${wsBase}${path}`;
}

export class FeedWebSocket<T> {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: ((message: T) => void)[] = [];
  private destroyed = false;
  private failedAttempts = 0;
  private readonly name: string;
  private readonly url: string;
  private readonly parse: (raw: unknown) => T | null;

  constructor(
    name: string,
    path: string,
    wsUrl: string | null | undefined,
    parse: (raw: unknown) => T | null = (raw) => raw as T
  ) {
    this.name = name;
    this.url = wsUrl || deriveWsUrl(path);
    this.parse = parse;
  }

  onMessage(handler: (message: T) => void): void {
    this.handlers.push(handler);
  }

  connect(): void {
    if (this.destroyed) return;

    console.log(`[${this.name}] Connecting to ${this.url}`);

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      console.error(`[${this.name}] Failed to construct WebSocket:`, err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      this.failedAttempts = 0;
      console.log(`[${this.name}] WebSocket connected`);
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
        `[${this.name}] WebSocket closed (code=${code}, reason=${reason.toString()})`
      );
      this.stopHeartbeat();
      this.ws = null;
      this.scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      console.error(`[${this.name}] WebSocket error:`, err);
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
        console.error(`[${this.name}] Failed to send ping:`, err);
        return;
      }
      this.pongTimer = setTimeout(() => {
        console.warn(`[${this.name}] Pong timeout, terminating connection`);
        this.ws?.terminate();
      }, PONG_TIMEOUT);
    }, PING_INTERVAL);
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
    const isFastRetry = this.failedAttempts <= FAST_RETRY_LIMIT;
    const delay = isFastRetry ? FAST_RETRY_INTERVAL : SLOW_RETRY_INTERVAL;

    console.log(
      `[${this.name}] Reconnecting in ${delay}ms (attempt ${this.failedAttempts}, ${isFastRetry ? "fast" : "slow"})`
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleMessage(data: string): void {
    let raw: unknown;
    try {
      raw = JSON.parse(data);
    } catch (err) {
      console.error(`[${this.name}] Failed to parse message:`, err);
      return;
    }

    const message = this.parse(raw);
    if (message === null) return;

    for (const handler of this.handlers) {
      try {
        handler(message);
      } catch (err) {
        console.error(`[${this.name}] Handler error:`, err);
      }
    }
  }
}
