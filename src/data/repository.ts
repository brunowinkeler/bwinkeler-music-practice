import { getDatabase, type PracticeDatabase } from "./db";
import { createId, nowIso } from "./ids";
import {
    defaultSettings,
    type Activity,
    type DatabaseSnapshot,
    type PracticeArea,
    type PracticeSession,
    type Routine,
    type RoutineStep,
    type SessionEntry,
    type Settings,
} from "./types";

export interface ActivityInput {
    title: string;
    practiceAreaId: string;
    instructions?: string;
    sourceLabel?: string;
    sourceReference?: string;
    sourceUrl?: string;
    targetBpm?: number | null;
}

export interface RoutineInput {
    name: string;
    description?: string;
    steps: Omit<RoutineStep, "id">[];
}

export async function loadSnapshot(
    db: PracticeDatabase = getDatabase(),
): Promise<DatabaseSnapshot> {
    const [areas, activities, routines, sessions, settingsRecord] =
        await Promise.all([
            db.areas.toArray(),
            db.activities.toArray(),
            db.routines.toArray(),
            db.sessions.toArray(),
            db.settings.get("settings"),
        ]);
    const { id: _id, ...storedSettings } = settingsRecord ?? {
        id: "settings" as const,
        ...defaultSettings,
    };
    return {
        areas: areas.sort((left, right) => left.order - right.order),
        activities,
        routines,
        sessions,
        settings: { ...defaultSettings, ...storedSettings },
    };
}

export async function saveSettings(
    patch: Partial<Settings>,
    db: PracticeDatabase = getDatabase(),
): Promise<Settings> {
    return db.transaction("rw", db.settings, async () => {
        const current = await db.settings.get("settings");
        const next: Settings = {
            ...defaultSettings,
            ...(current ?? {}),
            ...patch,
        };
        await db.settings.put({ id: "settings", ...next });
        return next;
    });
}

