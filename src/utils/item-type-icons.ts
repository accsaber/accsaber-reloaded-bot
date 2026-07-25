import { hexWithAlpha, type Ctx } from "./canvas-utils.js";

type IconDraw = (ctx: Ctx, s: number) => void;

function drawCrate(ctx: Ctx, s: number): void {
  ctx.lineWidth = 1.9 * s;
  ctx.beginPath();
  ctx.roundRect(3.5 * s, 8 * s, 17 * s, 13 * s, 2 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(2 * s, 4 * s, 20 * s, 5 * s, 1.6 * s);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(12 * s, 9.5 * s);
  ctx.lineTo(12 * s, 21 * s);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(4.5 * s, 15 * s);
  ctx.lineTo(19.5 * s, 15 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBadge(ctx: Ctx, s: number): void {
  ctx.lineWidth = 1.9 * s;
  ctx.beginPath();
  ctx.moveTo(12 * s, 2.2 * s);
  ctx.lineTo(20 * s, 5.2 * s);
  ctx.lineTo(20 * s, 11.4 * s);
  ctx.bezierCurveTo(20 * s, 16.6 * s, 16.6 * s, 20.4 * s, 12 * s, 21.8 * s);
  ctx.bezierCurveTo(7.4 * s, 20.4 * s, 4 * s, 16.6 * s, 4 * s, 11.4 * s);
  ctx.lineTo(4 * s, 5.2 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(12 * s, 7.4 * s);
  ctx.lineTo(13.5 * s, 11 * s);
  ctx.lineTo(17.2 * s, 11.3 * s);
  ctx.lineTo(14.3 * s, 13.8 * s);
  ctx.lineTo(15.2 * s, 17.4 * s);
  ctx.lineTo(12 * s, 15.4 * s);
  ctx.lineTo(8.8 * s, 17.4 * s);
  ctx.lineTo(9.7 * s, 13.8 * s);
  ctx.lineTo(6.8 * s, 11.3 * s);
  ctx.lineTo(10.5 * s, 11 * s);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTitle(ctx: Ctx, s: number): void {
  ctx.lineWidth = 1.8 * s;
  ctx.beginPath();
  ctx.roundRect(2.5 * s, 6.5 * s, 19 * s, 11 * s, 2.4 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(6 * s, 10.4 * s, 12 * s, 1.7 * s, 0.85 * s);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.roundRect(6 * s, 13.4 * s, 7.5 * s, 1.5 * s, 0.75 * s);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTheme(ctx: Ctx, s: number): void {
  ctx.lineWidth = 1.9 * s;
  ctx.beginPath();
  ctx.arc(12 * s, 12 * s, 9 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(12 * s, 12 * s, 9 * s, Math.PI * 0.5, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
}

function drawSaber(ctx: Ctx, s: number): void {
  ctx.save();
  ctx.translate(12 * s, 12 * s);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-12 * s, -12 * s);

  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.roundRect(9.9 * s, 1.6 * s, 4.2 * s, 13.2 * s, 1.4 * s);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.roundRect(10.7 * s, 2.2 * s, 2.6 * s, 12.2 * s, 0.7 * s);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.roundRect(10.7 * s, 15.4 * s, 2.6 * s, 5.8 * s, 0.8 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(10.4 * s, 14.7 * s);
  ctx.lineTo(13.6 * s, 14.7 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawPedestal(ctx: Ctx, s: number): void {
  ctx.lineWidth = 1.7 * s;

  ctx.beginPath();
  ctx.ellipse(12 * s, 8.6 * s, 6.4 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(12 * s, 8.6 * s, 3 * s, 0.9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.moveTo(9.6 * s, 10.4 * s);
  ctx.lineTo(8.6 * s, 17.6 * s);
  ctx.moveTo(14.4 * s, 10.4 * s);
  ctx.lineTo(15.4 * s, 17.6 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(6.2 * s, 17.8 * s, 11.6 * s, 2.6 * s, 0.6 * s);
  ctx.closePath();
  ctx.fill();
}

function drawStatistic(ctx: Ctx, s: number): void {
  ctx.lineWidth = 2 * s;
  const bars: [number, number][] = [
    [4.5, 12],
    [9.5, 6.5],
    [14.5, 14],
    [19.5, 9],
  ];
  for (const [x, top] of bars) {
    ctx.beginPath();
    ctx.moveTo(x * s, 19.4 * s);
    ctx.lineTo(x * s, top * s);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(2.6 * s, 21.4 * s);
  ctx.lineTo(21.4 * s, 21.4 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawPerk(ctx: Ctx, s: number): void {
  ctx.lineWidth = 1.9 * s;
  ctx.beginPath();
  ctx.roundRect(3.4 * s, 3.4 * s, 17.2 * s, 17.2 * s, 5 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  ctx.moveTo(12 * s, 7.6 * s);
  ctx.lineTo(12 * s, 16.4 * s);
  ctx.moveTo(7.6 * s, 12 * s);
  ctx.lineTo(16.4 * s, 12 * s);
  ctx.stroke();
}

function drawBorderShape(ctx: Ctx, s: number): void {
  const hexagon = (r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = 12 * s + Math.cos(a) * r * s;
      const py = 12 * s + Math.sin(a) * r * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  ctx.lineWidth = 2 * s;
  hexagon(9.4);
  ctx.stroke();

  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1.5 * s;
  hexagon(5.2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBorderColor(ctx: Ctx, s: number): void {
  ctx.lineWidth = 3.6 * s;
  ctx.beginPath();
  ctx.roundRect(3.4 * s, 3.4 * s, 17.2 * s, 17.2 * s, 4.4 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.roundRect(7.6 * s, 7.6 * s, 8.8 * s, 8.8 * s, 2.2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBackground(ctx: Ctx, s: number): void {
  ctx.lineWidth = 1.8 * s;
  ctx.beginPath();
  ctx.roundRect(2.6 * s, 4.6 * s, 18.8 * s, 14.8 * s, 2.4 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(8.4 * s, 9.6 * s, 1.9 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(4.2 * s, 17.6 * s);
  ctx.lineTo(10 * s, 11.6 * s);
  ctx.lineTo(13.6 * s, 15.2 * s);
  ctx.lineTo(16.4 * s, 12.6 * s);
  ctx.lineTo(19.8 * s, 17.6 * s);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawThumbnail(ctx: Ctx, s: number): void {
  ctx.lineWidth = 1.7 * s;
  ctx.beginPath();
  ctx.roundRect(2.6 * s, 3.4 * s, 18.8 * s, 17.2 * s, 2.4 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(2.6 * s, 8.2 * s);
  ctx.lineTo(21.4 * s, 8.2 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(8 * s, 12.6 * s, 1.6 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(5 * s, 18.4 * s);
  ctx.lineTo(10.2 * s, 13.6 * s);
  ctx.lineTo(13.4 * s, 16.6 * s);
  ctx.lineTo(15.8 * s, 14.4 * s);
  ctx.lineTo(19 * s, 18.4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawGeneric(ctx: Ctx, s: number): void {
  ctx.lineWidth = 1.9 * s;
  ctx.beginPath();
  ctx.moveTo(12 * s, 2.8 * s);
  ctx.lineTo(20.8 * s, 10.4 * s);
  ctx.lineTo(12 * s, 21.2 * s);
  ctx.lineTo(3.2 * s, 10.4 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(3.2 * s, 10.4 * s);
  ctx.lineTo(20.8 * s, 10.4 * s);
  ctx.moveTo(7.6 * s, 6.6 * s);
  ctx.lineTo(12 * s, 21.2 * s);
  ctx.moveTo(16.4 * s, 6.6 * s);
  ctx.lineTo(12 * s, 21.2 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

const ICONS: Record<string, IconDraw> = {
  crate: drawCrate,
  badge: drawBadge,
  title: drawTitle,
  theme: drawTheme,
  saber: drawSaber,
  item_pedestal: drawPedestal,
  statistic: drawStatistic,
  perk: drawPerk,
  profile_border_shape: drawBorderShape,
  profile_border_color: drawBorderColor,
  profile_background: drawBackground,
  profile_thumbnail_background: drawThumbnail,
};

export function drawItemTypeIcon(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  typeKey: string,
  color: string,
  glow: { color: string; blur: number } | null = null
): void {
  const draw = ICONS[typeKey] ?? drawGeneric;

  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    ctx.shadowColor = hexWithAlpha(glow.color, 0.75);
    ctx.shadowBlur = glow.blur;
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  draw(ctx, size / 24);
  ctx.restore();
}
