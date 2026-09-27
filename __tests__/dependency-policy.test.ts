import fs from "fs";
import path from "path";
import semver from "semver";

/**
 * Dependency policy guard.
 *
 * The policy below is the single place to edit when moving dependencies:
 * raise `targetSdk`/`minExpo` for an SDK upgrade and let the failing
 * assertions drive the work. See the "Plan: Dependency & Expo SDK Upgrade"
 * issue for the phased rollout.
 */
const POLICY = {
  targetSdk: 54,
  minExpo: "54.0.37",
  // Packages listed in package.json `expo.install.exclude`, with the reason
  // they are allowed to diverge from the version Expo expects.
  excluded: {
    "react-native-worklets":
      "Reanimated 4.1 requires worklets 0.8.x; Expo SDK 54 still suggests 0.5.1",
  } as Record<string, string>,
  // Libraries outside Expo's control, kept current within their major.
  // Targets respect `min-release-age=7` in .npmrc.
  minimums: {
    "@hookform/resolvers": "5.9.1",
    "@supabase/supabase-js": "2.116.0",
    "@tanstack/react-query": "5.102.8",
    nativewind: "4.2.7",
    "react-hook-form": "7.88.0",
    "react-native-worklets": "0.8.3",
    zod: "4.6.5",
  } as Record<string, string>,
};

const root = path.resolve(__dirname, "..");

function readJson(...segments: string[]) {
  return JSON.parse(fs.readFileSync(path.join(root, ...segments), "utf8"));
}

function installedVersion(pkg: string): string {
  return readJson("node_modules", pkg, "package.json").version;
}

const pkgJson = readJson("package.json");
const declared: Record<string, string> = {
  ...pkgJson.dependencies,
  ...pkgJson.devDependencies,
};
const expected: Record<string, string> = readJson(
  "node_modules",
  "expo",
  "bundledNativeModules.json"
);
const sdkControlled = Object.keys(declared).filter(
  (name) => expected[name] && !(name in POLICY.excluded)
);

describe("dependency policy", () => {
  it("is on the target Expo SDK at or above the minimum patch", () => {
    const expo = installedVersion("expo");
    expect(semver.major(expo)).toBe(POLICY.targetSdk);
    expect(semver.gte(expo, POLICY.minExpo)).toBe(true);
    expect(semver.gte(semver.minVersion(declared.expo)!, POLICY.minExpo)).toBe(true);
  });

  it.each(sdkControlled)(
    "%s matches the version the installed Expo SDK expects",
    (name) => {
      expect(semver.satisfies(installedVersion(name), expected[name])).toBe(true);
      expect(
        semver.satisfies(semver.minVersion(declared[name])!, expected[name])
      ).toBe(true);
    }
  );

  it.each(Object.entries(POLICY.minimums))(
    "%s is at least %s",
    (name, minimum) => {
      expect(semver.gte(installedVersion(name), minimum)).toBe(true);
      expect(semver.gte(semver.minVersion(declared[name])!, minimum)).toBe(true);
    }
  );

  it("documents a reason for every package excluded from Expo's version check", () => {
    const exclusions: string[] = pkgJson.expo?.install?.exclude ?? [];
    expect([...exclusions].sort()).toEqual(Object.keys(POLICY.excluded).sort());
  });

  it.each(fs.readdirSync(path.join(root, "patches")))(
    "patches/%s contains only source changes, no build artifacts",
    (file) => {
      const patch = fs.readFileSync(path.join(root, "patches", file), "utf8");
      const touched = [...patch.matchAll(/^diff --git a\/(\S+)/gm)].map((m) => m[1]);
      expect(touched.filter((p) => /\/build\//.test(p))).toEqual([]);
      expect(patch).not.toMatch(/^Binary files /m);
    }
  );

  it("pins react, react-test-renderer and the overrides to one version", () => {
    const react = declared.react;
    expect(declared["react-test-renderer"]).toBe(react);
    for (const name of ["react", "react-dom", "react-test-renderer"]) {
      expect(pkgJson.overrides[name]).toBe(react);
    }
    expect(installedVersion("react")).toBe(react);
    expect(installedVersion("react-test-renderer")).toBe(react);
  });
});
