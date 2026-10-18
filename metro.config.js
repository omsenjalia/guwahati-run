// The app imports the trip data and pure trip logic straight from backend/
// (one source of truth); keep Metro out of the backend's own build output.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  /backend[\/](node_modules|\.next)[\/].*/,
  /documents[\/].*/,
];
module.exports = config;
