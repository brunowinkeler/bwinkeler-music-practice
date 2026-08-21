/**
 * Domain records. Everything here is persisted locally and exported verbatim in
 * a JSON backup, so field changes require a schema version bump and a migration.
 */

export type Iso8601 = string;

/** Built-in areas are stored by key so the label follows the interface language. */
export const builtInAreaKeys = [
    "technique",
    "scalesChords",
    "sightReading",
    "repertoire",
    "earTraining",
    "rhythm",
    "harmony",
    "improvisation",
    "courseStudy",
] as const;

export type BuiltInAreaKey = (typeof builtInAreaKeys)[number];

export interface PracticeArea {
    id: string;
    /** `null` for user-created areas, whose `name` is shown as typed. */
    builtInKey: BuiltInAreaKey | null;
    name: string;
    colorToken: string;
    order: number;
}

export interface Activity {
    id: string;
    title: string;
    practiceAreaId: string;
    instructions: string;
    sourceLabel: string;
    sourceReference: string;
    sourceUrl: string;
    targetBpm: number | null;
    archived: boolean;
    createdAt: Iso8601;
    updatedAt: Iso8601;
}

export interface RoutineStep {
    id: string;
    activityId: string;
    plannedSeconds: number;
    targetBpmOverride: number | null;
}

export interface Routine {
    id: string;
    name: string;
    description: string;
    steps: RoutineStep[];
    archived: boolean;
    lastUsedAt: Iso8601 | null;
    createdAt: Iso8601;
    updatedAt: Iso8601;
}

export interface SessionEntry {
    id: string;
    activityId: string | null;
    activityTitleSnapshot: string;
    practiceAreaIdSnapshot: string;
    practiceAreaKeySnapshot: BuiltInAreaKey | null;
    practiceAreaNameSnapshot: string;
    plannedSeconds: number;
    /** Practised time in whole milliseconds; the session total is their sum. */
    activeMs: number;
    targetBpm: number | null;
    startBpm: number | null;
    endBpm: number | null;
    note: string;
}

export type SessionStatus = "active" | "completed";

export interface PracticeSession {
    id: string;
    status: SessionStatus;
    routineId: string | null;
    routineNameSnapshot: string | null;
    startedAt: Iso8601;
    endedAt: Iso8601 | null;
    /** Timestamp the running entry started accumulating; `null` while paused. */
    runningSince: Iso8601 | null;
    currentEntryIndex: number;
    entries: SessionEntry[];
    note: string;
    nextTimeNote: string;
    createdAt: Iso8601;
    updatedAt: Iso8601;
}

export interface Goals {
    weeklyMinutes: number;
    weeklyDays: number;
}

export type ThemePreference = "light" | "dark" | "system";
export type LanguageCode = "pt-BR" | "en";
export type MetronomeMeter = "2/4" | "3/4" | "4/4" | "6/8";
export type WeekStartDay = 0 | 1;

export interface Settings {
    language: LanguageCode;
    theme: ThemePreference;
    weekStartsOn: WeekStartDay;
    metronomeBpm: number;
    metronomeMeter: MetronomeMeter;
    metronomeVolume: number;
    metronomeMuted: boolean;
    goals: Goals;
    onboardingCompletedAt: Iso8601 | null;
    lastBackupAt: Iso8601 | null;
    /** Completed sessions saved since the last export; drives the backup reminder. */
    sessionsSinceBackup: number;
}

export interface DatabaseSnapshot {
    areas: PracticeArea[];
    activities: Activity[];
    routines: Routine[];
    sessions: PracticeSession[];
    settings: Settings;
}

export const limits = {
    title: 120,
    shortText: 200,
    url: 2048,
    longText: 10_000,
    routineSteps: 100,
    minBpm: 30,
    maxBpm: 300,
    maxBackupBytes: 5 * 1024 * 1024,
    maxSessionEntries: 200,
} as const;

export const defaultSettings: Settings = {
    language: "pt-BR",
    theme: "system",
    weekStartsOn: 1,
    metronomeBpm: 90,
    metronomeMeter: "4/4",
    metronomeVolume: 0.7,
    metronomeMuted: false,
    goals: { weeklyMinutes: 150, weeklyDays: 4 },
    onboardingCompletedAt: null,
    lastBackupAt: null,
    sessionsSinceBackup: 0,
};
