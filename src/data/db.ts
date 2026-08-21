import Dexie, { type EntityTable } from "dexie";
import {
    builtInAreaKeys,
    defaultSettings,
    type Activity,
    type PracticeArea,
    type PracticeSession,
    type Routine,
    type Settings,
} from "./types";
import { createId } from "./ids";

/**
 * Schema version of the local database. Bumping it requires a Dexie upgrade
 * step plus a fixture in `tests/migrations.test.ts`.
 */
export const databaseSchemaVersion = 1;
export const databaseName = "bwinkeler-practice";

/** Settings live in a keyed table so future scoped records can join them. */
interface SettingsRecord extends Settings {
    id: "settings";
}

export class PracticeDatabase extends Dexie {
    areas!: EntityTable<PracticeArea, "id">;
    activities!: EntityTable<Activity, "id">;
    routines!: EntityTable<Routine, "id">;
    sessions!: EntityTable<PracticeSession, "id">;
    settings!: EntityTable<SettingsRecord, "id">;

    constructor(name = databaseName) {
        super(name);
        this.version(databaseSchemaVersion).stores({
            areas: "id, order",
            activities: "id, practiceAreaId, updatedAt",
            routines: "id, updatedAt, lastUsedAt",
            sessions: "id, status, startedAt",
            settings: "id",
        });
    }
}

let database: PracticeDatabase | null = null;

export function getDatabase(): PracticeDatabase {
    database ??= new PracticeDatabase();
    return database;
}

/** Test seam: swaps the shared instance without touching module consumers. */
export function setDatabase(instance: PracticeDatabase | null): void {
    database = instance;
}

const areaColorTokens = [
    "area-1",
    "area-2",
    "area-3",
    "area-4",
    "area-5",
    "area-6",
    "area-7",
    "area-8",
    "area-9",
] as const;

export function createBuiltInAreas(): PracticeArea[] {
    return builtInAreaKeys.map((key, index) => ({
        id: `area-${key}`,
        builtInKey: key,
        name: key,
        colorToken: areaColorTokens[index % areaColorTokens.length] as string,
        order: index,
    }));
}

export function createDefaultSettingsRecord(): SettingsRecord {
    return { id: "settings", ...defaultSettings };
}

/** Creates the built-in areas and the settings row on first use. */
export async function ensureSeeded(db = getDatabase()): Promise<void> {
    await db.transaction("rw", db.areas, db.settings, async () => {
        if ((await db.areas.count()) === 0) {
            await db.areas.bulkAdd(createBuiltInAreas());
        }
        if (!(await db.settings.get("settings"))) {
            await db.settings.add(createDefaultSettingsRecord());
        }
    });
}

export function newAreaId(): string {
    return createId();
}

export type { SettingsRecord };
