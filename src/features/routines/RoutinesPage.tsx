import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAppStore } from "../../app/store";
import { Icon } from "../../components/Icon";
import { ConfirmDialog } from "../../components/Modal";
import { formatDate } from "../../app/format";
import type { Activity, Routine } from "../../data/types";

type Pending =
    | { kind: "routine"; routine: Routine }
    | { kind: "activity"; activity: Activity }
    | null;

export function RoutinesPage() {
    const store = useAppStore();
    const { t, settings, routines, activities, areas, activeSession } = store;
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const tab = params.get("tab") === "activities" ? "activities" : "routines";
    const [showArchived, setShowArchived] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Pending>(null);

    const visibleRoutines = routines
        .filter((routine) => showArchived || !routine.archived)
        .sort((left, right) => left.name.localeCompare(right.name));
    const visibleActivities = activities
        .filter((activity) => showArchived || !activity.archived)
        .sort((left, right) => left.title.localeCompare(right.title));

    const startRoutine = async (routine: Routine) => {
        const session = await store.startRoutineSession(routine);
        if (session) {
            void navigate(`/practice/${session.id}`);
        }
    };

    const selectTab = (next: "routines" | "activities") => {
        setParams(next === "routines" ? {} : { tab: "activities" });
    };

    return (
        <div className="page">
            <header className="page-header">
                <h1>{t("routines.title")}</h1>
            </header>

            <div
                className="tabs"
                role="tablist"
                aria-label={t("routines.title")}
            >
                <button
                    type="button"
                    role="tab"
                    id="tab-routines"
                    aria-selected={tab === "routines"}
                    aria-controls="panel-routines"
                    onClick={() => {
                        selectTab("routines");
                    }}
                >
                    {t("routines.tabRoutines")}
                </button>
                <button
                    type="button"
                    role="tab"
                    id="tab-activities"
                    aria-selected={tab === "activities"}
                    aria-controls="panel-activities"
                    onClick={() => {
                        selectTab("activities");
                    }}
                >
                    {t("routines.tabActivities")}
                </button>
            </div>

            <label className="checkbox">
                <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(event) => {
                        setShowArchived(event.target.checked);
                    }}
                />
                <span>{t("routines.showArchived")}</span>
            </label>

            {tab === "routines" ? (
                <section
                    id="panel-routines"
                    role="tabpanel"
                    aria-labelledby="tab-routines"
                >
                    <button
                        type="button"
                        className="button button-primary"
                        onClick={() => {
                            void navigate("/routines/new");
                        }}
                    >
                        <Icon name="plus" />
                        {t("routines.new")}
                    </button>

                    {visibleRoutines.length === 0 ? (
                        <div className="card">
                            <h2>{t("routines.emptyTitle")}</h2>
                            <p>{t("routines.emptyDescription")}</p>
                        </div>
                    ) : (
                        <ul className="card-list">
                            {visibleRoutines.map((routine) => {
                                const plannedMinutes = Math.round(
                                    routine.steps.reduce(
                                        (total, step) =>
                                            total + step.plannedSeconds,
                                        0,
                                    ) / 60,
                                );
                                return (
                                    <li key={routine.id} className="card">
                                        <div className="card-head">
                                            <h2>{routine.name}</h2>
                                            {routine.archived ? (
                                                <span className="badge">
                                                    {t(
                                                        "routines.archivedBadge",
                                                    )}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="muted">
                                            {t("routines.stepCount", {
                                                count: routine.steps.length,
                                            })}
                                            {" · "}
                                            {t("routines.plannedTotal", {
                                                minutes: plannedMinutes,
                                            })}
                                        </p>
                                        <p className="muted">
                                            {routine.lastUsedAt
                                                ? t("routines.lastUsed", {
                                                      date: formatDate(
                                                          routine.lastUsedAt,
                                                          settings.language,
                                                      ),
                                                  })
                                                : t("routines.neverUsed")}
                                        </p>
                                        <div className="row row-wrap">
                                            <button
                                                type="button"
                                                className="button button-primary"
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
                                            <button
                                                type="button"
                                                className="button"
                                                onClick={() => {
                                                    void navigate(
                                                        `/routines/${routine.id}`,
                                                    );
                                                }}
                                            >
                                                <Icon name="edit" />
                                                {t("common.edit")}
                                            </button>
                                            <button
                                                type="button"
                                                className="button"
                                                onClick={() => {
                                                    void store.duplicateRoutine(
                                                        routine,
                                                        `${routine.name} ${t("common.copySuffix")}`,
                                                    );
                                                }}
                                            >
                                                <Icon name="copy" />
                                                {t("common.duplicate")}
                                            </button>
                                            <button
                                                type="button"
                                                className="button"
                                                onClick={() => {
                                                    void store.updateRoutine({
                                                        ...routine,
                                                        archived:
                                                            !routine.archived,
                                                    });
                                                }}
                                            >
                                                <Icon name="archive" />
                                                {routine.archived
                                                    ? t("common.unarchive")
                                                    : t("common.archive")}
                                            </button>
                                            <button
                                                type="button"
                                                className="button button-danger"
                                                onClick={() => {
                                                    setPendingDelete({
                                                        kind: "routine",
                                                        routine,
                                                    });
                                                }}
                                            >
                                                <Icon name="trash" />
                                                {t("common.delete")}
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            ) : (
                <section
                    id="panel-activities"
                    role="tabpanel"
                    aria-labelledby="tab-activities"
                >
                    <button
                        type="button"
                        className="button button-primary"
                        onClick={() => {
                            void navigate("/activities/new");
                        }}
                    >
                        <Icon name="plus" />
                        {t("activities.new")}
                    </button>

                    {visibleActivities.length === 0 ? (
                        <div className="card">
                            <h2>{t("activities.emptyTitle")}</h2>
                            <p>{t("activities.emptyDescription")}</p>
                        </div>
                    ) : (
                        <ul className="card-list">
                            {visibleActivities.map((activity) => {
                                const area = areas.find(
                                    (candidate) =>
                                        candidate.id ===
                                        activity.practiceAreaId,
                                );
                                const usedIn = routines.filter((routine) =>
                                    routine.steps.some(
                                        (step) =>
                                            step.activityId === activity.id,
                                    ),
                                ).length;
                                return (
                                    <li key={activity.id} className="card">
                                        <div className="card-head">
                                            <h2>{activity.title}</h2>
                                            {activity.archived ? (
                                                <span className="badge">
                                                    {t(
                                                        "activities.archivedBadge",
                                                    )}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="muted">
                                            {store.areaLabel(area)}
                                            {activity.targetBpm
                                                ? ` · ${activity.targetBpm} ${t("common.bpm")}`
                                                : ""}
                                            {` · ${t("activities.usedIn", { count: usedIn })}`}
                                        </p>
                                        <div className="row row-wrap">
                                            <button
                                                type="button"
                                                className="button"
                                                onClick={() => {
                                                    void navigate(
                                                        `/activities/${activity.id}`,
                                                    );
                                                }}
                                            >
                                                <Icon name="edit" />
                                                {t("common.edit")}
                                            </button>
                                            <button
                                                type="button"
                                                className="button"
                                                onClick={() => {
                                                    void store.updateActivity({
                                                        ...activity,
                                                        archived:
                                                            !activity.archived,
                                                    });
                                                }}
                                            >
                                                <Icon name="archive" />
                                                {activity.archived
                                                    ? t("common.unarchive")
                                                    : t("common.archive")}
                                            </button>
                                            <button
                                                type="button"
                                                className="button button-danger"
                                                onClick={() => {
                                                    setPendingDelete({
                                                        kind: "activity",
                                                        activity,
                                                    });
                                                }}
                                            >
                                                <Icon name="trash" />
                                                {t("common.delete")}
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            )}

            <ConfirmDialog
                open={pendingDelete !== null}
                title={t("common.delete")}
                message={
                    pendingDelete?.kind === "routine"
                        ? t("routines.deleteConfirm", {
                              name: pendingDelete.routine.name,
                          })
                        : pendingDelete?.kind === "activity"
                          ? t("activities.deleteConfirm", {
                                title: pendingDelete.activity.title,
                            })
                          : ""
                }
                confirmLabel={t("common.delete")}
                destructive
                onCancel={() => {
                    setPendingDelete(null);
                }}
                onConfirm={() => {
                    if (pendingDelete?.kind === "routine") {
                        void store.deleteRoutine(pendingDelete.routine.id);
                    } else if (pendingDelete?.kind === "activity") {
                        void store.deleteActivity(pendingDelete.activity.id);
                    }
                    setPendingDelete(null);
                }}
            />
        </div>
    );
}
