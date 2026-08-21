import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PracticeDatabase, ensureSeeded, setDatabase } from "../src/data/db";
import {
    buildRoutineSession,
    commitCompletedSession,
    createActivityRecord,
    createRoutineRecord,
    deleteActivity,
    deleteEverything,
    loadSnapshot,
    putActivity,
    putRoutine,
    putSession,
    replaceAll,
    saveSettings,
} from "../src/data/repository";
import { completeSession } from "../src/session/timing";
import { builtInAreaKeys } from "../src/data/types";

let database: PracticeDatabase;
let databaseIndex = 0;

beforeEach(async () => {
    databaseIndex += 1;
    database = new PracticeDatabase(`practice-test-${databaseIndex}`);
    setDatabase(database);
    await ensureSeeded(database);
});

afterEach(async () => {
    await database.delete();
    setDatabase(null);
});

async function seedRoutine() {
    const snapshot = await loadSnapshot(database);
    const area = snapshot.areas[0];
    const activity = await putActivity(
        createActivityRecord({
            title: "C major scale",
            practiceAreaId: area?.id ?? "",
            targetBpm: 90,
        }),
        database,
    );
    const routine = await putRoutine(
        createRoutineRecord({
            name: "Weekday",
            steps: [
                {
                    activityId: activity.id,
                    plannedSeconds: 600,
                    targetBpmOverride: null,
                },
            ],
        }),
        database,
    );
    return { activity, routine };
}

describe("local database", () => {
    it("seeds the built-in areas and settings exactly once", async () => {
        await ensureSeeded(database);
        const snapshot = await loadSnapshot(database);
        expect(snapshot.areas).toHaveLength(builtInAreaKeys.length);
        expect(snapshot.settings.language).toBe("pt-BR");
        expect(snapshot.settings.onboardingCompletedAt).toBeNull();
    });

    it("removes an activity from every routine that referenced it", async () => {
        const { activity, routine } = await seedRoutine();
        await deleteActivity(activity.id, database);
        const snapshot = await loadSnapshot(database);
        expect(snapshot.activities).toHaveLength(0);
        expect(
            snapshot.routines.find((item) => item.id === routine.id)?.steps,
        ).toEqual([]);
    });

    it("snapshots the activity title so history survives a rename", async () => {
        const { activity, routine } = await seedRoutine();
        const snapshot = await loadSnapshot(database);
        const session = buildRoutineSession(routine, {
            activities: snapshot.activities,
            areas: snapshot.areas,
        });
        await putSession(session, database);
        await putActivity({ ...activity, title: "Renamed" }, database);

        const stored = (await loadSnapshot(database)).sessions[0];
        expect(stored?.entries[0]?.activityTitleSnapshot).toBe("C major scale");
        expect(stored?.entries[0]?.targetBpm).toBe(90);
        expect(stored?.entries[0]?.practiceAreaKeySnapshot).toBe("technique");
    });

    it("commits a finished session, its routine stamp, and the backup counter together", async () => {
        const { routine } = await seedRoutine();
        const snapshot = await loadSnapshot(database);
        const started = buildRoutineSession(routine, {
            activities: snapshot.activities,
            areas: snapshot.areas,
        });
        await putSession(started, database);
        const finished = completeSession(
            started,
            Date.parse(started.startedAt) + 900_000,
        );
        await commitCompletedSession(finished, database);

        const after = await loadSnapshot(database);
        expect(after.sessions).toHaveLength(1);
        expect(after.sessions[0]?.status).toBe("completed");
        expect(after.sessions[0]?.entries[0]?.activeMs).toBe(900_000);
        expect(after.routines[0]?.lastUsedAt).toBe(finished.endedAt);
        expect(after.settings.sessionsSinceBackup).toBe(1);
    });

    it("replaces every table atomically on restore", async () => {
        await seedRoutine();
        await saveSettings({ language: "en" }, database);
        const current = await loadSnapshot(database);

        await replaceAll(
            {
                areas: current.areas,
                activities: [],
                routines: [],
                sessions: [],
                settings: { ...current.settings, language: "pt-BR" },
            },
            database,
        );

        const restored = await loadSnapshot(database);
        expect(restored.activities).toHaveLength(0);
        expect(restored.routines).toHaveLength(0);
        expect(restored.settings.language).toBe("pt-BR");
        expect(restored.areas).toHaveLength(builtInAreaKeys.length);
    });

    it("leaves the database untouched when a restore fails mid-transaction", async () => {
        const { activity } = await seedRoutine();
        const current = await loadSnapshot(database);
        const duplicated = [...current.areas, current.areas[0]];

        await expect(
            replaceAll(
                {
                    ...current,
                    // A duplicate primary key makes the bulk insert fail.
                    areas: duplicated as typeof current.areas,
                    activities: [],
                },
                database,
            ),
        ).rejects.toThrow();

        const after = await loadSnapshot(database);
        expect(after.activities.map((item) => item.id)).toEqual([activity.id]);
        expect(after.areas).toHaveLength(builtInAreaKeys.length);
    });

    it("clears every record when the user deletes all data", async () => {
        await seedRoutine();
        await deleteEverything(database);
        const empty = await loadSnapshot(database);
        expect(empty.areas).toHaveLength(0);
        expect(empty.activities).toHaveLength(0);
        expect(empty.sessions).toHaveLength(0);

        await ensureSeeded(database);
        const reseeded = await loadSnapshot(database);
        expect(reseeded.areas).toHaveLength(builtInAreaKeys.length);
    });
});
