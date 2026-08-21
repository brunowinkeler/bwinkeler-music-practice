import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { ensureSeeded, getDatabase, newAreaId } from "../data/db";
import {
    buildQuickSession,
    buildRoutineSession,
    commitCompletedSession,
    createActivityRecord,
    createRoutineRecord,
    deleteActivity as deleteActivityRecord,
    deleteEverything,
    deleteRoutine as deleteRoutineRecord,
    deleteSession as deleteSessionRecord,
    duplicateRoutineRecord,
    loadSnapshot,
    putActivity,
    putArea,
    putRoutine,
    putSession,
    replaceAll,
    saveSettings,
    type ActivityInput,
    type RoutineInput,
} from "../data/repository";
import {
    defaultSettings,
    type Activity,
    type DatabaseSnapshot,
    type PracticeArea,
    type PracticeSession,
    type Routine,
    type Settings,
} from "../data/types";
import {
    areaMessageKey,
    catalogues,
    translate,
    type MessageKey,
    type TranslateParams,
} from "../i18n";
import { completeSession, pauseSession } from "../session/timing";
import { applyAppearance, storeAppearance } from "./appearance";

interface AppStoreValue {
    ready: boolean;
    settings: Settings;
    areas: PracticeArea[];
    activities: Activity[];
    routines: Routine[];
    sessions: PracticeSession[];
    activeSession: PracticeSession | null;
    recoveredSessionId: string | null;
    errorKey: MessageKey | null;
    t: (key: MessageKey, params?: TranslateParams) => string;
    areaLabel: (
        area: Pick<PracticeArea, "builtInKey" | "name"> | undefined,
    ) => string;
    snapshotAreaLabel: (builtInKey: string | null, name: string) => string;
    announce: (message: string) => void;
    liveMessage: string;
    dismissError: () => void;
    acknowledgeRecovery: () => void;
    updateSettings: (patch: Partial<Settings>) => Promise<void>;
    createArea: (name: string) => Promise<PracticeArea | null>;
    createActivity: (input: ActivityInput) => Promise<Activity | null>;
    updateActivity: (activity: Activity) => Promise<void>;
    deleteActivity: (id: string) => Promise<void>;
    createRoutine: (input: RoutineInput) => Promise<Routine | null>;
    updateRoutine: (routine: Routine) => Promise<void>;
    duplicateRoutine: (routine: Routine, name: string) => Promise<void>;
    deleteRoutine: (id: string) => Promise<void>;
    startRoutineSession: (routine: Routine) => Promise<PracticeSession | null>;
    startQuickSession: (activity: Activity) => Promise<PracticeSession | null>;
    saveSession: (session: PracticeSession) => Promise<void>;
    finishSession: (
        session: PracticeSession,
    ) => Promise<PracticeSession | null>;
    discardSession: (id: string) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;
    restoreSnapshot: (snapshot: DatabaseSnapshot) => Promise<void>;
    deleteAllData: () => Promise<void>;
}

const emptySnapshot: DatabaseSnapshot = {
    areas: [],
    activities: [],
    routines: [],
    sessions: [],
    settings: defaultSettings,
};

const AppStoreContext = createContext<AppStoreValue | null>(null);

