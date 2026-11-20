import { drawBody, loadOptionalImage, numberFmt, openFeedCard } from "./canvas-utils.js";

export interface ClanCardData {
  header: { name: string; country?: string | null; avatarUrl?: string | null };
  headerTitle: string;
  accent: string;
  icon: "target" | "trophy" | "flag" | "sparkle";
  coverUrl?: string | null;
  bannerUrl?: string | null;
  label: string;
  title: string;
  description?: string;
  value?: { amount: number; unit: string };
}

export async function renderClanCard(data: ClanCardData): Promise<Buffer> {
  const [{ ctx, finish }, cover] = await Promise.all([
    openFeedCard({
      user: data.header,
      title: data.headerTitle,
      titleColor: data.accent,
      backdropUrl: data.bannerUrl,
    }),
    loadOptionalImage(data.coverUrl),
  ]);

  return finish(
    drawBody(ctx, {
      art: { img: cover, icon: data.icon, color: data.accent },
      title: data.title,
      description: data.description,
      reward: data.value && { text: `${numberFmt(data.value.amount, 0)} ${data.value.unit}`, color: data.accent },
      lines: [[{ text: data.label }]],
    })
  );
}
