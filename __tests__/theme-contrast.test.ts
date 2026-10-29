import { contrastRatio } from "@/lib/contrast";
import { THEMES, type ThemeColors } from "@/lib/themes";
import { BELTS } from "@/lib/belt-config";

type Pair = { fg: keyof ThemeColors; bg: keyof ThemeColors; min: number };

const TEXT = 4.5;
const NON_TEXT = 3;

// Pairs are data: add a line to cover a new pair in every theme.
const PAIRS: Pair[] = [
  ...(["brand100", "brand300", "brand400"] as const).flatMap((fg) =>
    (["brand900", "brand800"] as const).map((bg) => ({ fg, bg, min: TEXT })),
  ),
  { fg: "brand300", bg: "brand700", min: TEXT },
  { fg: "surfaceText", bg: "brand700", min: TEXT },
  // Input fields: primary text and placeholder on bg-brand-700 / bg-brand-800
  { fg: "brand100", bg: "brand700", min: TEXT },
  { fg: "placeholderGroup", bg: "brand700", min: TEXT },
  { fg: "placeholderGroup", bg: "brand800", min: TEXT },
  // Selected chips: text-white on bg-brand-600; unselected: text-surface-text on bg-brand-700
  { fg: "white", bg: "brand600", min: TEXT },
  { fg: "tabActive", bg: "tabBar", min: TEXT },
  { fg: "tabInactive", bg: "tabBar", min: TEXT },
  { fg: "headerTint", bg: "brand900", min: TEXT },
  { fg: "white", bg: "toastSuccess", min: TEXT },
  { fg: "white", bg: "toastError", min: TEXT },
  // "Manage →" action text (12px, weight 500: normal text) renders on the toast pill
  { fg: "toastAction", bg: "toastSuccess", min: TEXT },
  { fg: "toastAction", bg: "toastError", min: TEXT },
  { fg: "white", bg: "answerCorrect", min: TEXT },
  { fg: "white", bg: "answerWrong", min: TEXT },
  { fg: "starFilled", bg: "brand800", min: NON_TEXT },
  { fg: "starEmpty", bg: "brand800", min: NON_TEXT },
];

const cases = THEMES.flatMap((theme) =>
  PAIRS.map((p) => [theme.id, p.fg, p.bg, p.min, theme.colors] as const),
);

describe("theme contrast", () => {
  it.each(cases)("%s: %s on %s >= %s", (id, fg, bg, min, colors) => {
    const ratio = contrastRatio(colors[fg], colors[bg]);
    if (ratio < min) {
      throw new Error(
        `${id}: ${fg} (${colors[fg]}) on ${bg} (${colors[bg]}) is ${ratio.toFixed(2)}:1, needs ${min}:1`,
      );
    }
  });
});

describe("belt badge contrast", () => {
  it.each(BELTS.map((b) => [b.name, b.iconColor, b.bgColor] as const))(
    "%s: iconColor %s on bgColor %s >= 3",
    (name, icon, bg) => {
      const ratio = contrastRatio(icon, bg);
      if (ratio < NON_TEXT) {
        throw new Error(`belt ${name}: ${icon} on ${bg} is ${ratio.toFixed(2)}:1, needs 3:1`);
      }
    },
  );
});
