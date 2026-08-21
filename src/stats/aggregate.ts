import type { PracticeSession, WeekStartDay } from "../data/types";
import { totalRecordedMs } from "../session/timing";

/**
 * Calendar aggregation works on local civil days built with the Date
 * constructor, so daylight-saving transitions cannot shift a session into the
 * wrong day the way a fixed 24-hour offset would.
 */

export function localDayKey(date: Date): string {
    return [
        date.getFullYear(),
        `${date.getMonth() + 1}`.padStart(2, "0"),
        `${date.getDate()}`.padStart(2, "0"),
    ].join("-");
}

export function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + days,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds(),
    );
}

export function startOfWeek(date: Date, weekStartsOn: WeekStartDay): Date {
    const day = date.getDay();
    const offset = (day - weekStartsOn + 7) % 7;
    return startOfDay(addDays(date, -offset));
}

export function weekDayKeys(weekStart: Date): string[] {
    return Array.from({ length: 7 }, (_value, index) =>
        localDayKey(addDays(weekStart, index)),
    );
}

export interface DayTotal {
    dayKey: string;
    date: Date;
    totalMs: number;
}

export interface AreaTotal {
    areaId: string;
    areaKey: string | null;
    areaName: string;
    totalMs: number;
}

export interface WeeklyStats {
    weekStart: Date;
    totalMs: number;
    practiceDays: number;
    sessionCount: number;
    days: DayTotal[];
    areas: AreaTotal[];
}

export function completedSessions(
    sessions: PracticeSession[],
): PracticeSession[] {
    return sessions.filter((session) => session.status === "completed");
}

export function computeWeeklyStats(
    sessions: PracticeSession[],
    weekStart: Date,
): WeeklyStats {
    const dayKeys = weekDayKeys(weekStart);
    const days: DayTotal[] = dayKeys.map((dayKey, index) => ({
        dayKey,
        date: addDays(weekStart, index),
        totalMs: 0,
    }));
    const areaTotals = new Map<string, AreaTotal>();
    let sessionCount = 0;

    for (const session of completedSessions(sessions)) {
        const dayKey = localDayKey(new Date(session.startedAt));
        const day = days.find((candidate) => candidate.dayKey === dayKey);
        if (!day) {
            continue;
        }
        sessionCount += 1;
        day.totalMs += totalRecordedMs(session.entries);
        for (const entry of session.entries) {
            const key =
                entry.practiceAreaIdSnapshot || entry.practiceAreaNameSnapshot;
            const existing = areaTotals.get(key);
            if (existing) {
                existing.totalMs += entry.activeMs;
            } else {
                areaTotals.set(key, {
                    areaId: entry.practiceAreaIdSnapshot,
                    areaKey: entry.practiceAreaKeySnapshot,
                    areaName: entry.practiceAreaNameSnapshot,
                    totalMs: entry.activeMs,
                });
            }
        }
    }

    return {
        weekStart,
        totalMs: days.reduce((total, day) => total + day.totalMs, 0),
        practiceDays: days.filter((day) => day.totalMs > 0).length,
        sessionCount,
        days,
        areas: [...areaTotals.values()]
            .filter((area) => area.totalMs > 0)
            .sort((left, right) => right.totalMs - left.totalMs),
    };
}

export interface ActivityUsage {
    activityId: string | null;
    title: string;
    totalMs: number;
    sessionCount: number;
    lastPractisedAt: string;
}

export function recentActivities(
    sessions: PracticeSession[],
    limit: number,
): ActivityUsage[] {
    const usage = new Map<string, ActivityUsage>();
    for (const session of completedSessions(sessions)) {
        for (const entry of session.entries) {
            const key =
                entry.activityId ?? `title:${entry.activityTitleSnapshot}`;
            const existing = usage.get(key);
            if (existing) {
                existing.totalMs += entry.activeMs;
                existing.sessionCount += 1;
                if (session.startedAt > existing.lastPractisedAt) {
                    existing.lastPractisedAt = session.startedAt;
                }
            } else {
                usage.set(key, {
                    activityId: entry.activityId,
                    title: entry.activityTitleSnapshot,
                    totalMs: entry.activeMs,
                    sessionCount: 1,
                    lastPractisedAt: session.startedAt,
                });
            }
        }
    }
    return [...usage.values()]
        .sort((left, right) =>
            right.lastPractisedAt.localeCompare(left.lastPractisedAt),
        )
        .slice(0, limit);
}

export interface TempoPoint {
    date: string;
    startBpm: number | null;
    endBpm: number | null;
    targetBpm: number | null;
    note: string;
}

export function tempoHistory(
    sessions: PracticeSession[],
    activityId: string,
): TempoPoint[] {
    const points: TempoPoint[] = [];
    for (const session of completedSessions(sessions)) {
        for (const entry of session.entries) {
            if (entry.activityId !== activityId) {
                continue;
            }
            if (entry.startBpm === null && entry.endBpm === null) {
                continue;
            }
            points.push({
                date: session.startedAt,
                startBpm: entry.startBpm,
                endBpm: entry.endBpm,
                targetBpm: entry.targetBpm,
                note: entry.note || session.note,
            });
        }
    }
    return points.sort((left, right) => left.date.localeCompare(right.date));
}

/** Consecutive practised days ending today (or yesterday, if today is free). */
export function currentStreak(
    sessions: PracticeSession[],
    today: Date,
): number {
    const practised = new Set(
        completedSessions(sessions).map((session) =>
            localDayKey(new Date(session.startedAt)),
        ),
    );
    let streak = 0;
    let cursor = startOfDay(today);
    if (!practised.has(localDayKey(cursor))) {
        cursor = addDays(cursor, -1);
        if (!practised.has(localDayKey(cursor))) {
            return 0;
        }
    }
    while (practised.has(localDayKey(cursor))) {
        streak += 1;
        cursor = addDays(cursor, -1);
    }
    return streak;
}
