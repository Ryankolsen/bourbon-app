import fs from "fs";
import path from "path";
import { loadSourceFiles, ROOT, userFacingText, type SourceFile } from "@/test-utils/source-files";

/**
 * Brand guard: the old name "BourbonVault" (and the misspelling
 * "BourbonDojo") must not appear anywhere a user can see it.
 *
 * Only string, template and JSX text is checked (never comments or
 * identifiers), and the match is case-sensitive so the lowercase
 * internal identifiers (`bourbonvault://`, `com.ryankolsen.bourbonvault`)
 * are allowed.
 */
const BANNED = /BourbonVault|BourbonDojo/;

type Violation = { path: string; line: number; text: string };

function findBrandViolations(files: SourceFile[]): Violation[] {
  return files.flatMap((file) =>
    userFacingText(file.content)
      .filter((span) => BANNED.test(span.text))
      .map((span) => ({ path: file.path, ...span })),
  );
}

describe("findBrandViolations", () => {
  const scan = (content: string) => findBrandViolations([{ path: "x.tsx", content }]);

  it("flags BourbonVault in JSX text", () => {
    expect(scan("<Text>BourbonVault</Text>")).toHaveLength(1);
  });

  it("reports file and line", () => {
    expect(scan("const a = 1;\nconst b = 2;\nconst c = <Text>BourbonVault</Text>;")).toEqual([
      { path: "x.tsx", line: 3, text: "BourbonVault" },
    ]);
  });

  it("ignores line and block comments", () => {
    expect(scan("// BourbonVault comment")).toHaveLength(0);
    expect(scan("/* BourbonVault\n BourbonVault */ const a = 1;")).toHaveLength(0);
  });

  it("does not treat // inside a string as a comment", () => {
    expect(scan("const u = 'https://x.com/BourbonVault'")).toHaveLength(1);
  });

  it("does not treat // inside JSX text as a comment", () => {
    expect(scan("<Text>a // BourbonVault</Text>")).toHaveLength(1);
  });

  it("flags template literal text", () => {
    expect(scan("const s = `Join ${x} BourbonVault`")).toHaveLength(1);
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
    const violations = findBrandViolations(loadSourceFiles());
    const message = violations.map((v) => `${v.path}:${v.line}  ${v.text}`).join("\n");
    expect({ message, violations }).toEqual({ message: "", violations: [] });
  });

  const expo = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf8")).expo;

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
