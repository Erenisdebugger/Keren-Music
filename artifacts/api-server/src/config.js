require('dotenv').config();
const path = require('path');

const jsonConfig = path.join(__dirname, 'config.json');

let config;
try {
  config = require(jsonConfig);
} catch (err) {
  console.error("❌ config.json not found or is invalid!", err.message);
  process.exit(1);
}

if (process.env.DISCORD_BOT_TOKEN) {
  config.token = process.env.DISCORD_BOT_TOKEN;
}

if (!config.token) {
  console.error("❌ No bot token found! Set DISCORD_BOT_TOKEN environment variable.");
  process.exit(1);
}

function parseBoolean(value) {
  if (typeof value === "string") {
    value = value.trim().toLowerCase();
  }
  switch (value) {
    case true:
    case "true":
      return true;
    default:
      return false;
  }
}

config.parseBoolean = parseBoolean;

module.exports = config;
