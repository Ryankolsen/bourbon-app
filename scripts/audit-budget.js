#!/usr/bin/env node
/**
 * Fails when `npm audit` reports more high/critical findings than the budget.
 *
 * Kept out of the Jest suite because npm audit needs the registry, and the
 * pre-commit hook should work offline. Run it with `npm run audit:budget` as
 * part of each dependency-upgrade phase, and tighten the budget as SDK
 * upgrades remove findings.
 *
 * Remaining high findings (SDK 54): expo, @expo/cli, @expo/metro,
 * @expo/metro-config, metro, metro-config, metro-transform-worker,
 * image-size, postcss. All are build tooling and only fixable by moving to a
 * newer Expo SDK; see the "Plan: Dependency & Expo SDK Upgrade" issue.
 */
const { execSync } = require("child_process");

const BUDGET = { critical: 0, high: 9 };

let output;
try {
  output = execSync("npm audit --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
} catch (e) {
  // npm audit exits non-zero whenever it finds anything; the JSON is still on stdout.
  output = e.stdout;
}

const counts = JSON.parse(output).metadata.vulnerabilities;
const over = Object.entries(BUDGET).filter(([severity, max]) => counts[severity] > max);

console.log(
  `npm audit: ${counts.critical} critical (budget ${BUDGET.critical}), ` +
    `${counts.high} high (budget ${BUDGET.high}), ` +
    `${counts.moderate} moderate, ${counts.low} low`
);

if (over.length > 0) {
  console.error(`Over budget: ${over.map(([s]) => s).join(", ")}. Run \`npm audit\` for details.`);
  process.exit(1);
}
