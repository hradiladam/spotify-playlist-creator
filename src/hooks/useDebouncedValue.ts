//src/hooks/useDebouncedValue.ts

// ---------- Helper hook: debounce ----------
//
// useDebouncedValue
// - Returns the "value" but delayed until the user stops typing.
// - Prevents spamming the API on every keystroke.
// - Example: if delay=400, we only update after 400ms of no changes.

import { useEffect, useState } from "react";

export const useDebouncedValue = (value: string, delay: number): string => {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => { setDebouncedValue(value); }, delay);
		return () => clearTimeout(timer);
	}, [value, delay]);

	return debouncedValue;
};
