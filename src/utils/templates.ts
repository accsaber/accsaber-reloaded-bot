import { escapeMarkdown } from "discord.js";

export function renderTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : match
  );
}

export function feedSearchLine(
  ...groups: (string | number | null | undefined)[][]
): string {
  const text = groups
    .map((g) => g.filter((p) => p !== null && p !== undefined && p !== "").map((p) => escapeMarkdown(String(p))).join(" · "))
    .filter(Boolean)
    .join(" - ");
  return `-# ${text}`;
}
