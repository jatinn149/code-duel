const tsConfig = require("./tsconfig.json");
const tsConfigPaths = require("tsconfig-paths");

tsConfigPaths.register({
  baseUrl: "./dist",
  paths: {
    "@/*": ["*"]
  }
});
