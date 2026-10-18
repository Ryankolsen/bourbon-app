import fs from "fs";
import path from "path";

/**
 * Brand guard: the old name "BourbonVault" (and the misspelling
 * "BourbonDojo") must not appear anywhere a user can see it.
 *
 * Comments are ignored, and the match is case-sensitive so the lowercase
 * internal identifiers (`bourbonvault://`, `com.ryankolsen.bourbonvault`)
 * are allowed.
 */
const root = path.resolve(__dirname, "..");
const BANNED = /BourbonVault|BourbonDojo/;

type SourceFile = { path: string; content: string };
type Violation = { path: string; line: number; text: string };

/** Blank out `//` and block comments, keeping line structure intact. */
function stripComments(content: string): string {
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i + 1];
    if (quote) {
      out += c;
      if (c === "\\" && next !== undefined) {
        out += next;
        i++;
      } else if (c === quote) {
        quote = null;
      } else if (c === "\n" && quote !== "`") {
        // Unterminated ' or " (e.g. an apostrophe in JSX text): recover.
        quote = null;
      }
    } else if (c === "/" && next === "/") {
      while (i < content.length && content[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && next === "*") {
      i += 2;
      while (i < content.length && !(content[i] === "*" && content[i + 1] === "/")) {
        if (content[i] === "\n") out += "\n";
        i++;
      }
      i++;
    } else {
      if (c === '"' || c === "'" || c === "`") quote = c;
      out += c;
    }
  }
  return out;
}

export function findBrandViolations(files: SourceFile[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    stripComments(file.content)
      .split("\n")
      .forEach((text, idx) => {
        if (BANNED.test(text)) {
          violations.push({ path: file.path, line: idx + 1, text: text.trim() });
        }
      });
  }
  return violations;
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || entry.name === "node_modules" ? [] : walk(full);
    }
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function loadSource(): SourceFile[] {
  return ["app", "components", "hooks", "lib"]
    .flatMap((d) => walk(path.join(root, d)))
    .map((f) => ({
      path: path.relative(root, f),
      content: fs.readFileSync(f, "utf8"),
    }));
}

describe("findBrandViolations", () => {
  const scan = (content: string) => findBrandViolations([{ path: "x.tsx", content }]);

  it("flags BourbonVault in JSX text", () => {
    expect(scan("<Text>BourbonVault</Text>")).toHaveLength(1);
  });

  it("reports file and line", () => {
    expect(scan("a\nb\n<Text>BourbonVault</Text>")).toEqual([
      { path: "x.tsx", line: 3, text: "<Text>BourbonVault</Text>" },
    ]);
  });

  it("ignores line and block comments", () => {
    expect(scan("// BourbonVault comment")).toHaveLength(0);
    expect(scan("/* BourbonVault\n BourbonVault */ const a = 1;")).toHaveLength(0);
  });

  it("does not treat // inside a string as a comment", () => {
    expect(scan("const u = 'https://x.com/BourbonVault'")).toHaveLength(1);
  });

  it("flags BourbonDojo (no space)", () => {
    expect(scan("const s = 'Join BourbonDojo'")).toHaveLength(1);
  });

  it("allows lowercase internal identifiers", () => {
    expect(scan("scheme: 'bourbonvault'")).toHaveLength(0);
    expect(scan("'com.ryankolsen.bourbonvault'")).toHaveLength(0);
  });
});

describe("brand name in the real tree", () => {
  it("has no BourbonVault/BourbonDojo in user-facing source", () => {
    const violations = findBrandViolations(loadSource());
    const message = violations.map((v) => `${v.path}:${v.line}  ${v.text}`).join("\n");
    expect({ message, violations }).toEqual({ message: "", violations: [] });
  });

  const expo = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8")).expo;

  // Collect every `*UsageDescription` string anywhere under `expo`
  // (infoPlist, plugin configs, ...).
  function collectUsageDescriptions(node: unknown, found: [string, string][] = []) {
    if (Array.isArray(node)) {
      node.forEach((child) => collectUsageDescriptions(child, found));
    } else if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (key.endsWith("UsageDescription") && typeof value === "string") {
          found.push([key, value]);
        } else {
          collectUsageDescriptions(value, found);
        }
      }
    }
    return found;
  }

  const fields: [string, string][] = [
    ["expo.name", String(expo.name ?? "")],
    ["expo.description", String(expo.description ?? "")],
    ...collectUsageDescriptions(expo),
  ];

  it.each(fields)("app.json %s has no old brand name", (_name, value) => {
    expect(value).not.toMatch(BANNED);
  });
});