export function createActivityRecord(input: ActivityInput): Activity {
    const timestamp = nowIso();
    return {
        id: createId(),
        title: input.title,
        practiceAreaId: input.practiceAreaId,
        instructions: input.instructions ?? "",
        sourceLabel: input.sourceLabel ?? "",
        sourceReference: input.sourceReference ?? "",
        sourceUrl: input.sourceUrl ?? "",
        targetBpm: input.targetBpm ?? null,
        archived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

export async function putActivity(
    activity: Activity,
    db: PracticeDatabase = getDatabase(),
): Promise<Activity> {
    const next = { ...activity, updatedAt: nowIso() };
    await db.activities.put(next);
    return next;
}

/** Removes an activity and every routine step that referenced it. */
export async function deleteActivity(
    id: string,
    db: PracticeDatabase = getDatabase(),
): Promise<void> {
    await db.transaction("rw", db.activities, db.routines, async () => {
        await db.activities.delete(id);
        const routines = await db.routines.toArray();
        const timestamp = nowIso();
        for (const routine of routines) {
            if (!routine.steps.some((step) => step.activityId === id)) {
                continue;
            }
            await db.routines.put({
                ...routine,
                steps: routine.steps.filter((step) => step.activityId !== id),
                updatedAt: timestamp,
            });
        }
    });
}

export function createRoutineRecord(input: RoutineInput): Routine {
    const timestamp = nowIso();
    return {
        id: createId(),
        name: input.name,
        description: input.description ?? "",
        steps: input.steps.map((step) => ({ ...step, id: createId() })),
        archived: false,
        lastUsedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

export async function putRoutine(
    routine: Routine,
    db: PracticeDatabase = getDatabase(),
): Promise<Routine> {
    const next = { ...routine, updatedAt: nowIso() };
    await db.routines.put(next);
    return next;
}

export async function deleteRoutine(
    id: string,
    db: PracticeDatabase = getDatabase(),
): Promise<void> {
    await db.routines.delete(id);
}

export function duplicateRoutineRecord(
    routine: Routine,
    name: string,
): Routine {
    const timestamp = nowIso();
    return {
        ...routine,
        id: createId(),
        name,
        steps: routine.steps.map((step) => ({ ...step, id: createId() })),
        archived: false,
        lastUsedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

export async function putArea(
    area: PracticeArea,
    db: PracticeDatabase = getDatabase(),
): Promise<PracticeArea> {
    await db.areas.put(area);
    return area;
}

function buildEntry(
    activity: Activity | undefined,
    area: PracticeArea | undefined,
    plannedSeconds: number,
    targetBpm: number | null,
): SessionEntry {
    return {
        id: createId(),
        activityId: activity?.id ?? null,
        activityTitleSnapshot: activity?.title ?? "",
        practiceAreaIdSnapshot: area?.id ?? "",
        practiceAreaKeySnapshot: area?.builtInKey ?? null,
        practiceAreaNameSnapshot: area?.name ?? "",
        plannedSeconds,
        activeMs: 0,
        targetBpm,
        startBpm: null,
        endBpm: null,
        note: "",
    };
}

export interface SessionSources {
    activities: Activity[];
    areas: PracticeArea[];
}

export function buildRoutineSession(
    routine: Routine,
    sources: SessionSources,
): PracticeSession {
    const timestamp = nowIso();
    const entries = routine.steps.map((step) => {
        const activity = sources.activities.find(
            (candidate) => candidate.id === step.activityId,
        );
        const area = sources.areas.find(
            (candidate) => candidate.id === activity?.practiceAreaId,
        );
        return buildEntry(
            activity,
            area,
            step.plannedSeconds,
            step.targetBpmOverride ?? activity?.targetBpm ?? null,
        );
    });
    return {
        id: createId(),
        status: "active",
        routineId: routine.id,
        routineNameSnapshot: routine.name,
        startedAt: timestamp,
        endedAt: null,
        runningSince: timestamp,
        currentEntryIndex: 0,
        entries,
        note: "",
        nextTimeNote: "",
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

export function buildQuickSession(
    activity: Activity,
    sources: SessionSources,
): PracticeSession {
    const timestamp = nowIso();
    const area = sources.areas.find(
        (candidate) => candidate.id === activity.practiceAreaId,
    );
    return {
        id: createId(),
        status: "active",
        routineId: null,
        routineNameSnapshot: null,
        startedAt: timestamp,
        endedAt: null,
        runningSince: timestamp,
        currentEntryIndex: 0,
        entries: [buildEntry(activity, area, 0, activity.targetBpm)],
        note: "",
        nextTimeNote: "",
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

export async function putSession(
    session: PracticeSession,
    db: PracticeDatabase = getDatabase(),
): Promise<PracticeSession> {
    const next = { ...session, updatedAt: nowIso() };
    await db.sessions.put(next);
    return next;
}

/**
 * Writes the finished session, its entries, the routine usage stamp, and the
 * backup counter in one transaction so history can never be half-saved.
 */
export async function commitCompletedSession(
    session: PracticeSession,
    db: PracticeDatabase = getDatabase(),
): Promise<PracticeSession> {
    const stored = { ...session, updatedAt: nowIso() };
    await db.transaction(
        "rw",
        db.sessions,
        db.routines,
        db.settings,
        async () => {
            await db.sessions.put(stored);
            if (stored.routineId) {
                const routine = await db.routines.get(stored.routineId);
                if (routine) {
                    await db.routines.put({
                        ...routine,
                        lastUsedAt: stored.endedAt ?? stored.startedAt,
                    });
                }
            }
            const settings = await db.settings.get("settings");
            const current = { ...defaultSettings, ...(settings ?? {}) };
            await db.settings.put({
                id: "settings",
                ...current,
                sessionsSinceBackup: current.sessionsSinceBackup + 1,
            });
        },
    );
    return stored;
}

export async function deleteSession(
    id: string,
    db: PracticeDatabase = getDatabase(),
): Promise<void> {
    await db.sessions.delete(id);
}

/** Atomic full replacement used by backup restore. */
export async function replaceAll(
    snapshot: DatabaseSnapshot,
    db: PracticeDatabase = getDatabase(),
): Promise<void> {
    await db.transaction(
        "rw",
        db.areas,
        db.activities,
        db.routines,
        db.sessions,
        db.settings,
        async () => {
            await Promise.all([
                db.areas.clear(),
                db.activities.clear(),
                db.routines.clear(),
                db.sessions.clear(),
                db.settings.clear(),
            ]);
            await db.areas.bulkAdd(snapshot.areas);
            await db.activities.bulkAdd(snapshot.activities);
            await db.routines.bulkAdd(snapshot.routines);
            await db.sessions.bulkAdd(snapshot.sessions);
            await db.settings.add({ id: "settings", ...snapshot.settings });
        },
    );
}

export async function deleteEverything(
    db: PracticeDatabase = getDatabase(),
): Promise<void> {
    await db.transaction(
        "rw",
        db.areas,
        db.activities,
        db.routines,
        db.sessions,
        db.settings,
        async () => {
            await Promise.all([
                db.areas.clear(),
                db.activities.clear(),
                db.routines.clear(),
                db.sessions.clear(),
                db.settings.clear(),
            ]);
        },
    );
}
