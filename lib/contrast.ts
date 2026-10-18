/** WCAG 2.x contrast helpers (pure). Used to verify share-card legibility. */

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG relative luminance of a #RRGGBB color. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1–21) between two #RRGGBB colors. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Blend a #RRGGBB color toward black by `amount` (0–1); returns #RRGGBB. */
export function blendTowardBlack(hex: string, amount: number): string {
  const out = parseHex(hex).map((v) =>
    Math.round(v * (1 - amount)).toString(16).padStart(2, '0'),
  );
  return `#${out.join('')}`;
}
