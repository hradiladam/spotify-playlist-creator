// TESTS/logic/unit/format.test.ts

import { msToMinSec } from '../../../FRONTEND/src/utils/format';

// Should convert milliseconds to "M:SS" format
describe('msToMinSec', () => {
    test.each([
        [0, '0:00'],
        [61000, "1:01"],
        [3599999, "59:59"],
        [60000, "1:00"],
        [123456, "2:03"],
    ])("converts %d ms → %s", (input, expected) => {
        expect(msToMinSec(input)).toBe(expected)
    });
});

// npm test
// npx jest


