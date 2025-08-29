// TESTS/ui/component/component-unit/PlaylistComposer.test.tsx
// @vitest-environment jsdom

/**
 * Realistic component tests for <PlaylistComposer /> using Vitest + Testing Library.
 * Focus: real user flows, not implementation details.
 * - Initial (no playlist) → "Add new playlist" shows form
 * - Validation: empty name alerts and does not call onCreateLocal
 * - Save: trims whitespace and calls onCreateLocal
 * - Clear button: cancels form and resets input
 * - Created state UI: shows name, count, and action buttons
 * - Save to Spotify: calls onSaveToSpotify
 * - Delete: confirm → calls onDeleteLocal; cancel → does not call
 */

import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { PlaylistComposer } from '@/components/PlaylistComposer/PlaylistComposer';


afterEach(() => {
    cleanup();
    vi.restoreAllMocks(); // restore alert/confirm spies between tests
});


describe('<PlaylistComposer /> realistic behavior', () => {
    // ---------- Helpers ----------
    const setup = (props: Partial<React.ComponentProps<typeof PlaylistComposer>> = {}) => {
    const defaults: React.ComponentProps<typeof PlaylistComposer> = {
        isCreated: false,
        localName: '',
        localCount: 0,
        onCreateLocal: vi.fn(),
        onDeleteLocal: vi.fn(),
        onSaveToSpotify: vi.fn(),
    };

    const merged = { ...defaults, ...props };                   // Merge default props with test-specific props (test props override defaults)  
    const utils = render(<PlaylistComposer {...merged} />);     // Render the component with those merged props and get Testing Library utilities
    return { ...utils, props: merged };                         // Return the render utilities plus the final props so the test can also inspect callbacks
    };


    // ---------- Initial state ----------
    test('shows "Add new playlist" button initially when no playlist exists', () => {
        setup({ isCreated: false });
        expect(screen.getByRole('button', { name: /add new playlist/i })).toBeInTheDocument();
        expect(screen.queryByPlaceholderText(/type playlist name/i)).not.toBeInTheDocument();
    });

    test('clicking "Add new playlist" reveals the name input and Save button', async () => {
        const { container } = setup({ isCreated: false });
        const user = userEvent.setup();

        await user.click(screen.getByRole('button', { name: /add new playlist/i }));

        const scope = within(container);
        expect(scope.getByPlaceholderText(/type playlist name/i)).toBeInTheDocument();
        expect(scope.getByRole('button', { name: /save playlist/i })).toBeInTheDocument();
    });


    // ---------- Validation ----------
    test('saving with empty or whitespace-only name shows alert and does not create', async () => {
        const onCreateLocal = vi.fn();
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {}); // silence alert

        const { container } = setup({ isCreated: false, onCreateLocal });
        const user = userEvent.setup();

        await user.click(screen.getByRole('button', { name: /add new playlist/i }));

        const input = within(container).getByPlaceholderText(/type playlist name/i) as HTMLInputElement;

        // Case 1: empty
        await user.clear(input);
        await user.click(screen.getByRole('button', { name: /save playlist/i }));
        expect(alertSpy).toHaveBeenCalledTimes(1);
        expect(onCreateLocal).not.toHaveBeenCalled();

        // Case 2: spaces only
        await user.type(input, '   ');
        await user.click(screen.getByRole('button', { name: /save playlist/i }));
        expect(alertSpy).toHaveBeenCalledTimes(2);
        expect(onCreateLocal).not.toHaveBeenCalled();
    });

    // ---------- Save name (trim) ----------
    test('saves valid name (trimmed) and hides form', async () => {
        const onCreateLocal = vi.fn();
        const { container } = setup({ isCreated: false, onCreateLocal });
        const user = userEvent.setup();

        await user.click(screen.getByRole('button', { name: /add new playlist/i }));

        const input = within(container).getByPlaceholderText(/type playlist name/i) as HTMLInputElement;
        await user.type(input, '  My Mix   ');
        await user.click(screen.getByRole('button', { name: /save playlist/i }));

        expect(onCreateLocal).toHaveBeenCalledTimes(1);
        expect(onCreateLocal).toHaveBeenCalledWith('My Mix'); // trimmed
        expect(screen.queryByPlaceholderText(/type playlist name/i)).not.toBeInTheDocument();
    });

    // ---------- Clear button behavior ----------
    test('clear button cancels the create form and resets input', async () => {
        const { container } = setup({ isCreated: false });
        const user = userEvent.setup();

        await user.click(screen.getByRole('button', { name: /add new playlist/i }));

        const input = within(container).getByPlaceholderText(/type playlist name/i) as HTMLInputElement;
        await user.type(input, 'Draft Name');

        const clearBtn = screen.getByRole('button', { name: /clear playlist name/i });
        await user.click(clearBtn);

        expect(screen.queryByPlaceholderText(/type playlist name/i)).not.toBeInTheDocument();
    });


    // ---------- Created state UI ----------
     test('shows created UI when isCreated=true (name, count, actions)', () => {
        setup({ isCreated: true, localName: 'My Mix', localCount: 3 });

        expect(screen.getByText(/new playlist/i)).toBeInTheDocument();
        expect(screen.getByText('My Mix')).toBeInTheDocument();
        expect(screen.getByText(/saved songs:\s*3/i)).toBeInTheDocument();

        // Action buttons visible
        expect(screen.getByRole('button', { name: /save to spotify/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete playlist/i })).toBeInTheDocument();

        // "Add new playlist" must not be visible once created
        expect(screen.queryByRole('button', { name: /add new playlist/i })).not.toBeInTheDocument();
    });


    // ---------- Save to Spotify action ----------
    test('clicking "Save to Spotify" triggers callback', async () => {
        const onSaveToSpotify = vi.fn();
        setup({ isCreated: true, localName: 'My Mix', localCount: 2, onSaveToSpotify });

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /save to spotify/i }));

        expect(onSaveToSpotify).toHaveBeenCalledTimes(1);
    });

    // ---------- Delete flow with confirm ----------
    test('confirming delete calls onDeleteLocal', async () => {
        const onDeleteLocal = vi.fn();
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        setup({ isCreated: true, localName: 'Trash Me', localCount: 1, onDeleteLocal });

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /delete playlist/i }));

        expect(onDeleteLocal).toHaveBeenCalledTimes(1);
    });


    // ---------- Delete flow with cancel ----------
    test('cancelling delete does not call onDeleteLocal', async () => {
        const onDeleteLocal = vi.fn();
        vi.spyOn(window, 'confirm').mockReturnValue(false);

        setup({ isCreated: true, localName: 'Keep Me', localCount: 5, onDeleteLocal });

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /delete playlist/i }));

        expect(onDeleteLocal).not.toHaveBeenCalled();
    });
});


// npm run test
// npx vitest --project ui run TESTS/ui/component/component-unit/PlaylistComposer.test.tsx