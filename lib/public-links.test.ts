import fs from "fs";
import path from "path";
import {
  LANDING_PAGE_URL,
  PRIVACY_POLICY_URL,
  WEBSITE_URL,
} from "./public-links";

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIRS = ["app", "components", "hooks", "lib"];

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      files.push(...collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe("public links", () => {
  it("exports the website, landing page and privacy policy URLs", () => {
    expect(WEBSITE_URL).toBe("https://rko-design.netlify.app/");
    expect(LANDING_PAGE_URL).toBe("https://rko-design.netlify.app/bourbon-dojo");
    expect(PRIVACY_POLICY_URL).toBe(
      "https://rko-design.netlify.app/bourbon-dojo/privacy",
    );
  });

  it("leaves no placeholder store URLs in source", () => {
    const files = SOURCE_DIRS.flatMap((d) =>
      collectSourceFiles(path.join(ROOT, d)),
    );
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => {
      const text = fs.readFileSync(f, "utf8");
      return (
        text.includes("id0000000000") ||
        text.includes("details?id=com.bourbonvault")
      );
    });
    expect(offenders).toEqual([]);
  });
});
