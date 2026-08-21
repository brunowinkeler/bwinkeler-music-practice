import { useEffect, useState } from "react";
import { useAppStore } from "../../app/store";
import { ConfirmDialog } from "../../components/Modal";
import { RestoreDialog } from "./RestoreDialog";
import { downloadTextFile } from "./download";
import {
    backupFileName,
    createBackup,
    serializeBackup,
} from "../../data/backup";
import { csvFileName, sessionsToCsv } from "../../data/csv";
import { nowIso } from "../../data/ids";
import { languageNames } from "../../i18n";
import type {
    LanguageCode,
    MetronomeMeter,
    ThemePreference,
    WeekStartDay,
} from "../../data/types";
import { limits } from "../../data/types";
import { checkForUpdate } from "../../pwa";

const themes: {
    value: ThemePreference;
    key: "theme.light" | "theme.dark" | "theme.system";
}[] = [
    { value: "light", key: "theme.light" },
    { value: "dark", key: "theme.dark" },
    { value: "system", key: "theme.system" },
];

export function SettingsPage() {
    const store = useAppStore();
    const { t, settings, sessions, areas, activities, routines } = store;
    const [persisted, setPersisted] = useState<boolean | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [updateMessage, setUpdateMessage] = useState<string | null>(null);

    useEffect(() => {
        void (async () => {
            try {
                setPersisted((await navigator.storage?.persisted?.()) ?? null);
            } catch {
                setPersisted(null);
            }
        })();
    }, []);

    const completedCount = sessions.filter(
        (session) => session.status === "completed",
    ).length;

    const exportBackup = () => {
        const exportedAt = nowIso();
        const backup = createBackup(
            { areas, activities, routines, sessions, settings },
            __APP_VERSION__,
            exportedAt,
        );
        downloadTextFile(
            backupFileName(exportedAt),
            "application/json",
            serializeBackup(backup),
        );
        void store.updateSettings({
            lastBackupAt: exportedAt,
            sessionsSinceBackup: 0,
        });
    };

    const exportCsv = () => {
        const exportedAt = nowIso();
        downloadTextFile(
            csvFileName(exportedAt),
            "text/csv",
            sessionsToCsv(sessions, {
                areaLabel: store.snapshotAreaLabel,
                quickPracticeLabel: t("practice.quickLabel"),
            }),
        );
    };

    return (
        <div className="page">
            <header className="page-header">
                <h1>{t("settings.title")}</h1>
            </header>

            <section className="card">
                <h2>{t("settings.interface")}</h2>
                <div className="field">
                    <label htmlFor="settings-language">
                        {t("settings.language")}
                    </label>
                    <select
                        id="settings-language"
                        value={settings.language}
                        onChange={(event) => {
                            void store.updateSettings({
                                language: event.target.value as LanguageCode,
                            });
                        }}
                    >
                        {Object.entries(languageNames).map(([code, label]) => (
                            <option key={code} value={code}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
                <fieldset className="field">
                    <legend>{t("settings.theme")}</legend>
                    <div className="segmented">
                        {themes.map((theme) => (
                            <label key={theme.value}>
                                <input
                                    type="radio"
                                    name="settings-theme"
                                    checked={settings.theme === theme.value}
                                    onChange={() => {
                                        void store.updateSettings({
                                            theme: theme.value,
                                        });
                                    }}
                                />
                                <span>{t(theme.key)}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div className="field">
                    <label htmlFor="settings-week-start">
                        {t("settings.weekStart")}
                    </label>
                    <select
                        id="settings-week-start"
                        value={settings.weekStartsOn}
                        onChange={(event) => {
                            void store.updateSettings({
                                weekStartsOn: Number(
                                    event.target.value,
                                ) as WeekStartDay,
                            });
                        }}
                    >
                        <option value={1}>
                            {t("settings.weekStartMonday")}
                        </option>
                        <option value={0}>
                            {t("settings.weekStartSunday")}
                        </option>
                    </select>
                </div>
            </section>

            <section className="card">
                <h2>{t("settings.metronome")}</h2>
                <div className="field-row">
                    <div className="field field-narrow">
                        <label htmlFor="settings-bpm">
                            {t("settings.metronomeBpm")}
                        </label>
                        <input
                            id="settings-bpm"
                            type="number"
                            inputMode="numeric"
                            min={limits.minBpm}
                            max={limits.maxBpm}
                            value={settings.metronomeBpm}
                            onChange={(event) => {
                                const parsed = Number.parseInt(
                                    event.target.value,
                                    10,
                                );
                                if (Number.isFinite(parsed)) {
                                    void store.updateSettings({
                                        metronomeBpm: Math.min(
                                            limits.maxBpm,
                                            Math.max(limits.minBpm, parsed),
                                        ),
                                    });
                                }
                            }}
                        />
                    </div>
                    <div className="field field-narrow">
                        <label htmlFor="settings-meter">
                            {t("settings.metronomeMeter")}
                        </label>
                        <select
                            id="settings-meter"
                            value={settings.metronomeMeter}
                            onChange={(event) => {
                                void store.updateSettings({
                                    metronomeMeter: event.target
                                        .value as MetronomeMeter,
                                });
                            }}
                        >
                            {["2/4", "3/4", "4/4", "6/8"].map((meter) => (
                                <option key={meter} value={meter}>
                                    {meter}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <section className="card">
                <h2>{t("settings.goals")}</h2>
                <div className="field-row">
                    <div className="field field-narrow">
                        <label htmlFor="settings-goal-minutes">
                            {t("settings.goalMinutes")}
                        </label>
                        <input
                            id="settings-goal-minutes"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={10080}
                            value={settings.goals.weeklyMinutes}
                            onChange={(event) => {
                                void store.updateSettings({
                                    goals: {
                                        ...settings.goals,
                                        weeklyMinutes: Math.max(
                                            0,
                                            Number.parseInt(
                                                event.target.value,
                                                10,
                                            ) || 0,
                                        ),
                                    },
                                });
                            }}
                        />
                    </div>
                    <div className="field field-narrow">
                        <label htmlFor="settings-goal-days">
                            {t("settings.goalDays")}
                        </label>
                        <input
                            id="settings-goal-days"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={7}
                            value={settings.goals.weeklyDays}
                            onChange={(event) => {
                                void store.updateSettings({
                                    goals: {
                                        ...settings.goals,
                                        weeklyDays: Math.min(
                                            7,
                                            Math.max(
                                                0,
                                                Number.parseInt(
                                                    event.target.value,
                                                    10,
                                                ) || 0,
                                            ),
                                        ),
                                    },
                                });
                            }}
                        />
                    </div>
                </div>
            </section>

            <section className="card">
                <h2>{t("settings.data")}</h2>
                <h3>{t("settings.storageStatus")}</h3>
                <p className="muted">
                    {persisted === null
                        ? t("settings.storageUnknown")
                        : persisted
                          ? t("settings.storagePersisted")
                          : t("settings.storageNotPersisted")}
                </p>
                {persisted === false ? (
                    <button
                        type="button"
                        className="button"
                        onClick={() => {
                            void navigator.storage
                                ?.persist?.()
                                .then((granted) => {
                                    setPersisted(granted);
                                });
                        }}
                    >
                        {t("settings.requestPersistence")}
                    </button>
                ) : null}

                <p className="muted">
                    {settings.lastBackupAt
                        ? t("settings.lastBackup", {
                              date: new Intl.DateTimeFormat(settings.language, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                              }).format(new Date(settings.lastBackupAt)),
                          })
                        : t("settings.lastBackupNever")}
                </p>
                <div className="row row-wrap">
                    <button
                        type="button"
                        id="export-backup"
                        className="button button-primary"
                        onClick={exportBackup}
                    >
                        {t("settings.exportBackup")}
                    </button>
                    <button
                        type="button"
                        id="open-restore"
                        className="button"
                        onClick={() => {
                            setRestoring(true);
                        }}
                    >
                        {t("settings.restoreBackup")}
                    </button>
                    <button
                        type="button"
                        id="export-csv"
                        className="button"
                        onClick={exportCsv}
                    >
                        {t("settings.exportCsv")}
                    </button>
                </div>
                <p className="muted small">{t("settings.csvHint")}</p>

                <button
                    type="button"
                    id="delete-all"
                    className="button button-danger"
                    onClick={() => {
                        setDeleting(true);
                    }}
                >
                    {t("settings.deleteAll")}
                </button>
            </section>

            <section className="card">
                <h2>{t("settings.about")}</h2>
                <p className="muted">
                    {t("settings.version", { version: __APP_VERSION__ })}
                </p>
                <p>{t("settings.privacy")}</p>
                <button
                    type="button"
                    className="button"
                    onClick={() => {
                        void checkForUpdate().then((available) => {
                            setUpdateMessage(
                                available
                                    ? t("settings.updateAvailable")
                                    : t("settings.upToDate"),
                            );
                        });
                    }}
                >
                    {t("settings.checkUpdate")}
                </button>
                {updateMessage ? (
                    <p className="muted" role="status">
                        {updateMessage}
                    </p>
                ) : null}
            </section>

            <RestoreDialog
                open={restoring}
                onClose={() => {
                    setRestoring(false);
                }}
                onExportCurrent={exportBackup}
            />

            <ConfirmDialog
                open={deleting}
                title={t("settings.deleteAll")}
                message={t("settings.deleteAllConfirm", {
                    sessions: completedCount,
                })}
                confirmLabel={t("settings.deleteAll")}
                destructive
                onCancel={() => {
                    setDeleting(false);
                }}
                onConfirm={() => {
                    void store.deleteAllData().then(() => {
                        store.announce(t("settings.deleteAllDone"));
                        setDeleting(false);
                    });
                }}
            />
        </div>
    );
}
