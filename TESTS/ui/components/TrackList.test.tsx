// TESTS/ui/components/TrackList.test.tsx
// @vitest-environment jsdom

/**
 * Practical component tests for <TrackList />.
 * - Renders track name, artists, and human-formatted duration
 * - Preserves order of tracks
 * - "Save" button calls onSaveTrack with the correct track
 * - Empty list renders no items/buttons
 */

import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { TrackList } from '@/components/TrackList';
import type { TrackSummary } from '@/api/spotify';

afterEach(() => {
  cleanup();
});

const makeTracks = (): TrackSummary[] => [
  {
    id: 't1',
    uri: 'spotify:track:t1',
    name: 'First Song',
    artists: 'Artist A, Artist B',
    duration_ms: 185000, // 3:05
  },
  {
    id: 't2',
    uri: 'spotify:track:t2',
    name: 'Second Song',
    artists: 'Artist C',
    duration_ms: 240000, // 4:00
  },
];

describe('<TrackList />', () => {
    test('renders each track with name, artists, and formatted duration', () => {
        const tracks = makeTracks();
        render(<TrackList tracks={tracks} />);

        // Names
        expect(screen.getByText('First Song')).toBeInTheDocument();
        expect(screen.getByText('Second Song')).toBeInTheDocument();

        // Artists
        expect(screen.getByText('Artist A, Artist B')).toBeInTheDocument();
        expect(screen.getByText('Artist C')).toBeInTheDocument();

        // Durations (based on msToMinSec)
        expect(screen.getByText('3:05')).toBeInTheDocument();
        expect(screen.getByText('4:00')).toBeInTheDocument();

        // Save buttons exist for each track
        const saveButtons = screen.getAllByRole('button', { name: /save/i });
        expect(saveButtons).toHaveLength(2);
    });

    test('clicking "Save" calls onSaveTrack with the correct track object (second item)', async () => {
        const tracks = makeTracks();
        const onSaveTrack = vi.fn();
        render(<TrackList tracks={tracks} onSaveTrack={onSaveTrack} />);

        const user = userEvent.setup();
        const saveButtons = screen.getAllByRole('button', { name: /save/i });

        // Click Save on the second track
        await user.click(saveButtons[1]);

        expect(onSaveTrack).toHaveBeenCalledTimes(1);
        expect(onSaveTrack).toHaveBeenCalledWith(tracks[1]);
    });

    test('renders nothing meaningful when list is empty (no Save buttons)', () => {
        render(<TrackList tracks={[]} />);

        // No Save buttons when there are no tracks
        expect(screen.queryAllByRole('button', { name: /save/i })).toHaveLength(0);
        // Optional: ensure no stray duration text
        expect(screen.queryByText('3:05')).not.toBeInTheDocument();
        expect(screen.queryByText('4:00')).not.toBeInTheDocument();
    });
});


// npm run test
// npx vitest --project logic-dom run TESTS/ui/components/TrackList.test.tsx