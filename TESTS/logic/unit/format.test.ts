// TESTS/logic/unit/format.test.ts

import { msToMinSec } from '../../../FRONTEND/src/utils/format';

describe('msToMinSec', () => {
    it('should convert milliseconds to "M:SS" format', () => {
        expect(msToMinSec(0)).toBe("0:00");
        expect(msToMinSec(61000)).toBe("1:01");
        expect(msToMinSec(3599999)).toBe("59:59");
        expect(msToMinSec(60000)).toBe("1:00");
        expect(msToMinSec(123456)).toBe("2:03");
    });
});


// npm test
// npx jest


