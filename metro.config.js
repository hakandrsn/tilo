const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push("mjs");
config.resolver.assetExts.push("lottie"); // Add .lottie support

module.exports = config;
