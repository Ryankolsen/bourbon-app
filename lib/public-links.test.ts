import { loadSourceFiles } from "@/test-utils/source-files";
import {
  LANDING_PAGE_URL,
  PRIVACY_POLICY_URL,
  WEBSITE_URL,
} from "./public-links";

describe("public links", () => {
  it("exports the website, landing page and privacy policy URLs", () => {
    expect(WEBSITE_URL).toBe("https://rko-design.netlify.app/");
    expect(LANDING_PAGE_URL).toBe("https://rko-design.netlify.app/bourbon-dojo");
    expect(PRIVACY_POLICY_URL).toBe(
      "https://rko-design.netlify.app/bourbon-dojo/privacy",
    );
  });

  it("leaves no placeholder store URLs in source", () => {
    const files = loadSourceFiles();
    expect(files.length).toBeGreaterThan(0);
    const offenders = files
      .filter(
        ({ content }) =>
          content.includes("id0000000000") ||
          content.includes("details?id=com.bourbonvault"),
      )
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});
