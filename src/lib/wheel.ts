import { segmentColorIndices } from './colors';
import { mod, targetRotation, winnerIndexAtRotation, easeOutQuint } from './spin';

export interface WheelPalette {
  segments: string[];
  inks: string[];
  rim: string;
  hub: string;
  hubInk: string;
  pointer: string;
  empty: string;
  highlight: string;
  font: string;
  serif: string;
}

interface SpinOptions {
  winner: number;
  durationMs: number;
  turns: number;
  reducedMotion: boolean;
  onTick: () => void;
  onDone: () => void;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, mid)}…`;
    if (ctx.measureText(candidate).width <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return low <= 0 ? '' : `${text.slice(0, low)}…`;
}

export class WheelView {
  private names: string[] = [];
  private rotation = 0;
  private highlight: number | null = null;
  private frame = 0;
  private spinning = false;
  private emptyLabel = '';
  private palette: WheelPalette | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  setNames(names: readonly string[]): void {
    this.names = names.slice();
    if (this.highlight !== null && (this.highlight < 0 || this.highlight >= this.names.length)) {
      this.highlight = null;
    }
    if (!this.spinning) this.draw();
  }

  setEmptyLabel(label: string): void {
    this.emptyLabel = label;
    if (!this.spinning && this.names.length === 0) this.draw();
  }

  setPalette(palette: WheelPalette): void {
    this.palette = palette;
    if (!this.spinning) this.draw();
  }

  setHighlight(index: number | null): void {
    this.highlight = index;
    if (!this.spinning) this.draw();
  }

  isSpinning(): boolean {
    return this.spinning;
  }

  spin(options: SpinOptions): void {
    const count = this.names.length;
    if (count === 0) return;
    cancelAnimationFrame(this.frame);
    this.spinning = true;
    this.highlight = null;
    const target = targetRotation(this.rotation, options.winner, count, options.turns);
    if (options.reducedMotion) {
      this.rotation = target;
      this.highlight = options.winner;
      this.spinning = false;
      this.draw();
      options.onDone();
      return;
    }

    const startRotation = this.rotation;
    const startTime = performance.now();
    let lastIndex = winnerIndexAtRotation(startRotation, count);
    let lastTick = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / Math.max(1, options.durationMs));
      this.rotation = startRotation + (target - startRotation) * easeOutQuint(progress);
      const index = winnerIndexAtRotation(this.rotation, count);
      if (index !== lastIndex && now - lastTick > 50) {
        lastTick = now;
        options.onTick();
      }
      lastIndex = index;
      this.draw();
      if (progress < 1) {
        this.frame = requestAnimationFrame(step);
        return;
      }
      this.rotation = target;
      this.highlight = options.winner;
      this.spinning = false;
      this.draw();
      options.onDone();
    };

    this.frame = requestAnimationFrame(step);
  }

  resize(): void {
    this.draw();
  }

  private draw(): void {
    const palette = this.palette;
    const canvas = this.canvas;
    const cssSize = Math.max(1, canvas.clientWidth || 640);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(1, Math.round(cssSize * dpr));
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx || !palette) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssSize, cssSize);

    const pointerH = 22;
    const margin = 10;
    const radius = Math.max(20, cssSize / 2 - pointerH - margin);
    const cx = cssSize / 2;
    const cy = cssSize / 2 + pointerH / 2;
    const names = this.names;
    const count = names.length;

    if (count === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = palette.rim;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = palette.empty;
      ctx.font = `500 18px ${palette.serif}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emptyLabel, cx, cy);
      this.drawPointer(ctx, palette, cx, cy, radius);
      return;
    }

    const slice = (Math.PI * 2) / count;
    const colorIndex = segmentColorIndices(count, palette.segments.length);
    const hub = Math.max(18, Math.min(36, radius * 0.11));

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    for (let index = 0; index < count; index += 1) {
      const start = -Math.PI / 2 + index * slice;
      const color = palette.segments[colorIndex[index] ?? 0] ?? palette.rim;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = palette.rim;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (this.highlight !== null && this.highlight < count) {
      const start = -Math.PI / 2 + this.highlight * slice + this.rotation;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 5, start, start + slice);
      ctx.strokeStyle = palette.highlight;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    this.drawLabels(ctx, palette, colorIndex, cx, cy, radius);
    this.drawHub(ctx, palette, cx, cy, hub);
    this.drawPointer(ctx, palette, cx, cy, radius);
  }

  private drawLabels(
    ctx: CanvasRenderingContext2D,
    palette: WheelPalette,
    colorIndex: number[],
    cx: number,
    cy: number,
    radius: number,
  ): void {
    const count = this.names.length;
    const slice = (Math.PI * 2) / count;
    const fontSize = count > 30 ? 12 : count > 16 ? 14 : 16;
    const band = slice * radius * 0.62;
    if (band < fontSize + 6) return;

    ctx.font = `600 ${fontSize}px ${palette.font}`;
    ctx.textBaseline = 'middle';
    const maxWidth = Math.max(28, radius * 0.42);

    for (let index = 0; index < count; index += 1) {
      const name = this.names[index];
      if (!name) continue;
      const mid = -Math.PI / 2 + (index + 0.5) * slice + this.rotation;
      const ink = palette.inks[colorIndex[index] ?? 0] ?? palette.rim;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.fillStyle = ink;
      const normalized = mod(mid, Math.PI * 2);
      const leftHalf = normalized > Math.PI / 2 && normalized < (Math.PI * 3) / 2;
      const label = ellipsize(ctx, name, maxWidth);
      if (!label) {
        ctx.restore();
        continue;
      }
      if (leftHalf) {
        ctx.rotate(Math.PI);
        ctx.textAlign = 'left';
        ctx.fillText(label, -radius + 18, 0);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(label, radius - 18, 0);
      }
      ctx.restore();
    }
  }

  private drawHub(
    ctx: CanvasRenderingContext2D,
    palette: WheelPalette,
    cx: number,
    cy: number,
    hub: number,
  ): void {
    ctx.beginPath();
    ctx.arc(cx, cy, hub, 0, Math.PI * 2);
    ctx.fillStyle = palette.hub;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.rim;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, hub * 0.18), 0, Math.PI * 2);
    ctx.fillStyle = palette.hubInk;
    ctx.fill();
  }

  private drawPointer(
    ctx: CanvasRenderingContext2D,
    palette: WheelPalette,
    cx: number,
    cy: number,
    radius: number,
  ): void {
    const tipY = cy - radius - 1;
    const baseY = tipY - 16;
    ctx.beginPath();
    ctx.moveTo(cx, tipY);
    ctx.lineTo(cx - 10, baseY);
    ctx.lineTo(cx + 10, baseY);
    ctx.closePath();
    ctx.fillStyle = palette.pointer;
    ctx.fill();
  }
}

export function readPalette(): WheelPalette {
  const style = getComputedStyle(document.documentElement);
  const value = (name: string) => style.getPropertyValue(name).trim();
  return {
    segments: [value('--seg-a'), value('--seg-b'), value('--seg-c')],
    inks: [value('--seg-a-ink'), value('--seg-b-ink'), value('--seg-c-ink')],
    rim: value('--ink'),
    hub: value('--bg'),
    hubInk: value('--accent'),
    pointer: value('--accent'),
    empty: value('--muted'),
    highlight: value('--highlight'),
    font: value('--sans').trim() || 'sans-serif',
    serif: value('--serif').trim() || 'serif',
  };
}
