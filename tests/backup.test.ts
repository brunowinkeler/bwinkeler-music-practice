import { describe, expect, it } from "vitest";
import {
    backupFileName,
    createBackup,
    parseBackup,
    serializeBackup,
} from "../src/data/backup";
import {
    canonicalStringify,
    sanitizeUrl,
    ValidationError,
} from "../src/data/validation";
import {
    defaultSettings,
    limits,
    type DatabaseSnapshot,
} from "../src/data/types";

const exportedAt = "2026-08-21T12:00:00.000Z";

function snapshot(): DatabaseSnapshot {
    return {
        areas: [
            {
                id: "area-technique",
                builtInKey: "technique",
                name: "technique",
                colorToken: "area-1",
                order: 0,
            },
        ],
        activities: [
            {
                id: "activity-1",
                title: "C major scale",
                practiceAreaId: "area-technique",
                instructions: "Slow, relaxed hands.",
                sourceLabel: "Method",
                sourceReference: "Lesson 12",
                sourceUrl: "https://example.com/lesson",
                targetBpm: 90,
                archived: false,
                createdAt: exportedAt,
                updatedAt: exportedAt,
            },
        ],
        routines: [
            {
                id: "routine-1",
                name: "Weekday",
                description: "",
                steps: [
                    {
                        id: "step-1",
                        activityId: "activity-1",
                        plannedSeconds: 600,
                        targetBpmOverride: null,
                    },
                ],
                archived: false,
                lastUsedAt: null,
                createdAt: exportedAt,
                updatedAt: exportedAt,
            },
        ],
        sessions: [
            {
                id: "session-1",
                status: "completed",
                routineId: "routine-1",
                routineNameSnapshot: "Weekday",
                startedAt: exportedAt,
                endedAt: exportedAt,
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
                note: "Good session",
                nextTimeNote: "Slow the left hand",
                createdAt: exportedAt,
                updatedAt: exportedAt,
            },
        ],
        settings: { ...defaultSettings },
    };
}

function backupText(
    mutate: (raw: Record<string, unknown>) => void = () => {},
): string {
    const raw = JSON.parse(
        serializeBackup(createBackup(snapshot(), "0.1.0", exportedAt)),
    ) as Record<string, unknown>;
    mutate(raw);
    return JSON.stringify(raw);
}

describe("backup export and restore", () => {
    it("round-trips every record", () => {
        const parsed = parseBackup(backupText());
        expect(parsed.counts).toEqual({
            areas: 1,
            activities: 1,
            routines: 1,
            sessions: 1,
        });
        expect(parsed.snapshot).toEqual(snapshot());
        expect(parsed.appVersion).toBe("0.1.0");
    });

    it("names the file after the export date", () => {
        expect(backupFileName("2026-08-21T12:00:00.000Z")).toMatch(
            /^practice-companion-backup-\d{4}-\d{2}-\d{2}\.json$/,
        );
    });

    it("rejects a file above the size limit", () => {
        const oversized = "x".repeat(limits.maxBackupBytes + 1);
        expect(() => parseBackup(oversized)).toThrowError(
            expect.objectContaining({ code: "tooLarge" }),
        );
    });

    it("rejects malformed JSON", () => {
        expect(() => parseBackup("{ not json")).toThrowError(
            expect.objectContaining({ code: "invalidJson" }),
        );
    });

    it("rejects another application's file", () => {
        expect(() =>
            parseBackup(JSON.stringify({ format: "something-else" })),
        ).toThrowError(expect.objectContaining({ code: "unsupportedFormat" }));
    });

    it("rejects a newer schema instead of guessing", () => {
        expect(() =>
            parseBackup(
                backupText((raw) => {
                    raw.schemaVersion = 99;
                }),
            ),
        ).toThrowError(expect.objectContaining({ code: "unsupportedVersion" }));
    });

    it("rejects contents that do not match the checksum", () => {
        expect(() =>
            parseBackup(
                backupText((raw) => {
                    const data = raw.data as { sessions: { note: string }[] };
                    const first = data.sessions[0];
                    if (first) {
                        first.note = "tampered";
                    }
                }),
            ),
        ).toThrowError(expect.objectContaining({ code: "checksumMismatch" }));
    });

    it("rejects a record outside the schema", () => {
        expect(() =>
            parseBackup(
                backupText((raw) => {
                    const data = raw.data as {
                        activities: { title: unknown }[];
                    };
                    const first = data.activities[0];
                    if (first) {
                        first.title = 42;
                    }
                    delete raw.checksum;
                }),
            ),
        ).toThrowError(expect.objectContaining({ code: "invalidRecord" }));
    });

    it("rejects prototype-pollution keys", () => {
        const malicious = `{"format":"bwinkeler-practice-backup","schemaVersion":1,"exportedAt":"${exportedAt}","appVersion":"0.1.0","data":{"__proto__":{"polluted":true},"areas":[],"activities":[],"routines":[],"sessions":[]}}`;
        expect(() => parseBackup(malicious)).toThrow(ValidationError);
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("drops a routine step whose activity is missing", () => {
        const parsed = parseBackup(
            backupText((raw) => {
                const data = raw.data as { activities: unknown[] };
                data.activities = [];
                delete raw.checksum;
            }),
        );
        expect(parsed.snapshot.routines[0]?.steps).toEqual([]);
    });

    it("strips an unsafe source URL on import", () => {
        const parsed = parseBackup(
            backupText((raw) => {
                const data = raw.data as {
                    activities: { sourceUrl: string }[];
                };
                const first = data.activities[0];
                if (first) {
                    first.sourceUrl = "javascript:alert(1)";
                }
                delete raw.checksum;
            }),
        );
        expect(parsed.snapshot.activities[0]?.sourceUrl).toBe("");
    });

    it("sorts keys so the checksum does not depend on key order", () => {
        expect(canonicalStringify({ b: 1, a: [2, { d: 4, c: 3 }] })).toBe(
            '{"a":[2,{"c":3,"d":4}],"b":1}',
        );
    });

    it("accepts only https source URLs", () => {
        expect(sanitizeUrl("https://example.com/a")).toBe(
            "https://example.com/a",
        );
        expect(sanitizeUrl("http://example.com")).toBe("");
        expect(sanitizeUrl("javascript:alert(1)")).toBe("");
        expect(sanitizeUrl("data:text/html,<script>")).toBe("");
        expect(sanitizeUrl("  ")).toBe("");
    });
});
