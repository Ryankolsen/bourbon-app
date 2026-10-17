import fs from "fs";
import path from "path";

const { expo } = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "app.json"), "utf8"),
);

describe("app.json", () => {
  it("uses Bourbon Dojo as the display name", () => {
    expect(expo.name).toBe("Bourbon Dojo");
  });

  it("names Bourbon Dojo in the photo library permission prompt", () => {
    expect(expo.ios.infoPlist.NSPhotoLibraryUsageDescription).toMatch(
      /^Bourbon Dojo uses your photo library/,
    );
  });

  it("leaves install-critical identifiers unchanged", () => {
    expect(expo.scheme).toBe("bourbonvault");
    expect(expo.ios.bundleIdentifier).toBe("com.ryankolsen.bourbonvault");
    expect(expo.android.package).toBe("com.ryankolsen.bourbondojo");
    expect(expo.slug).toBe("bourbon-app");
  });
});
