import { describe, expect, it } from "vitest";
import { csvColumns, escapeCsvCell, sessionsToCsv } from "../src/data/csv";
import type { PracticeSession } from "../src/data/types";

const options = {
    areaLabel: (key: string | null, name: string) => key ?? name,
    quickPracticeLabel: "Quick practice",
};

function session(overrides: Partial<PracticeSession> = {}): PracticeSession {
    const startedAt = new Date(2026, 7, 21, 9, 30).toISOString();
    return {
        id: "session-1",
        status: "completed",
        routineId: null,
        routineNameSnapshot: null,
        startedAt,
        endedAt: startedAt,
        runningSince: null,
        currentEntryIndex: 0,
        entries: [
            {
                id: "entry-1",
                activityId: "activity-1",
                activityTitleSnapshot: "C major scale",
                practiceAreaIdSnapshot: "area-technique",
                practiceAreaKeySnapshot: "technique",
                practiceAreaNameSnapshot: "technique",
                plannedSeconds: 600,
                activeMs: 600_000,
                targetBpm: 90,
                startBpm: 72,
                endBpm: 84,
                note: "",
            },
        ],
        note: "",
        nextTimeNote: "",
        createdAt: startedAt,
        updatedAt: startedAt,
        ...overrides,
    };
}

describe("CSV export", () => {
    it("neutralises cells that a spreadsheet would treat as a formula", () => {
        expect(escapeCsvCell("=SUM(A1:A2)")).toBe(`"'=SUM(A1:A2)"`);
        expect(escapeCsvCell("+1")).toBe(`"'+1"`);
        expect(escapeCsvCell("-5")).toBe(`"'-5"`);
        expect(escapeCsvCell("@cmd")).toBe(`"'@cmd"`);
        expect(escapeCsvCell("plain")).toBe(`"plain"`);
    });

    it("escapes quotes and keeps separators inside a field", () => {
        expect(escapeCsvCell('say "hi", now')).toBe('"say ""hi"", now"');
        expect(escapeCsvCell("line\nbreak")).toBe('"line\nbreak"');
    });

    it("writes one row per session entry with the documented columns", () => {
        const csv = sessionsToCsv([session()], options);
        const [header, row] = csv.trimEnd().split("\r\n");
        expect(header).toBe(csvColumns.join(","));
        expect(row).toContain('"C major scale"');
        expect(row).toContain('"technique"');
        expect(row).toContain('"Quick practice"');
        expect(row).toContain('"10"');
        expect(row).toContain('"72"');
    });

    it("exports only completed sessions", () => {
        const csv = sessionsToCsv(
            [session({ id: "draft", status: "active" })],
            options,
        );
        expect(csv.trimEnd()).toBe(csvColumns.join(","));
    });

    it("keeps a malicious note inert", () => {
        const csv = sessionsToCsv(
            [session({ note: '=HYPERLINK("http://evil","x")' })],
            options,
        );
        expect(csv).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);
    });
});
