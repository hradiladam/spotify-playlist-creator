/** @type {import('jest').Config} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	testMatch: ["<rootDir>/TESTS/**/*.test.ts?(x)"],
	setupFiles: ["<rootDir>/TESTS/polyfills/crypto.subtle.ts"],          // polyfills first
	setupFilesAfterEnv: ["<rootDir>/TESTS/setup/jest.setup.ts"],         // RTL, MSW lifecycle
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/FRONTEND/src/$1",
		"\\.module\\.css$": "identity-obj-proxy",
		"\\.(css|less|scss|sass)$": "<rootDir>/TESTS/setup/styleMock.js"
	},
	transform: {
		"^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/FRONTEND/tsconfig.json" }]
	},
	testPathIgnorePatterns: ["/node_modules/", "/e2e/"]
};
