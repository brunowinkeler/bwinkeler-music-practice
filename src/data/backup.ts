import {
    builtInAreaKeys,
    defaultSettings,
    limits,
    type Activity,
    type BuiltInAreaKey,
    type DatabaseSnapshot,
    type PracticeArea,
    type PracticeSession,
    type Routine,
    type SessionEntry,
    type Settings,
} from "./types";
import {
    asArray,
    asBoolean,
    asEnum,
    asId,
    asInteger,
    asIsoDate,
    asNullableInteger,
    asNullableIsoDate,
    asObject,
    asString,
    asUrl,
    canonicalStringify,
    checksum,
    ValidationError,
} from "./validation";

export const backupFormat = "bwinkeler-practice-backup";
export const backupSchemaVersion = 1;

export interface BackupCounts {
    areas: number;
    activities: number;
    routines: number;
    sessions: number;
}

export interface BackupFile {
    format: string;
    schemaVersion: number;
    appVersion: string;
    exportedAt: string;
    counts: BackupCounts;
    checksum: string;
    data: DatabaseSnapshot;
}

export function countSnapshot(snapshot: DatabaseSnapshot): BackupCounts {
    return {
        areas: snapshot.areas.length,
        activities: snapshot.activities.length,
        routines: snapshot.routines.length,
        sessions: snapshot.sessions.length,
    };
}

export function createBackup(
    snapshot: DatabaseSnapshot,
    appVersion: string,
    exportedAt: string,
): BackupFile {
    return {
        format: backupFormat,
        schemaVersion: backupSchemaVersion,
        appVersion,
        exportedAt,
        counts: countSnapshot(snapshot),
        checksum: checksum(canonicalStringify(snapshot)),
        data: snapshot,
    };
}

export function serializeBackup(backup: BackupFile): string {
    return `${JSON.stringify(backup, null, 2)}\n`;
}

export function backupFileName(exportedAt: string): string {
    const date = new Date(exportedAt);
    const day = [
        date.getFullYear(),
        `${date.getMonth() + 1}`.padStart(2, "0"),
        `${date.getDate()}`.padStart(2, "0"),
    ].join("-");
    return `practice-companion-backup-${day}.json`;
}

function parseArea(value: unknown, path: string): PracticeArea {
    const record = asObject(value, path);
    const builtInKey =
        record.builtInKey === null || record.builtInKey === undefined
            ? null
            : asEnum<BuiltInAreaKey>(
                  record.builtInKey,
                  `${path}.builtInKey`,
                  builtInAreaKeys,
              );
    return {
        id: asId(record.id, `${path}.id`),
        builtInKey,
        name: asString(record.name, `${path}.name`, limits.title),
        colorToken: asString(record.colorToken, `${path}.colorToken`, 40),
        order: asInteger(record.order, `${path}.order`, 0, 10_000),
    };
}

function parseActivity(value: unknown, path: string): Activity {
    const record = asObject(value, path);
    return {
        id: asId(record.id, `${path}.id`),
        title: asString(record.title, `${path}.title`, limits.title),
        practiceAreaId: asId(record.practiceAreaId, `${path}.practiceAreaId`),
        instructions: asString(
            record.instructions,
            `${path}.instructions`,
            limits.longText,
        ),
        sourceLabel: asString(
            record.sourceLabel,
            `${path}.sourceLabel`,
            limits.shortText,
        ),
        sourceReference: asString(
            record.sourceReference,
            `${path}.sourceReference`,
            limits.shortText,
        ),
        sourceUrl: asUrl(record.sourceUrl, `${path}.sourceUrl`, limits.url),
        targetBpm: asNullableInteger(
            record.targetBpm,
            `${path}.targetBpm`,
            limits.minBpm,
            limits.maxBpm,
        ),
        archived: asBoolean(record.archived, `${path}.archived`),
        createdAt: asIsoDate(record.createdAt, `${path}.createdAt`),
        updatedAt: asIsoDate(record.updatedAt, `${path}.updatedAt`),
    };
}

function parseRoutine(value: unknown, path: string): Routine {
    const record = asObject(value, path);
    const steps = asArray(
        record.steps,
        `${path}.steps`,
        limits.routineSteps,
    ).map((step, index) => {
        const stepPath = `${path}.steps[${index}]`;
        const stepRecord = asObject(step, stepPath);
        return {
            id: asId(stepRecord.id, `${stepPath}.id`),
            activityId: asId(stepRecord.activityId, `${stepPath}.activityId`),
            plannedSeconds: asInteger(
                stepRecord.plannedSeconds,
                `${stepPath}.plannedSeconds`,
                0,
                24 * 3600,
            ),
            targetBpmOverride: asNullableInteger(
                stepRecord.targetBpmOverride,
                `${stepPath}.targetBpmOverride`,
                limits.minBpm,
                limits.maxBpm,
            ),
        };
    });
    return {
        id: asId(record.id, `${path}.id`),
        name: asString(record.name, `${path}.name`, limits.title),
        description: asString(
            record.description,
            `${path}.description`,
            limits.longText,
        ),
        steps,
        archived: asBoolean(record.archived, `${path}.archived`),
        lastUsedAt: asNullableIsoDate(record.lastUsedAt, `${path}.lastUsedAt`),
        createdAt: asIsoDate(record.createdAt, `${path}.createdAt`),
        updatedAt: asIsoDate(record.updatedAt, `${path}.updatedAt`),
    };
}

