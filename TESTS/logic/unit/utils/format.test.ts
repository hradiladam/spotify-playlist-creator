// TESTS/logic/unit//utils/format.test.ts
// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { msToMinSec } from '@/utils/format';

describe('msToMinSec', () => {
	it.each([
		[0, '0:00'],
		[61000, '1:01'],
		[3599999, '59:59'],
		[60000, '1:00'],
		[123456, '2:03'],
	])('converts %d ms → %s', (input, expected) => {
		expect(msToMinSec(input)).toBe(expected);
	});
});



// npm run test
// npx vitest --ui
// npx vitest run TESTS/logic/unit/utils/format.test.ts



