//TESTS/logic/unit/hooks/useDebouncedValue.test.ts
// @vitest-environment jsdom

// UNIT TEST for useDebouncedValue()
// ---------------------------------
// - Pure hook test: it don’t hit any APIs, just verify timing logic.
// - Runs inside jsdom because React hooks need a DOM-like environment.
// - Uses Vitest's fake timers to simulate the debounce delay without waiting in real time.


import { renderHook, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';


describe('useDebouncedValue', () => {
    // Enable fake timers before each test, and restore real timers after each test.
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    // Test that the hook returns the initial value immediately → doesn not delay initial input
    test('returns initial value immediately', () => {
        const hookResult = renderHook(() => useDebouncedValue('initial', 400));
        expect (hookResult.result.current).toBe('initial')
    });

    // Test that the hook updates the value after the specified delay → verifies debounce timing
    // When input changes from 'a' to 'b', the hook should be returning 'a' until the delay has passed
    test('waits for the full delay before updating', () => {
        const hook = renderHook(
            (props) => {
                return useDebouncedValue(props.value, 400);
            },
            { initialProps: { value: 'a' } }
        );

        hook.rerender({ value: 'b' }); // Change input to 'b'
        expect(hook.result.current).toBe('a'); // After change the value should still be 'a'

        // Fast-forward time by 399 ms
        act(() => vi.advanceTimersByTime(399));
        expect(hook.result.current).toBe('a'); // After 399 ms the value should still be 'a'

        // Fast-forward time by 1 ms
        act(() => vi.advanceTimersByTime(1));
        expect(hook.result.current).toBe('b'); // After 400 ms the value should be 'b'
    });
    
    //   If input changes 'x' → 'y' → 'z' within the debounce window,
    //   the hook should emit ONLY 'z' after the delay — not 'y'.
    test('collapses multiple quick changea into the latest value', () => {
        const { result, rerender } = renderHook(
            ({ value }: { value: string }) => useDebouncedValue(value, 400),
            { initialProps: { value: 'x' } }
        );

        // Change input to 'y', wait 100 ms
        rerender({ value: 'y' });
        act(() => vi.advanceTimersByTime(100));
       
        // Change input to 'z' at t-100ms, debounce resets
        rerender({ value: 'z' });

        // 399 ms since the LAST change → still 'x'
        act(() => vi.advanceTimersByTime(399)); 
        expect(result.current).toBe('x'); 
        
        // Wait 1 more ms (400ms total)
        act(() => vi.advanceTimersByTime(1));
        expect(result.current).toBe('z'); 
    });

    test('cleans up timers on unmount', () => {
        const { unmount } = renderHook(() => useDebouncedValue('a', 400));
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });
})

// npm run test
// npx vitest run TESTS/logic/unit/hooks/useDebouncedValue.test.ts

