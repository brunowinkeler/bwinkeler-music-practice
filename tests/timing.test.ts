import { describe, expect, it } from "vitest";
import {
    completeSession,
    entryElapsedMs,
    flushRunningTime,
    formatDuration,
    minutesFromMs,
    moveToEntry,
    pauseSession,
    resumeSession,
    sessionElapsedMs,
    totalRecordedMs,
} from "../src/session/timing";
import type { PracticeSession, SessionEntry } from "../src/data/types";

const start = Date.parse("2026-08-21T10:00:00.000Z");

function entry(id: string): SessionEntry {
    return {
        id,
        activityId: `activity-${id}`,
        activityTitleSnapshot: `Activity ${id}`,
        practiceAreaIdSnapshot: "area-technique",
        practiceAreaKeySnapshot: "technique",
        practiceAreaNameSnapshot: "technique",
        plannedSeconds: 600,
        activeMs: 0,
        targetBpm: null,
        startBpm: null,
        endBpm: null,
        note: "",
    };
}

function session(): PracticeSession {
    const iso = new Date(start).toISOString();
    return {
        id: "session-1",
        status: "active",
        routineId: "routine-1",
        routineNameSnapshot: "Weekday",
        startedAt: iso,
        endedAt: null,
        runningSince: iso,
        currentEntryIndex: 0,
        entries: [entry("a"), entry("b")],
        note: "",
        nextTimeNote: "",
        createdAt: iso,
        updatedAt: iso,
    };
}

describe("session timing", () => {
    it("derives elapsed time from wall-clock timestamps", () => {
        expect(sessionElapsedMs(session(), start + 65_000)).toBe(65_000);
    });

    it("stops accumulating while paused and resumes afterwards", () => {
        const paused = pauseSession(session(), start + 30_000);
        expect(sessionElapsedMs(paused, start + 90_000)).toBe(30_000);

        const resumed = resumeSession(paused, start + 90_000);
        expect(sessionElapsedMs(resumed, start + 100_000)).toBe(40_000);
    });

    it("keeps per-activity time separate when moving between steps", () => {
        const moved = moveToEntry(session(), 1, start + 20_000);
        const later = start + 50_000;
        expect(entryElapsedMs(moved, 0, later)).toBe(20_000);
        expect(entryElapsedMs(moved, 1, later)).toBe(30_000);
        expect(sessionElapsedMs(moved, later)).toBe(50_000);
    });

    it("keeps the paused state when navigating between steps", () => {
        const paused = pauseSession(session(), start + 10_000);
        const moved = moveToEntry(paused, 1, start + 20_000);
        expect(moved.runningSince).toBeNull();
        expect(sessionElapsedMs(moved, start + 60_000)).toBe(10_000);
    });

    it("never subtracts time when the clock moves backwards", () => {
        const flushed = flushRunningTime(session(), start - 60_000);
        expect(totalRecordedMs(flushed.entries)).toBe(0);
        // The anchor is re-based instead of recording a negative interval.
        expect(flushed.runningSince).toBe(
            new Date(start - 60_000).toISOString(),
        );
        expect(sessionElapsedMs(flushed, start - 60_000)).toBe(0);
    });

    it("recovers accumulated time after a reload that paused the draft", () => {
        const beforeReload = pauseSession(session(), start + 120_000);
        const reloaded: PracticeSession = { ...beforeReload };
        expect(sessionElapsedMs(reloaded, start + 3_600_000)).toBe(120_000);
    });

    it("completes a session as a paused snapshot with an end timestamp", () => {
        const finished = completeSession(session(), start + 45_000);
        expect(finished.status).toBe("completed");
        expect(finished.runningSince).toBeNull();
        expect(finished.endedAt).toBe(new Date(start + 45_000).toISOString());
        expect(totalRecordedMs(finished.entries)).toBe(45_000);
    });

    it("formats durations without shifting layout width", () => {
        expect(formatDuration(0)).toBe("00:00");
        expect(formatDuration(65_000)).toBe("01:05");
        expect(formatDuration(3_725_000)).toBe("1:02:05");
        expect(minutesFromMs(89_000)).toBe(1);
        expect(minutesFromMs(91_000)).toBe(2);
    });
});
