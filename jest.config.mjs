import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/TESTS/**/*.test.ts?(x)"],

  setupFiles: [path.resolve(__dirname, "TESTS/setup/jest.polyfills.cjs")],
  setupFilesAfterEnv: [path.resolve(__dirname, "TESTS/setup/jest.setup.cjs")],

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.module\\.css$": "identity-obj-proxy",
    "\\.(css|less|scss|sass)$": "<rootDir>/TESTS/setup/styleMock.js"
  },

  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: path.resolve(__dirname, "tsconfig.jest.json"),
        useESM: true
      }
    ]
  },

  extensionsToTreatAsEsm: [".ts", ".tsx"],
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"]
};
