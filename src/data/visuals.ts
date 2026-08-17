/**
 * مولّد عناصر بصرية تجريدية (Abstract Visuals) تُستخدم كصور مؤقتة.
 *
 * تُنتج صور SVG مضمّنة (Data URI) — بدون أي طلبات خارجية وبدون ملفات ثقيلة.
 *
 * لاستبدالها بصور حقيقية لاحقًا:
 * في ملفات البيانات (`companies.ts` / `projects.ts` / `marquee.ts`)
 * استبدل قيمة `image` بمسار الصورة، مثال: `image: '/media/company-one.jpg'`
 * ولا حاجة لتعديل أي Component.
 */

export type VisualVariant = 'grid' | 'orbit' | 'waves' | 'blocks' | 'network' | 'arc';

export interface VisualOptions {
  /** يحدد التوزيع العشوائي الثابت للشكل */
  seed?: number;
  variant?: VisualVariant;
  /** لون التوهج الأساسي */
  tint?: string;
  width?: number;
  height?: number;
}

const TINTS = ['#B600A8', '#7621B0', '#BE4C00', '#4B6C8A', '#8E5AA8'];

/** مولّد أرقام شبه عشوائي ثابت النتيجة لنفس الـ seed */
function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function shapeLayer(variant: VisualVariant, rand: () => number, w: number, h: number): string {
  switch (variant) {
    case 'grid': {
      const lines: string[] = [];
      for (let i = 1; i < 7; i += 1) {
        const x = (w / 7) * i;
        lines.push(`<line x1="${x}" y1="0" x2="${x - 40}" y2="${h}" />`);
      }
      for (let i = 1; i < 5; i += 1) {
        const y = (h / 5) * i;
        lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" />`);
      }
      return `<g stroke="#D7E2EA" stroke-opacity="0.16" stroke-width="1">${lines.join('')}</g>`;
    }
    case 'orbit': {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const rings = [0.22, 0.36, 0.5, 0.64]
        .map(
          (r, i) =>
            `<ellipse cx="${cx}" cy="${cy}" rx="${(w * r).toFixed(1)}" ry="${(h * r * 0.78).toFixed(
              1,
            )}" transform="rotate(${(i * 18 - 24).toFixed(1)} ${cx} ${cy})" />`,
        )
        .join('');
      return `<g fill="none" stroke="#D7E2EA" stroke-opacity="0.2" stroke-width="1.2">${rings}</g>`;
    }
    case 'waves': {
      const paths: string[] = [];
      for (let i = 0; i < 7; i += 1) {
        const y = h * 0.2 + i * (h * 0.1);
        paths.push(
          `<path d="M0 ${y.toFixed(1)} C ${w * 0.28} ${(y - h * 0.16).toFixed(1)}, ${(
            w * 0.62
          ).toFixed(1)} ${(y + h * 0.14).toFixed(1)}, ${w} ${(y - h * 0.05).toFixed(1)}" />`,
        );
      }
      return `<g fill="none" stroke="#D7E2EA" stroke-opacity="0.22" stroke-width="1.2">${paths.join(
        '',
      )}</g>`;
    }
    case 'blocks': {
      const rects: string[] = [];
      for (let i = 0; i < 9; i += 1) {
        const bw = 40 + rand() * 110;
        const bh = 18 + rand() * 60;
        const x = rand() * (w - bw);
        const y = rand() * (h - bh);
        rects.push(
          `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(
            1,
          )}" height="${bh.toFixed(1)}" rx="10" fill-opacity="${(0.05 + rand() * 0.1).toFixed(3)}" />`,
        );
      }
      return `<g fill="#D7E2EA" stroke="#D7E2EA" stroke-opacity="0.18">${rects.join('')}</g>`;
    }
    case 'network': {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < 12; i += 1) {
        pts.push([rand() * w, rand() * h]);
      }
      const edges: string[] = [];
      pts.forEach(([x1, y1], i) => {
        pts.slice(i + 1).forEach(([x2, y2]) => {
          const d = Math.hypot(x2 - x1, y2 - y1);
          if (d < w * 0.3) {
            edges.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(
              1,
            )}" y2="${y2.toFixed(1)}" />`);
          }
        });
      });
      const dots = pts
        .map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" />`)
        .join('');
      return `<g stroke="#D7E2EA" stroke-opacity="0.2" stroke-width="1">${edges.join(
        '',
      )}</g><g fill="#D7E2EA" fill-opacity="0.55">${dots}</g>`;
    }
    case 'arc':
    default: {
      const cx = w * 0.5;
      const cy = h * 1.05;
      const arcs = [0.45, 0.6, 0.75, 0.9, 1.05]
        .map(
          (r) =>
            `<circle cx="${cx}" cy="${cy}" r="${(w * r * 0.5).toFixed(1)}" />`,
        )
        .join('');
      return `<g fill="none" stroke="#D7E2EA" stroke-opacity="0.18" stroke-width="1.2">${arcs}</g>`;
    }
  }
}

/** يُنشئ صورة SVG تجريدية على شكل Data URI جاهزة للاستخدام في `src` */
export function abstractVisual(options: VisualOptions = {}): string {
  const { seed = 1, variant = 'grid', width: w = 840, height: h = 540 } = options;
  const rand = rng(seed);
  const tint = options.tint ?? TINTS[seed % TINTS.length];
  const id = `v${seed}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs>
<linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#141414"/><stop offset="100%" stop-color="#0A0A0A"/>
</linearGradient>
<radialGradient id="glow${id}" cx="${(0.25 + rand() * 0.5).toFixed(2)}" cy="${(
    0.2 + rand() * 0.5
  ).toFixed(2)}" r="0.75">
<stop offset="0%" stop-color="${tint}" stop-opacity="0.55"/>
<stop offset="60%" stop-color="${tint}" stop-opacity="0.12"/>
<stop offset="100%" stop-color="${tint}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="glow2${id}" cx="${(0.6 + rand() * 0.35).toFixed(2)}" cy="${(
    0.55 + rand() * 0.4
  ).toFixed(2)}" r="0.6">
<stop offset="0%" stop-color="#D7E2EA" stop-opacity="0.18"/>
<stop offset="100%" stop-color="#D7E2EA" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#bg${id})"/>
<rect width="${w}" height="${h}" fill="url(#glow${id})"/>
<rect width="${w}" height="${h}" fill="url(#glow2${id})"/>
${shapeLayer(variant, rand, w, h)}
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="#D7E2EA" stroke-opacity="0.1"/>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}`;
}
