import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAppStore } from "../../app/store";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { ActivityForm } from "./ActivityForm";
import { createId, nowIso } from "../../data/ids";
import { limits, type RoutineStep } from "../../data/types";

function moveItem<T>(items: T[], from: number, to: number): T[] {
    if (to < 0 || to >= items.length) {
        return items;
    }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (moved !== undefined) {
        next.splice(to, 0, moved);
    }
    return next;
}

export function RoutineEditorPage() {
    const store = useAppStore();
    const { t, routines, activities } = store;
    const navigate = useNavigate();
    const { routineId } = useParams();
    const routine = routines.find((candidate) => candidate.id === routineId);
    const isNew = routineId === undefined;

    const [name, setName] = useState(routine?.name ?? "");
    const [description, setDescription] = useState(routine?.description ?? "");
    const [steps, setSteps] = useState<RoutineStep[]>(routine?.steps ?? []);
    const [dirty, setDirty] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);
    const [creatingActivity, setCreatingActivity] = useState(false);

    if (!isNew && !routine) {
        return (
            <div className="page">
                <p>{t("error.notFound")}</p>
            </div>
        );
    }

    const selectableActivities = activities.filter(
        (activity) =>
            !activity.archived ||
            steps.some((step) => step.activityId === activity.id),
    );

    const changeSteps = (next: RoutineStep[]) => {
        setSteps(next);
        setDirty(true);
    };

    const addStep = (activityId: string) => {
        changeSteps([
            ...steps,
            {
                id: createId(),
                activityId,
                plannedSeconds: 600,
                targetBpmOverride: null,
            },
        ]);
    };

    const persist = async (): Promise<string | null> => {
        const trimmed = name.trim();
        if (!trimmed) {
            setNameError(t("routineEditor.nameRequired"));
            return null;
        }
        setNameError(null);
        if (routine) {
            await store.updateRoutine({
                ...routine,
                name: trimmed,
                description,
                steps,
            });
            setDirty(false);
            return routine.id;
        }
        const created = await store.createRoutine({
            name: trimmed,
            description,
            steps: steps.map((step) => ({
                activityId: step.activityId,
                plannedSeconds: step.plannedSeconds,
                targetBpmOverride: step.targetBpmOverride,
            })),
        });
        setDirty(false);
        return created?.id ?? null;
    };

    const totalMinutes = Math.round(
        steps.reduce((total, step) => total + step.plannedSeconds, 0) / 60,
    );

    return (
        <div className="page">
            <header className="page-header">
                <h1>
                    {isNew
                        ? t("routineEditor.newTitle")
                        : t("routineEditor.editTitle")}
                </h1>
                <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => {
                        void navigate("/routines");
                    }}
                >
                    <Icon name="previous" />
                    {t("common.back")}
                </button>
            </header>

            <div className="field">
                <label htmlFor="routine-name">{t("routineEditor.name")}</label>
                <input
                    id="routine-name"
                    type="text"
                    value={name}
                    maxLength={limits.title}
                    placeholder={t("routineEditor.namePlaceholder")}
                    aria-invalid={nameError ? true : undefined}
                    aria-describedby={
                        nameError ? "routine-name-error" : undefined
                    }
                    onChange={(event) => {
                        setName(event.target.value);
                        setDirty(true);
                    }}
                />
                {nameError ? (
                    <p className="field-error" id="routine-name-error">
                        {nameError}
                    </p>
                ) : null}
            </div>

            <div className="field">
                <label htmlFor="routine-description">
                    {t("routineEditor.description")}
                </label>
                <textarea
                    id="routine-description"
                    rows={2}
                    value={description}
                    maxLength={limits.longText}
                    onChange={(event) => {
                        setDescription(event.target.value);
                        setDirty(true);
                    }}
                />
            </div>

            <section>
                <h2>{t("routineEditor.steps")}</h2>
                <p className="muted">
                    {t("routines.plannedTotal", { minutes: totalMinutes })}
                </p>
                {steps.length === 0 ? (
                    <p className="notice">{t("routineEditor.emptySteps")}</p>
                ) : (
                    <ol className="step-list">
                        {steps.map((step, index) => (
                            <li key={step.id} className="card">
                                <p className="muted">
                                    {t("routineEditor.position", {
                                        index: index + 1,
                                        total: steps.length,
                                    })}
                                </p>
                                <div className="field">
                                    <label htmlFor={`step-activity-${step.id}`}>
                                        {t("routineEditor.stepActivity")}
                                    </label>
                                    <select
                                        id={`step-activity-${step.id}`}
                                        value={step.activityId}
                                        onChange={(event) => {
                                            changeSteps(
                                                steps.map((candidate) =>
                                                    candidate.id === step.id
                                                        ? {
                                                              ...candidate,
                                                              activityId:
                                                                  event.target
                                                                      .value,
                                                          }
                                                        : candidate,
                                                ),
                                            );
                                        }}
                                    >
                                        {selectableActivities.map(
                                            (activity) => (
                                                <option
                                                    key={activity.id}
                                                    value={activity.id}
                                                >
                                                    {activity.title}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                                <div className="field-row">
                                    <div className="field field-narrow">
                                        <label
                                            htmlFor={`step-minutes-${step.id}`}
                                        >
                                            {t("routineEditor.stepMinutes")}
                                        </label>
                                        <input
                                            id={`step-minutes-${step.id}`}
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            max={600}
                                            value={Math.round(
                                                step.plannedSeconds / 60,
                                            )}
                                            onChange={(event) => {
                                                const minutes = Math.max(
                                                    0,
                                                    Math.min(
                                                        600,
                                                        Number.parseInt(
                                                            event.target.value,
                                                            10,
                                                        ) || 0,
                                                    ),
                                                );
                                                changeSteps(
                                                    steps.map((candidate) =>
                                                        candidate.id === step.id
                                                            ? {
                                                                  ...candidate,
                                                                  plannedSeconds:
                                                                      minutes *
                                                                      60,
                                                              }
                                                            : candidate,
                                                    ),
                                                );
                                            }}
                                        />
                                    </div>
                                    <div className="field field-narrow">
                                        <label htmlFor={`step-bpm-${step.id}`}>
                                            {t("routineEditor.stepBpm")}
                                        </label>
                                        <input
                                            id={`step-bpm-${step.id}`}
                                            type="number"
                                            inputMode="numeric"
                                            min={limits.minBpm}
                                            max={limits.maxBpm}
                                            value={
                                                step.targetBpmOverride === null
                                                    ? ""
                                                    : step.targetBpmOverride
                                            }
                                            onChange={(event) => {
                                                const parsed = Number.parseInt(
                                                    event.target.value,
                                                    10,
                                                );
                                                changeSteps(
                                                    steps.map((candidate) =>
                                                        candidate.id === step.id
                                                            ? {
                                                                  ...candidate,
                                                                  targetBpmOverride:
                                                                      Number.isFinite(
                                                                          parsed,
                                                                      )
                                                                          ? Math.min(
                                                                                limits.maxBpm,
                                                                                Math.max(
                                                                                    limits.minBpm,
                                                                                    parsed,
                                                                                ),
                                                                            )
                                                                          : null,
                                                              }
                                                            : candidate,
                                                    ),
                                                );
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="row row-wrap">
                                    <button
                                        type="button"
                                        className="button"
                                        disabled={index === 0}
                                        onClick={() => {
                                            changeSteps(
                                                moveItem(
                                                    steps,
                                                    index,
                                                    index - 1,
                                                ),
                                            );
                                        }}
                                    >
                                        <Icon name="up" />
                                        {t("common.moveUp")}
                                    </button>
                                    <button
                                        type="button"
                                        className="button"
                                        disabled={index === steps.length - 1}
                                        onClick={() => {
                                            changeSteps(
                                                moveItem(
                                                    steps,
                                                    index,
                                                    index + 1,
                                                ),
                                            );
                                        }}
                                    >
                                        <Icon name="down" />
                                        {t("common.moveDown")}
                                    </button>
                                    <button
                                        type="button"
                                        className="button button-danger"
                                        onClick={() => {
                                            changeSteps(
                                                steps.filter(
                                                    (candidate) =>
                                                        candidate.id !==
                                                        step.id,
                                                ),
                                            );
                                        }}
                                    >
                                        <Icon name="trash" />
                                        {t("common.remove")}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ol>
                )}

                <div className="row row-wrap">
                    <button
                        type="button"
                        className="button"
                        disabled={
                            selectableActivities.length === 0 ||
                            steps.length >= limits.routineSteps
                        }
                        onClick={() => {
                            const first = selectableActivities[0];
                            if (first) {
                                addStep(first.id);
                            }
                        }}
                    >
                        <Icon name="plus" />
                        {t("routineEditor.addStep")}
                    </button>
                    <button
                        type="button"
                        className="button"
                        onClick={() => {
                            setCreatingActivity(true);
                        }}
                    >
                        <Icon name="plus" />
                        {t("routineEditor.newActivity")}
                    </button>
                </div>
            </section>

            {dirty ? (
                <p className="notice" role="status">
                    {t("routineEditor.unsavedChanges")}
                </p>
            ) : null}

            <div className="row row-wrap sticky-actions">
                <button
                    type="button"
                    className="button button-primary"
                    onClick={() => {
                        void persist().then((id) => {
                            if (id) {
                                void navigate("/routines");
                            }
                        });
                    }}
                >
                    {t("common.save")}
                </button>
                <button
                    type="button"
                    className="button"
                    disabled={steps.length === 0}
                    onClick={() => {
                        void persist().then(async (id) => {
                            if (!id) {
                                return;
                            }
                            const session = await store.startRoutineSession({
                                id,
                                name: name.trim(),
                                description,
                                steps,
                                archived: false,
                                lastUsedAt: routine?.lastUsedAt ?? null,
                                createdAt: routine?.createdAt ?? nowIso(),
                                updatedAt: nowIso(),
                            });
                            if (session) {
                                void navigate(`/practice/${session.id}`);
                            }
                        });
                    }}
                >
                    <Icon name="play" />
                    {t("routineEditor.saveAndStart")}
                </button>
            </div>

            <Modal
                open={creatingActivity}
                title={t("activityForm.newTitle")}
                onClose={() => {
                    setCreatingActivity(false);
                }}
            >
                <ActivityForm
                    submitLabel={t("common.add")}
                    onCancel={() => {
                        setCreatingActivity(false);
                    }}
                    onSubmit={(input) => {
                        void store.createActivity(input).then((activity) => {
                            if (activity) {
                                addStep(activity.id);
                            }
                            setCreatingActivity(false);
                        });
                    }}
                />
            </Modal>
        </div>
    );
}
