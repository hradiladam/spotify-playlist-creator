/** @type {import('jest').Config} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	testMatch: ["<rootDir>/TESTS/**/*.test.ts?(x)"],
	setupFiles: ["<rootDir>/TESTS/polyfills/crypto.subtle.ts"],
	setupFilesAfterEnv: ["<rootDir>/TESTS/setup/jest.setup.ts"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"\\.module\\.css$": "identity-obj-proxy",
		"\\.(css|less|scss|sass)$": "<rootDir>/TESTS/setup/styleMock.js"
	},
	transform: {
		"^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }]
	},
	testPathIgnorePatterns: ["/node_modules/", "/e2e/"]
};