function parseEntry(value: unknown, path: string): SessionEntry {
    const record = asObject(value, path);
    const areaKey =
        record.practiceAreaKeySnapshot === null ||
        record.practiceAreaKeySnapshot === undefined
            ? null
            : asEnum<BuiltInAreaKey>(
                  record.practiceAreaKeySnapshot,
                  `${path}.practiceAreaKeySnapshot`,
                  builtInAreaKeys,
              );
    return {
        id: asId(record.id, `${path}.id`),
        activityId:
            record.activityId === null || record.activityId === undefined
                ? null
                : asId(record.activityId, `${path}.activityId`),
        activityTitleSnapshot: asString(
            record.activityTitleSnapshot,
            `${path}.activityTitleSnapshot`,
            limits.title,
        ),
        practiceAreaIdSnapshot: asString(
            record.practiceAreaIdSnapshot,
            `${path}.practiceAreaIdSnapshot`,
            100,
        ),
        practiceAreaKeySnapshot: areaKey,
        practiceAreaNameSnapshot: asString(
            record.practiceAreaNameSnapshot,
            `${path}.practiceAreaNameSnapshot`,
            limits.title,
        ),
        plannedSeconds: asInteger(
            record.plannedSeconds,
            `${path}.plannedSeconds`,
            0,
            24 * 3600,
        ),
        activeMs: asInteger(
            record.activeMs,
            `${path}.activeMs`,
            0,
            30 * 24 * 3600 * 1000,
        ),
        targetBpm: asNullableInteger(
            record.targetBpm,
            `${path}.targetBpm`,
            limits.minBpm,
            limits.maxBpm,
        ),
        startBpm: asNullableInteger(
            record.startBpm,
            `${path}.startBpm`,
            limits.minBpm,
            limits.maxBpm,
        ),
        endBpm: asNullableInteger(
            record.endBpm,
            `${path}.endBpm`,
            limits.minBpm,
            limits.maxBpm,
        ),
        note: asString(record.note, `${path}.note`, limits.longText),
    };
}

function parseSession(value: unknown, path: string): PracticeSession {
    const record = asObject(value, path);
    const entries = asArray(
        record.entries,
        `${path}.entries`,
        limits.maxSessionEntries,
    ).map((entry, index) => parseEntry(entry, `${path}.entries[${index}]`));
    const currentEntryIndex = asInteger(
        record.currentEntryIndex,
        `${path}.currentEntryIndex`,
        0,
        Math.max(0, entries.length - 1),
    );
    return {
        id: asId(record.id, `${path}.id`),
        status: asEnum(record.status, `${path}.status`, [
            "active",
            "completed",
        ] as const),
        routineId:
            record.routineId === null || record.routineId === undefined
                ? null
                : asId(record.routineId, `${path}.routineId`),
        routineNameSnapshot:
            record.routineNameSnapshot === null ||
            record.routineNameSnapshot === undefined
                ? null
                : asString(
                      record.routineNameSnapshot,
                      `${path}.routineNameSnapshot`,
                      limits.title,
                  ),
        startedAt: asIsoDate(record.startedAt, `${path}.startedAt`),
        endedAt: asNullableIsoDate(record.endedAt, `${path}.endedAt`),
        runningSince: asNullableIsoDate(
            record.runningSince,
            `${path}.runningSince`,
        ),
        currentEntryIndex,
        entries,
        note: asString(record.note, `${path}.note`, limits.longText),
        nextTimeNote: asString(
            record.nextTimeNote,
            `${path}.nextTimeNote`,
            limits.longText,
        ),
        createdAt: asIsoDate(record.createdAt, `${path}.createdAt`),
        updatedAt: asIsoDate(record.updatedAt, `${path}.updatedAt`),
    };
}

