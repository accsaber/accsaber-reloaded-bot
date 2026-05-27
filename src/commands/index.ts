import { Collection } from "discord.js";
import type { Command } from "../client.js";
import assign from "./assign.js";
import get from "./get.js";
import register from "./register.js";
import supporters from "./supporters.js";
import update from "./update.js";

const commands = new Collection<string, Command>();

const all: Command[] = [assign, get, register, supporters, update];

for (const command of all) {
  commands.set(command.data.name, command);
}

export default commands;
