import { describe, expect, it } from "vitest";
import {
    addDays,
    computeWeeklyStats,
    currentStreak,
    localDayKey,
    recentActivities,
    startOfWeek,
    tempoHistory,
    weekDayKeys,
} from "../src/stats/aggregate";
import type { PracticeSession, SessionEntry } from "../src/data/types";

function entry(
    activityId: string,
    minutes: number,
    overrides: Partial<SessionEntry> = {},
): SessionEntry {
    return {
        id: `${activityId}-${minutes}-${Math.random()}`,
        activityId,
        activityTitleSnapshot: activityId,
        practiceAreaIdSnapshot: "area-technique",
        practiceAreaKeySnapshot: "technique",
        practiceAreaNameSnapshot: "technique",
        plannedSeconds: minutes * 60,
        activeMs: minutes * 60_000,
        targetBpm: null,
        startBpm: null,
        endBpm: null,
        note: "",
        ...overrides,
    };
}

/** Local civil time, so tests follow the same calendar rules as the app. */
function localIso(year: number, month: number, day: number, hour = 10): string {
    return new Date(year, month - 1, day, hour).toISOString();
}

function completed(
    id: string,
    startedAt: string,
    entries: SessionEntry[],
): PracticeSession {
    return {
        id,
        status: "completed",
        routineId: "routine-1",
        routineNameSnapshot: "Weekday",
        startedAt,
        endedAt: startedAt,
        runningSince: null,
        currentEntryIndex: 0,
        entries,
        note: "",
        nextTimeNote: "",
        createdAt: startedAt,
        updatedAt: startedAt,
    };
}

describe("weekly statistics", () => {
    it("starts the week on the configured day", () => {
        const wednesday = new Date(2026, 7, 19, 15);
        expect(localDayKey(startOfWeek(wednesday, 1))).toBe("2026-08-17");
        expect(localDayKey(startOfWeek(wednesday, 0))).toBe("2026-08-16");
        expect(weekDayKeys(startOfWeek(wednesday, 1))).toHaveLength(7);
    });

    it("keeps seven civil days across a daylight-saving change", () => {
        // 2026-10-25 is the European clock change; local dates must not slip.
        const keys = weekDayKeys(startOfWeek(new Date(2026, 9, 26, 12), 1));
        expect(keys).toEqual([
            "2026-10-26",
            "2026-10-27",
            "2026-10-28",
            "2026-10-29",
            "2026-10-30",
            "2026-10-31",
            "2026-11-01",
        ]);
    });

    it("totals minutes, practice days, and areas inside the week", () => {
        const sessions = [
            completed("s1", localIso(2026, 8, 17), [entry("scale", 20)]),
            completed("s2", localIso(2026, 8, 17, 20), [entry("scale", 10)]),
            completed("s3", localIso(2026, 8, 19), [
                entry("piece", 30, {
                    practiceAreaIdSnapshot: "area-repertoire",
                    practiceAreaKeySnapshot: "repertoire",
                    practiceAreaNameSnapshot: "repertoire",
                }),
            ]),
            completed("outside", localIso(2026, 8, 10), [entry("scale", 45)]),
        ];
        const stats = computeWeeklyStats(
            sessions,
            startOfWeek(new Date(2026, 7, 19), 1),
        );
        expect(stats.totalMs).toBe(60 * 60_000);
        expect(stats.practiceDays).toBe(2);
        expect(stats.sessionCount).toBe(3);
        expect(stats.areas.map((area) => area.areaKey)).toEqual([
            "technique",
            "repertoire",
        ]);
        expect(stats.days.map((day) => day.totalMs / 60_000)).toEqual([
            30, 0, 30, 0, 0, 0, 0,
        ]);
    });

    it("ignores drafts that were never completed", () => {
        const draft: PracticeSession = {
            ...completed("draft", localIso(2026, 8, 18), [entry("scale", 15)]),
            status: "active",
        };
        const stats = computeWeeklyStats(
            [draft],
            startOfWeek(new Date(2026, 7, 19), 1),
        );
        expect(stats.totalMs).toBe(0);
    });

    it("summarises recent activities and tempo evidence", () => {
        const sessions = [
            completed("s1", localIso(2026, 8, 17), [
                entry("scale", 20, { startBpm: 60, endBpm: 72 }),
            ]),
            completed("s2", localIso(2026, 8, 19), [
                entry("scale", 15, { startBpm: 72, endBpm: 80 }),
                entry("piece", 25),
            ]),
        ];
        const recent = recentActivities(sessions, 5);
        expect(recent[0]?.title).toBe("scale");
        expect(recent[0]?.sessionCount).toBe(2);
        expect(recent[0]?.totalMs).toBe(35 * 60_000);

        const tempo = tempoHistory(sessions, "scale");
        expect(tempo.map((point) => point.endBpm)).toEqual([72, 80]);
        expect(tempoHistory(sessions, "piece")).toEqual([]);
    });

    it("counts a streak that ends today or yesterday", () => {
        const today = new Date(2026, 7, 21, 9);
        const sessions = [
            completed("s1", localIso(2026, 8, 19), [entry("scale", 10)]),
            completed("s2", localIso(2026, 8, 20), [entry("scale", 10)]),
            completed("s3", localIso(2026, 8, 21), [entry("scale", 10)]),
        ];
        expect(currentStreak(sessions, today)).toBe(3);
        expect(currentStreak(sessions.slice(0, 2), today)).toBe(2);
        expect(currentStreak(sessions, addDays(today, 3))).toBe(0);
    });
});
