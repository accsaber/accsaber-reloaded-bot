import {
  BG_OVERLAY,
  FEED_BODY_TOP,
  FEED_LEFT,
  drawBigValue,
  drawBody,
  drawFlagIcon,
  drawRoundedRect,
  drawSparkleIcon,
  drawTargetIcon,
  drawTrophyIcon,
  loadOptionalImage,
  numberFmt,
  openFeedCard,
  roundRect,
} from "./canvas-utils.js";

export type ClanCardIcon = "target" | "trophy" | "flag" | "sparkle";

export interface ClanCardData {
  header: { name: string; country?: string | null; avatarUrl?: string | null };
  headerTitle: string;
  accent: string;
  chips?: { label: string; color: string }[];
  icon: ClanCardIcon;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  kicker: string;
  title: string;
  description?: string;
  value?: { amount: number; unit: string };
}

const ICONS = {
  target: drawTargetIcon,
  trophy: drawTrophyIcon,
  flag: drawFlagIcon,
  sparkle: drawSparkleIcon,
};

const ICON_SIZE = 56;

export async function renderClanCard(data: ClanCardData): Promise<Buffer> {
  const { accent } = data;
  const [cover, banner] = await Promise.all([
    loadOptionalImage(data.coverUrl),
    loadOptionalImage(data.bannerUrl),
  ]);
  const { ctx, finish } = await openFeedCard(210, {
    user: data.header,
    title: data.headerTitle,
    titleColor: accent,
    chips: data.chips,
    wash: accent,
    washAlpha: 0.18,
    backdrop: banner,
  });

  if (cover) {
    drawRoundedRect(ctx, FEED_LEFT, FEED_BODY_TOP, ICON_SIZE, ICON_SIZE, 8, BG_OVERLAY);
    ctx.save();
    roundRect(ctx, FEED_LEFT, FEED_BODY_TOP, ICON_SIZE, ICON_SIZE, 8);
    ctx.clip();
    ctx.drawImage(cover, FEED_LEFT, FEED_BODY_TOP, ICON_SIZE, ICON_SIZE);
    ctx.restore();
  } else {
    ICONS[data.icon](ctx, FEED_LEFT, FEED_BODY_TOP, ICON_SIZE, accent, { color: accent, blur: 14 });
  }

  drawBody(ctx, data.kicker, accent, data.title, data.description);
  if (data.value) {
    drawBigValue(ctx, FEED_LEFT, FEED_BODY_TOP + 70, numberFmt(data.value.amount, 0), data.value.unit, accent);
  }

  return finish();
}