function isQuotaError(error: unknown): boolean {
    return (
        error instanceof DOMException &&
        (error.name === "QuotaExceededError" ||
            error.name === "NS_ERROR_DOM_QUOTA_REACHED")
    );
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
    const [snapshot, setSnapshot] = useState<DatabaseSnapshot>(emptySnapshot);
    const [ready, setReady] = useState(false);
    const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
    const [recoveredSessionId, setRecoveredSessionId] = useState<string | null>(
        null,
    );
    const [liveMessage, setLiveMessage] = useState("");
    const persistenceRequested = useRef(false);

    const run = useCallback(
        async <T,>(operation: () => Promise<T>): Promise<T | null> => {
            try {
                const result = await operation();
                setSnapshot(await loadSnapshot());
                return result;
            } catch (error) {
                setErrorKey(
                    isQuotaError(error) ? "error.storageFull" : "error.generic",
                );
                return null;
            }
        },
        [],
    );

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                await ensureSeeded();
                const loaded = await loadSnapshot();
                // A draft found at start-up is paused: the app cannot know how
                // much of the elapsed wall-clock time was real practice.
                const stale = loaded.sessions.find(
                    (session) =>
                        session.status === "active" &&
                        session.runningSince !== null,
                );
                if (stale) {
                    await putSession(pauseSession(stale, Date.now()));
                }
                const current = stale ? await loadSnapshot() : loaded;
                if (cancelled) {
                    return;
                }
                setSnapshot(current);
                setRecoveredSessionId(stale?.id ?? null);
                setReady(true);
            } catch {
                if (!cancelled) {
                    setErrorKey("error.generic");
                    setReady(true);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const settings = snapshot.settings;

    useEffect(() => {
        applyAppearance(settings.language, settings.theme);
        storeAppearance(settings.language, settings.theme);
    }, [settings.language, settings.theme]);

    const catalogue = catalogues[settings.language];

    const t = useCallback(
        (key: MessageKey, params?: TranslateParams) =>
            translate(catalogue, key, params),
        [catalogue],
    );

    const snapshotAreaLabel = useCallback(
        (builtInKey: string | null, name: string) =>
            builtInKey
                ? translate(
                      catalogue,
                      areaMessageKey(builtInKey as never),
                      undefined,
                  )
                : name,
        [catalogue],
    );

    const areaLabel = useCallback(
        (area: Pick<PracticeArea, "builtInKey" | "name"> | undefined) =>
            area ? snapshotAreaLabel(area.builtInKey, area.name) : "",
        [snapshotAreaLabel],
    );

    const announce = useCallback((message: string) => {
        setLiveMessage(message);
    }, []);

    const requestPersistenceOnce = useCallback(async () => {
        if (persistenceRequested.current) {
            return;
        }
        persistenceRequested.current = true;
        try {
            await navigator.storage?.persist?.();
        } catch {
            // A refused or unsupported request must never block a write.
        }
    }, []);

    const value = useMemo<AppStoreValue>(() => {
        const activeSession =
            snapshot.sessions.find((session) => session.status === "active") ??
            null;

        return {
            ready,
            settings,
            areas: snapshot.areas,
            activities: snapshot.activities,
            routines: snapshot.routines,
            sessions: snapshot.sessions,
            activeSession,
            recoveredSessionId,
            errorKey,
            t,
            areaLabel,
            snapshotAreaLabel,
            announce,
            liveMessage,
            dismissError: () => {
                setErrorKey(null);
            },
            acknowledgeRecovery: () => {
                setRecoveredSessionId(null);
            },
            updateSettings: async (patch) => {
                await run(() => saveSettings(patch));
            },
            createArea: async (name) => {
                const area: PracticeArea = {
                    id: newAreaId(),
                    builtInKey: null,
                    name,
                    colorToken: "area-custom",
                    order: snapshot.areas.length,
                };
                return run(() => putArea(area));
            },
            createActivity: async (input) => {
                await requestPersistenceOnce();
                return run(() => putActivity(createActivityRecord(input)));
            },
            updateActivity: async (activity) => {
                await run(() => putActivity(activity));
            },
            deleteActivity: async (id) => {
                await run(() => deleteActivityRecord(id));
            },
            createRoutine: async (input) => {
                await requestPersistenceOnce();
                return run(() => putRoutine(createRoutineRecord(input)));
            },
            updateRoutine: async (routine) => {
                await run(() => putRoutine(routine));
            },
            duplicateRoutine: async (routine, name) => {
                await run(() =>
                    putRoutine(duplicateRoutineRecord(routine, name)),
                );
            },
            deleteRoutine: async (id) => {
                await run(() => deleteRoutineRecord(id));
            },
            startRoutineSession: async (routine) => {
                await requestPersistenceOnce();
                const session = buildRoutineSession(routine, {
                    activities: snapshot.activities,
                    areas: snapshot.areas,
                });
                return run(() => putSession(session));
            },
            startQuickSession: async (activity) => {
                await requestPersistenceOnce();
                const session = buildQuickSession(activity, {
                    activities: snapshot.activities,
                    areas: snapshot.areas,
                });
                return run(() => putSession(session));
            },
            saveSession: async (session) => {
                await run(() => putSession(session));
            },
            finishSession: async (session) => {
                const finished =
                    session.status === "completed"
                        ? session
                        : completeSession(session, Date.now());
                return run(() => commitCompletedSession(finished));
            },
            discardSession: async (id) => {
                await run(() => deleteSessionRecord(id));
            },
            deleteSession: async (id) => {
                await run(() => deleteSessionRecord(id));
            },
            restoreSnapshot: async (next) => {
                await run(() => replaceAll(next));
            },
            deleteAllData: async () => {
                await run(async () => {
                    await deleteEverything();
                    await ensureSeeded(getDatabase());
                });
            },
        };
    }, [
        announce,
        areaLabel,
        errorKey,
        liveMessage,
        ready,
        recoveredSessionId,
        requestPersistenceOnce,
        run,
        settings,
        snapshot,
        snapshotAreaLabel,
        t,
    ]);

    return (
        <AppStoreContext.Provider value={value}>
            {children}
        </AppStoreContext.Provider>
    );
}

export function useAppStore(): AppStoreValue {
    const value = useContext(AppStoreContext);
    if (!value) {
        throw new Error("useAppStore must be used inside AppStoreProvider");
    }
    return value;
}
