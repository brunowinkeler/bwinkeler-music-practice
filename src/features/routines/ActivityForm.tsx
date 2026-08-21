import { useId, useState, type FormEvent } from "react";
import { useAppStore } from "../../app/store";
import { sanitizeUrl } from "../../data/validation";
import { limits, type Activity } from "../../data/types";
import type { ActivityInput } from "../../data/repository";
import { Icon } from "../../components/Icon";

export interface ActivityFormProps {
    activity?: Activity;
    submitLabel: string;
    onSubmit: (input: ActivityInput) => void;
    onCancel: () => void;
}

export function ActivityForm({
    activity,
    submitLabel,
    onSubmit,
    onCancel,
}: ActivityFormProps) {
    const store = useAppStore();
    const { t, areas } = store;
    const fieldId = useId();
    const [title, setTitle] = useState(activity?.title ?? "");
    const [areaId, setAreaId] = useState(
        activity?.practiceAreaId ?? areas[0]?.id ?? "",
    );
    const [instructions, setInstructions] = useState(
        activity?.instructions ?? "",
    );
    const [sourceLabel, setSourceLabel] = useState(activity?.sourceLabel ?? "");
    const [sourceReference, setSourceReference] = useState(
        activity?.sourceReference ?? "",
    );
    const [sourceUrl, setSourceUrl] = useState(activity?.sourceUrl ?? "");
    const [targetBpm, setTargetBpm] = useState(
        activity?.targetBpm === null || activity?.targetBpm === undefined
            ? ""
            : String(activity.targetBpm),
    );
    const [newAreaName, setNewAreaName] = useState("");
    const [addingArea, setAddingArea] = useState(false);
    const [errors, setErrors] = useState<{ title?: string; url?: string }>({});

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const trimmedTitle = title.trim();
        const trimmedUrl = sourceUrl.trim();
        const safeUrl = sanitizeUrl(trimmedUrl);
        const nextErrors: { title?: string; url?: string } = {};
        if (!trimmedTitle) {
            nextErrors.title = t("activityForm.titleRequired");
        }
        if (trimmedUrl && !safeUrl) {
            nextErrors.url = t("activityForm.invalidUrl");
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            return;
        }
        const parsedBpm = Number.parseInt(targetBpm, 10);
        onSubmit({
            title: trimmedTitle.slice(0, limits.title),
            practiceAreaId: areaId,
            instructions: instructions.slice(0, limits.longText),
            sourceLabel: sourceLabel.slice(0, limits.shortText),
            sourceReference: sourceReference.slice(0, limits.shortText),
            sourceUrl: safeUrl,
            targetBpm: Number.isFinite(parsedBpm)
                ? Math.min(limits.maxBpm, Math.max(limits.minBpm, parsedBpm))
                : null,
        });
    };

    return (
        <form className="form" onSubmit={submit} noValidate>
            <div className="field">
                <label htmlFor={`${fieldId}-title`}>
                    {t("activityForm.titleLabel")}
                </label>
                <input
                    id={`${fieldId}-title`}
                    type="text"
                    value={title}
                    maxLength={limits.title}
                    required
                    placeholder={t("activityForm.titlePlaceholder")}
                    aria-describedby={
                        errors.title ? `${fieldId}-title-error` : undefined
                    }
                    aria-invalid={errors.title ? true : undefined}
                    onChange={(event) => {
                        setTitle(event.target.value);
                    }}
                />
                {errors.title ? (
                    <p className="field-error" id={`${fieldId}-title-error`}>
                        {errors.title}
                    </p>
                ) : null}
            </div>

            <div className="field">
                <label htmlFor={`${fieldId}-area`}>
                    {t("activityForm.area")}
                </label>
                <select
                    id={`${fieldId}-area`}
                    value={areaId}
                    onChange={(event) => {
                        setAreaId(event.target.value);
                    }}
                >
                    {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                            {store.areaLabel(area)}
                        </option>
                    ))}
                </select>
                {addingArea ? (
                    <div className="row">
                        <input
                            type="text"
                            aria-label={t("areas.newAreaName")}
                            value={newAreaName}
                            maxLength={limits.title}
                            onChange={(event) => {
                                setNewAreaName(event.target.value);
                            }}
                        />
                        <button
                            type="button"
                            className="button"
                            onClick={() => {
                                const name = newAreaName.trim();
                                if (!name) {
                                    return;
                                }
                                void store.createArea(name).then((area) => {
                                    if (area) {
                                        setAreaId(area.id);
                                    }
                                    setNewAreaName("");
                                    setAddingArea(false);
                                });
                            }}
                        >
                            {t("common.add")}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="button button-quiet"
                        onClick={() => {
                            setAddingArea(true);
                        }}
                    >
                        <Icon name="plus" />
                        {t("areas.newArea")}
                    </button>
                )}
            </div>

            <div className="field">
                <label htmlFor={`${fieldId}-instructions`}>
                    {t("activityForm.instructions")}
                </label>
                <textarea
                    id={`${fieldId}-instructions`}
                    value={instructions}
                    rows={3}
                    maxLength={limits.longText}
                    placeholder={t("activityForm.instructionsPlaceholder")}
                    onChange={(event) => {
                        setInstructions(event.target.value);
                    }}
                />
            </div>

            <div className="field-row">
                <div className="field">
                    <label htmlFor={`${fieldId}-source`}>
                        {t("activityForm.sourceLabel")}
                    </label>
                    <input
                        id={`${fieldId}-source`}
                        type="text"
                        value={sourceLabel}
                        maxLength={limits.shortText}
                        onChange={(event) => {
                            setSourceLabel(event.target.value);
                        }}
                    />
                </div>
                <div className="field">
                    <label htmlFor={`${fieldId}-reference`}>
                        {t("activityForm.sourceReference")}
                    </label>
                    <input
                        id={`${fieldId}-reference`}
                        type="text"
                        value={sourceReference}
                        maxLength={limits.shortText}
                        onChange={(event) => {
                            setSourceReference(event.target.value);
                        }}
                    />
                </div>
            </div>

            <div className="field">
                <label htmlFor={`${fieldId}-url`}>
                    {t("activityForm.sourceUrl")}
                </label>
                <input
                    id={`${fieldId}-url`}
                    type="url"
                    inputMode="url"
                    value={sourceUrl}
                    maxLength={limits.url}
                    aria-describedby={`${fieldId}-url-hint`}
                    aria-invalid={errors.url ? true : undefined}
                    onChange={(event) => {
                        setSourceUrl(event.target.value);
                    }}
                />
                <p className="field-hint" id={`${fieldId}-url-hint`}>
                    {t("activityForm.sourceUrlHint")}
                </p>
                {errors.url ? (
                    <p className="field-error">{errors.url}</p>
                ) : null}
            </div>

            <div className="field field-narrow">
                <label htmlFor={`${fieldId}-bpm`}>
                    {t("activityForm.targetBpm")}
                </label>
                <input
                    id={`${fieldId}-bpm`}
                    type="number"
                    inputMode="numeric"
                    min={limits.minBpm}
                    max={limits.maxBpm}
                    value={targetBpm}
                    onChange={(event) => {
                        setTargetBpm(event.target.value);
                    }}
                />
            </div>

            <div className="row">
                <button type="submit" className="button button-primary">
                    {submitLabel}
                </button>
                <button type="button" className="button" onClick={onCancel}>
                    {t("common.cancel")}
                </button>
            </div>
        </form>
    );
}