function parseSettings(value: unknown, path: string): Settings {
    const record = asObject(value, path);
    const goals = asObject(record.goals ?? {}, `${path}.goals`);
    return {
        language: asEnum(record.language, `${path}.language`, [
            "pt-BR",
            "en",
        ] as const),
        theme: asEnum(record.theme, `${path}.theme`, [
            "light",
            "dark",
            "system",
        ] as const),
        weekStartsOn: asInteger(
            record.weekStartsOn,
            `${path}.weekStartsOn`,
            0,
            1,
        ) as 0 | 1,
        metronomeBpm: asInteger(
            record.metronomeBpm,
            `${path}.metronomeBpm`,
            limits.minBpm,
            limits.maxBpm,
        ),
        metronomeMeter: asEnum(
            record.metronomeMeter,
            `${path}.metronomeMeter`,
            ["2/4", "3/4", "4/4", "6/8"] as const,
        ),
        metronomeVolume:
            asInteger(
                Math.round(Number(record.metronomeVolume ?? 0.7) * 100),
                `${path}.metronomeVolume`,
                0,
                100,
            ) / 100,
        metronomeMuted: asBoolean(
            record.metronomeMuted,
            `${path}.metronomeMuted`,
        ),
        goals: {
            weeklyMinutes: asInteger(
                goals.weeklyMinutes,
                `${path}.goals.weeklyMinutes`,
                0,
                10_080,
            ),
            weeklyDays: asInteger(
                goals.weeklyDays,
                `${path}.goals.weeklyDays`,
                0,
                7,
            ),
        },
        onboardingCompletedAt: asNullableIsoDate(
            record.onboardingCompletedAt,
            `${path}.onboardingCompletedAt`,
        ),
        lastBackupAt: asNullableIsoDate(
            record.lastBackupAt,
            `${path}.lastBackupAt`,
        ),
        sessionsSinceBackup: asInteger(
            record.sessionsSinceBackup ?? 0,
            `${path}.sessionsSinceBackup`,
            0,
            1_000_000,
        ),
    };
}

export interface ParsedBackup {
    exportedAt: string;
    appVersion: string;
    schemaVersion: number;
    counts: BackupCounts;
    snapshot: DatabaseSnapshot;
}

/** Repairs references that would otherwise leave the UI pointing at nothing. */
function reconcile(snapshot: DatabaseSnapshot): DatabaseSnapshot {
    const areaIds = new Set(snapshot.areas.map((area) => area.id));
    const fallbackAreaId = snapshot.areas[0]?.id ?? "";
    const activities = snapshot.activities.map((activity) =>
        areaIds.has(activity.practiceAreaId)
            ? activity
            : { ...activity, practiceAreaId: fallbackAreaId },
    );
    const activityIds = new Set(activities.map((activity) => activity.id));
    const routines = snapshot.routines.map((routine) => ({
        ...routine,
        steps: routine.steps.filter((step) => activityIds.has(step.activityId)),
    }));
    return { ...snapshot, activities, routines };
}

export function parseBackup(text: string): ParsedBackup {
    if (text.length > limits.maxBackupBytes) {
        throw new ValidationError("tooLarge", "", "backup file is too large");
    }
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        throw new ValidationError("invalidJson", "", "file is not valid JSON");
    }
    const root = asObject(raw, "");
    if (root.format !== backupFormat) {
        throw new ValidationError(
            "unsupportedFormat",
            "format",
            "not a Practice Companion backup",
        );
    }
    const schemaVersion = asInteger(
        root.schemaVersion,
        "schemaVersion",
        1,
        999,
    );
    if (schemaVersion > backupSchemaVersion) {
        throw new ValidationError(
            "unsupportedVersion",
            "schemaVersion",
            `backup schema ${schemaVersion} is newer than ${backupSchemaVersion}`,
        );
    }
    const data = asObject(root.data, "data");
    const snapshot: DatabaseSnapshot = {
        areas: asArray(data.areas, "data.areas", 500).map((area, index) =>
            parseArea(area, `data.areas[${index}]`),
        ),
        activities: asArray(data.activities, "data.activities", 5_000).map(
            (activity, index) =>
                parseActivity(activity, `data.activities[${index}]`),
        ),
        routines: asArray(data.routines, "data.routines", 1_000).map(
            (routine, index) =>
                parseRoutine(routine, `data.routines[${index}]`),
        ),
        sessions: asArray(data.sessions, "data.sessions", 50_000).map(
            (session, index) =>
                parseSession(session, `data.sessions[${index}]`),
        ),
        settings: parseSettings(
            data.settings ?? defaultSettings,
            "data.settings",
        ),
    };
    if (typeof root.checksum === "string" && root.checksum !== "") {
        if (checksum(canonicalStringify(data)) !== root.checksum) {
            throw new ValidationError(
                "checksumMismatch",
                "checksum",
                "the file contents do not match its checksum",
            );
        }
    }
    return {
        exportedAt: asIsoDate(root.exportedAt, "exportedAt"),
        appVersion: asString(root.appVersion ?? "", "appVersion", 40),
        schemaVersion,
        counts: countSnapshot(snapshot),
        snapshot: reconcile(snapshot),
    };
}
