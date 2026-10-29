import { loadSourceFiles, findBannedImports, type SourceFile } from "@/test-utils/source-files";

/**
 * Accessibility primitives guard (ADR-0001, ADR-0002): tap targets and text
 * inputs must go through the shared components, so the raw React Native
 * primitives may only be imported by those components.
 */
const BANNED = [
  "TouchableOpacity",
  "TouchableHighlight",
  "TouchableWithoutFeedback",
  "Pressable",
  "TextInput",
];

// Allow-list: each entry needs a one-line reason.
const ALLOWED = new Set([
  "components/AccessiblePressable.tsx", // the shared pressable wraps the raw primitive
  "components/LabeledTextInput.tsx", // the shared labeled input wraps the raw TextInput
]);

type Violation = { path: string; line: number; name: string };

function findViolations(files: SourceFile[]): Violation[] {
  return files
    .filter((file) => !ALLOWED.has(file.path))
    .flatMap((file) =>
      findBannedImports(file.content, "react-native", BANNED).map((hit) => ({
        path: file.path,
        ...hit,
      })),
    );
}

describe("findViolations", () => {
  const scan = (content: string, path = "x.tsx") => findViolations([{ path, content }]);

  it("flags a banned import with file, line and name", () => {
    expect(scan('import { TouchableOpacity } from "react-native";')).toEqual([
      { path: "x.tsx", line: 1, name: "TouchableOpacity" },
    ]);
  });

  it("flags a multi-line aliased import on its own line", () => {
    expect(
      scan('import {\n  View,\n  TextInput as RNTextInput,\n} from "react-native";'),
    ).toEqual([{ path: "x.tsx", line: 3, name: "TextInput" }]);
  });

  it("ignores names in comments and strings", () => {
    expect(scan("// TouchableOpacity\nconst a = 'Pressable';")).toEqual([]);
  });

  it("ignores other modules and unbanned names", () => {
    expect(scan('import { Pressable } from "some-lib";')).toEqual([]);
    expect(scan('import { View, Text } from "react-native";')).toEqual([]);
  });

  it("allows the shared components", () => {
    const src = 'import { Pressable, TextInput } from "react-native";';
    expect(scan(src, "components/AccessiblePressable.tsx")).toEqual([]);
    expect(scan(src, "components/LabeledTextInput.tsx")).toEqual([]);
  });
});

describe("accessibility primitives in the real tree", () => {
  it("are imported only by the shared components", () => {
    const violations = findViolations(loadSourceFiles());
    const message = violations.map((v) => `${v.path}:${v.line}  ${v.name}`).join("\n");
    expect({ message, violations }).toEqual({ message: "", violations: [] });
  });
});
