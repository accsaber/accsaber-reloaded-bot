import type { ArBot } from "../client.js";
import interactionCreate from "./interaction-create.js";
import { messageReactionAdd, messageReactionRemove } from "./reaction-roles.js";
import ready from "./ready.js";

interface BotEvent {
  name: string;
  once?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (...args: any[]) => void | Promise<void>;
}

const events: BotEvent[] = [ready, interactionCreate, messageReactionAdd, messageReactionRemove];

export function registerEvents(client: ArBot): void {
  for (const event of events) {
    if (event.once) {
      client.once(event.name, (...args: unknown[]) => event.execute(...args));
    } else {
      client.on(event.name, (...args: unknown[]) => event.execute(...args));
    }
  }
}
