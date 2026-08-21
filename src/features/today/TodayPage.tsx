import { useNavigate } from "react-router";
import { useAppStore } from "../../app/store";
import { useNow } from "../../app/hooks";
import { Icon } from "../../components/Icon";
import { ConfirmDialog } from "../../components/Modal";
import { useState } from "react";
import { computeWeeklyStats, startOfWeek } from "../../stats/aggregate";
import {
    formatDuration,
    minutesFromMs,
    sessionElapsedMs,
} from "../../session/timing";
import { daysBetween, formatDate } from "../../app/format";
import type { Routine } from "../../data/types";

function GoalBar({
    label,
    done,
    target,
    text,
}: {
    label: string;
    done: number;
    target: number;
    text: string;
}) {
    const percentage =
        target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
    return (
        <div className="goal">
            <div className="goal-head">
                <span>{label}</span>
                <span>{text}</span>
            </div>
            <div
                className="meter"
                role="meter"
                aria-valuenow={done}
                aria-valuemin={0}
                aria-valuemax={target}
                aria-label={label}
            >
                <span style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}

export function TodayPage() {
    const store = useAppStore();
    const { t, settings, routines, sessions, activeSession } = store;
    const navigate = useNavigate();
    const [discarding, setDiscarding] = useState(false);
    const now = useNow(30_000);

    const week = computeWeeklyStats(
        sessions,
        startOfWeek(new Date(), settings.weekStartsOn),
    );
    const activeRoutines = routines.filter((routine) => !routine.archived);
    const sortedRoutines = [...activeRoutines].sort((left, right) =>
        (right.lastUsedAt ?? "").localeCompare(left.lastUsedAt ?? ""),
    );
    const lastRoutine = sortedRoutines[0];
    const otherRoutines = sortedRoutines.slice(1, 5);

    const lastNote = [...sessions]
        .filter(
            (session) =>
                session.status === "completed" && session.nextTimeNote.trim(),
        )
        .sort((left, right) =>
            right.startedAt.localeCompare(left.startedAt),
        )[0];

    const completedCount = sessions.filter(
        (session) => session.status === "completed",
    ).length;
    const backupAgeDays = settings.lastBackupAt
        ? daysBetween(settings.lastBackupAt, now)
        : null;
    const backupDue =
        completedCount > 0 &&
        (settings.lastBackupAt === null ||
            settings.sessionsSinceBackup >= 10 ||
            (backupAgeDays !== null && backupAgeDays >= 14));

    const startRoutine = async (routine: Routine) => {
        const session = await store.startRoutineSession(routine);
        if (session) {
            store.announce(t("practice.announceStart"));
            void navigate(`/practice/${session.id}`);
        }
    };

    return (
        <div className="page">
            <header className="page-header">
                <h1>{t("today.title")}</h1>
            </header>

            {activeSession ? (
                <section className="card card-highlight">
                    <h2>{t("today.resumeTitle")}</h2>
                    <p>{t("today.resumeDescription")}</p>
                    <p className="timer timer-small">
                        {formatDuration(sessionElapsedMs(activeSession, now))}
                    </p>
                    <div className="row">
                        <button
                            type="button"
                            className="button button-primary"
                            onClick={() => {
                                void navigate(`/practice/${activeSession.id}`);
                            }}
                        >
                            <Icon name="play" />
                            {t("today.resume")}
                        </button>
                        <button
                            type="button"
                            className="button button-danger"
                            onClick={() => {
                                setDiscarding(true);
                            }}
                        >
                            {t("today.discard")}
                        </button>
                    </div>
                </section>
            ) : null}

            {backupDue ? (
                <section className="banner banner-soft" role="status">
                    <p>
                        {settings.lastBackupAt === null
                            ? t("today.backupNever")
                            : t("today.backupWarning", {
                                  days: backupAgeDays ?? 0,
                              })}
                    </p>
                    <button
                        type="button"
                        className="button"
                        onClick={() => {
                            void navigate("/settings");
                        }}
                    >
                        {t("today.backupAction")}
                    </button>
                </section>
            ) : null}

            <section className="card">
                <h2>{t("today.weekTitle")}</h2>
                <GoalBar
                    label={t("goals.minutesLabel")}
                    done={minutesFromMs(week.totalMs)}
                    target={settings.goals.weeklyMinutes}
                    text={t("goals.minutes", {
                        done: minutesFromMs(week.totalMs),
                        target: settings.goals.weeklyMinutes,
                    })}
                />
                <GoalBar
                    label={t("goals.daysLabel")}
                    done={week.practiceDays}
                    target={settings.goals.weeklyDays}
                    text={t("goals.days", {
                        done: week.practiceDays,
                        target: settings.goals.weeklyDays,
                    })}
                />
            </section>

            {lastRoutine ? (
                <section className="card">
                    <h2>{t("today.lastRoutine")}</h2>
                    <p className="card-title">{lastRoutine.name}</p>
                    <p className="muted">
                        {t("routines.stepCount", {
                            count: lastRoutine.steps.length,
                        })}
                        {" · "}
                        {t("routines.plannedTotal", {
                            minutes: Math.round(
                                lastRoutine.steps.reduce(
                                    (total, step) =>
                                        total + step.plannedSeconds,
                                    0,
                                ) / 60,
                            ),
                        })}
                    </p>
                    <button
                        type="button"
                        id="start-last-routine"
                        className="button button-primary button-large"
                        disabled={
                            activeSession !== null ||
                            lastRoutine.steps.length === 0
                        }
                        onClick={() => {
                            void startRoutine(lastRoutine);
                        }}
                    >
                        <Icon name="play" />
                        {t("common.start")}
                    </button>
                </section>
            ) : (
                <section className="card">
                    <h2>{t("today.emptyTitle")}</h2>
                    <p>{t("today.emptyDescription")}</p>
                    <button
                        type="button"
                        className="button button-primary"
                        onClick={() => {
                            void navigate("/routines/new");
                        }}
                    >
                        <Icon name="plus" />
                        {t("today.createRoutine")}
                    </button>
                </section>
            )}

            {otherRoutines.length > 0 ? (
                <section className="card">
                    <h2>{t("today.otherRoutines")}</h2>
                    <ul className="stack-list">
                        {otherRoutines.map((routine) => (
                            <li key={routine.id}>
                                <span>{routine.name}</span>
                                <button
                                    type="button"
                                    className="button"
                                    disabled={
                                        activeSession !== null ||
                                        routine.steps.length === 0
                                    }
                                    onClick={() => {
                                        void startRoutine(routine);
                                    }}
                                >
                                    <Icon name="play" />
                                    {t("common.start")}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <section className="card">
                <h2>{t("today.quickPractice")}</h2>
                <p>{t("today.quickPracticeDescription")}</p>
                <button
                    type="button"
                    id="start-quick-practice"
                    className="button"
                    disabled={activeSession !== null}
                    onClick={() => {
                        void navigate("/practice/quick");
                    }}
                >
                    <Icon name="metronome" />
                    {t("today.quickPractice")}
                </button>
            </section>

            {lastNote ? (
                <section className="card">
                    <h2>{t("today.nextTimeTitle")}</h2>
                    <p className="quote">{lastNote.nextTimeNote}</p>
                    <p className="muted">
                        {formatDate(lastNote.startedAt, settings.language)}
                    </p>
                </section>
            ) : null}

            <ConfirmDialog
                open={discarding}
                title={t("today.discard")}
                message={t("practice.discardConfirm")}
                confirmLabel={t("today.discard")}
                destructive
                onCancel={() => {
                    setDiscarding(false);
                }}
                onConfirm={() => {
                    if (activeSession) {
                        void store.discardSession(activeSession.id);
                    }
                    setDiscarding(false);
                }}
            />
        </div>
    );
}
