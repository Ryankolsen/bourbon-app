const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Exclude test files from the bundle so Expo Router's require.context
// doesn't pull in @testing-library/react-native (which imports Node builtins).
config.resolver.blockList = [/.*\.(test|spec)\.(ts|tsx|js|jsx)$/];

module.exports = withNativeWind(config, { input: "./global.css" });
