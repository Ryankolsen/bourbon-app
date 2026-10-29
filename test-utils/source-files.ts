import fs from "fs";
import path from "path";
import * as ts from "typescript";

/**
 * Helpers for tests that scan the app's own source tree (brand guard,
 * placeholder-URL guard).
 */
export const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIRS = ["app", "components", "hooks", "lib"];

export type SourceFile = { path: string; content: string };
export type TextSpan = { line: number; text: string };

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

/** Every non-test .ts/.tsx file under app/, components/, hooks/ and lib/. */
export function loadSourceFiles(): SourceFile[] {
  return SOURCE_DIRS.flatMap((d) => walk(path.join(ROOT, d))).map((f) => ({
    path: path.relative(ROOT, f),
    content: fs.readFileSync(f, "utf8"),
  }));
}

const TEXT_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText,
]);

/**
 * The text a user could see: string literals, template text and JSX text,
 * each with its 1-based line. Comments and identifiers are never included.
 */
export function userFacingText(content: string): TextSpan[] {
  const sf = ts.createSourceFile("x.tsx", content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const spans: TextSpan[] = [];
  const visit = (node: ts.Node) => {
    if (TEXT_KINDS.has(node.kind)) {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      spans.push({ line: line + 1, text: (node as ts.LiteralLikeNode).text.trim() });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return spans;
}

/**
 * Named imports from `moduleName` whose imported (original) name is in
 * `names`, each with the 1-based line of the specifier. Aliases are resolved
 * to the original name; comments and strings are never matched.
 */
export function findBannedImports(
  content: string,
  moduleName: string,
  names: string[],
): { line: number; name: string }[] {
  const sf = ts.createSourceFile("x.tsx", content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: { line: number; name: string }[] = [];
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier) || stmt.moduleSpecifier.text !== moduleName) continue;
    const bindings = stmt.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const el of bindings.elements) {
      const name = (el.propertyName ?? el.name).text;
      if (!names.includes(name)) continue;
      const { line } = sf.getLineAndCharacterOfPosition(el.getStart(sf));
      hits.push({ line: line + 1, name });
    }
  }
  return hits;
}
