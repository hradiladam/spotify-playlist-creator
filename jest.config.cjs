/** @type {import('jest').Config} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node", // use "jsdom" if you test DOM
	testMatch: ["<rootDir>/TESTS/**/*.test.ts"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/FRONTEND/src/$1"
	}
};
