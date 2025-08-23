//src/utils/format.ts

// ---------- Utility formatting helpers ----------
//
// Small shared helpers extracted to keep UI components lean.

export const msToMinSec = (ms: number): string => {
	const minutes = Math.floor(ms / 60000);
	const seconds = Math.floor((ms % 60000) / 1000);
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
