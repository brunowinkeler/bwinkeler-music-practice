import type { PracticeSession } from "./types";
import { minutesFromMs, totalRecordedMs } from "../session/timing";

/**
 * CSV is an analysis export, never a backup: it is lossy and is not imported.
 * Cells are neutralised so a spreadsheet cannot execute a practice note.
 */

export const csvColumns = [
    "session_id",
    "date",
    "start_time",
    "duration_minutes",
    "routine",
    "activity",
    "practice_area",
    "activity_minutes",
    "target_bpm",
    "start_bpm",
    "end_bpm",
    "session_note",
    "next_time_note",
] as const;

const formulaPrefixes = ["=", "+", "-", "@", "\t", "\r"];

export function escapeCsvCell(value: string): string {
    const neutralised = formulaPrefixes.some((prefix) =>
        value.startsWith(prefix),
    )
        ? `'${value}`
        : value;
    return `"${neutralised.replaceAll('"', '""')}"`;
}

function localDate(iso: string): string {
    const date = new Date(iso);
    return [
        date.getFullYear(),
        `${date.getMonth() + 1}`.padStart(2, "0"),
        `${date.getDate()}`.padStart(2, "0"),
    ].join("-");
}

function localTime(iso: string): string {
    const date = new Date(iso);
    return [
        `${date.getHours()}`.padStart(2, "0"),
        `${date.getMinutes()}`.padStart(2, "0"),
    ].join(":");
}

export interface CsvOptions {
    areaLabel: (key: string | null, name: string) => string;
    quickPracticeLabel: string;
}

export function sessionsToCsv(
    sessions: PracticeSession[],
    options: CsvOptions,
): string {
    const rows: string[] = [csvColumns.join(",")];
    const completed = sessions
        .filter((session) => session.status === "completed")
        .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
    for (const session of completed) {
        const durationMinutes = minutesFromMs(totalRecordedMs(session.entries));
        for (const entry of session.entries) {
            rows.push(
                [
                    session.id,
                    localDate(session.startedAt),
                    localTime(session.startedAt),
                    String(durationMinutes),
                    session.routineNameSnapshot ?? options.quickPracticeLabel,
                    entry.activityTitleSnapshot,
                    options.areaLabel(
                        entry.practiceAreaKeySnapshot,
                        entry.practiceAreaNameSnapshot,
                    ),
                    String(minutesFromMs(entry.activeMs)),
                    entry.targetBpm === null ? "" : String(entry.targetBpm),
                    entry.startBpm === null ? "" : String(entry.startBpm),
                    entry.endBpm === null ? "" : String(entry.endBpm),
                    session.note,
                    session.nextTimeNote,
                ]
                    .map(escapeCsvCell)
                    .join(","),
            );
        }
    }
    return `${rows.join("\r\n")}\r\n`;
}

export function csvFileName(exportedAt: string): string {
    return `practice-companion-sessions-${localDate(exportedAt)}.csv`;
}
