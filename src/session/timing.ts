import type { PracticeSession, SessionEntry } from "../data/types";

/**
 * Session time is derived from wall-clock timestamps, never from counting timer
 * ticks: a throttled or suspended tab must not lose or invent practice time.
 * Every function here is pure so the whole lifecycle stays unit-testable.
 */

function clampDelta(fromIso: string, nowMs: number): number {
    const started = Date.parse(fromIso);
    if (!Number.isFinite(started)) {
        return 0;
    }
    // A backwards clock or timezone change must never subtract practised time.
    return Math.max(0, Math.round(nowMs - started));
}

export function isRunning(session: PracticeSession): boolean {
    return session.status === "active" && session.runningSince !== null;
}

export function entryElapsedMs(
    session: PracticeSession,
    index: number,
    nowMs: number,
): number {
    const entry = session.entries[index];
    if (!entry) {
        return 0;
    }
    const live =
        session.runningSince !== null && index === session.currentEntryIndex
            ? clampDelta(session.runningSince, nowMs)
            : 0;
    return entry.activeMs + live;
}

export function sessionElapsedMs(
    session: PracticeSession,
    nowMs: number,
): number {
    return session.entries.reduce(
        (total, _entry, index) => total + entryElapsedMs(session, index, nowMs),
        0,
    );
}

export function totalRecordedMs(entries: SessionEntry[]): number {
    return entries.reduce((total, entry) => total + entry.activeMs, 0);
}

/** Moves the time accumulated since `runningSince` into the current entry. */
export function flushRunningTime(
    session: PracticeSession,
    nowMs: number,
): PracticeSession {
    if (session.runningSince === null) {
        return session;
    }
    const delta = clampDelta(session.runningSince, nowMs);
    if (delta === 0) {
        return { ...session, runningSince: new Date(nowMs).toISOString() };
    }
    const entries = session.entries.map((entry, index) =>
        index === session.currentEntryIndex
            ? { ...entry, activeMs: entry.activeMs + delta }
            : entry,
    );
    return {
        ...session,
        entries,
        runningSince: new Date(nowMs).toISOString(),
    };
}

export function pauseSession(
    session: PracticeSession,
    nowMs: number,
): PracticeSession {
    if (session.runningSince === null) {
        return session;
    }
    const flushed = flushRunningTime(session, nowMs);
    return { ...flushed, runningSince: null };
}

export function resumeSession(
    session: PracticeSession,
    nowMs: number,
): PracticeSession {
    if (session.runningSince !== null) {
        return session;
    }
    return { ...session, runningSince: new Date(nowMs).toISOString() };
}

export function moveToEntry(
    session: PracticeSession,
    index: number,
    nowMs: number,
): PracticeSession {
    if (index < 0 || index >= session.entries.length) {
        return session;
    }
    const wasRunning = session.runningSince !== null;
    const flushed = pauseSession(session, nowMs);
    return {
        ...flushed,
        currentEntryIndex: index,
        runningSince: wasRunning ? new Date(nowMs).toISOString() : null,
    };
}

export function completeSession(
    session: PracticeSession,
    nowMs: number,
): PracticeSession {
    const paused = pauseSession(session, nowMs);
    const endedAt = new Date(nowMs).toISOString();
    return {
        ...paused,
        status: "completed",
        endedAt,
        updatedAt: endedAt,
    };
}

export function formatDuration(totalMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => value.toString().padStart(2, "0");
    return hours > 0
        ? `${hours}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(minutes)}:${pad(seconds)}`;
}

export function minutesFromMs(totalMs: number): number {
    return Math.round(totalMs / 60_000);
}
