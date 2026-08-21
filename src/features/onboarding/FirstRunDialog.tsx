import { useState } from "react";
import { useAppStore } from "../../app/store";
import { Modal } from "../../components/Modal";
import { starterActivities } from "../../data/starter";
import { languageNames } from "../../i18n";
import type { LanguageCode, ThemePreference } from "../../data/types";
import { nowIso } from "../../data/ids";

const themeOptions: {
    value: ThemePreference;
    labelKey: "theme.light" | "theme.dark" | "theme.system";
}[] = [
    { value: "light", labelKey: "theme.light" },
    { value: "dark", labelKey: "theme.dark" },
    { value: "system", labelKey: "theme.system" },
];

export function FirstRunDialog() {
    const store = useAppStore();
    const { t, settings, areas } = store;
    const [busy, setBusy] = useState(false);

    const finish = async (withStarter: boolean) => {
        setBusy(true);
        if (withStarter) {
            const stepInputs: {
                activityId: string;
                plannedSeconds: number;
                targetBpmOverride: null;
            }[] = [];
            for (const starter of starterActivities) {
                const area = areas.find(
                    (candidate) => candidate.builtInKey === starter.areaKey,
                );
                const activity = await store.createActivity({
                    title: t(starter.titleKey),
                    practiceAreaId: area?.id ?? areas[0]?.id ?? "",
                });
                if (activity) {
                    stepInputs.push({
                        activityId: activity.id,
                        plannedSeconds: starter.minutes * 60,
                        targetBpmOverride: null,
                    });
                }
            }
            await store.createRoutine({
                name: t("starter.routineName"),
                steps: stepInputs,
            });
        }
        await store.updateSettings({ onboardingCompletedAt: nowIso() });
        setBusy(false);
    };

    return (
        <Modal
            open
            title={t("onboarding.title")}
            onClose={() => {
                void finish(false);
            }}
            footer={
                <>
                    <button
                        type="button"
                        className="button"
                        disabled={busy}
                        onClick={() => {
                            void finish(false);
                        }}
                    >
                        {t("onboarding.startEmpty")}
                    </button>
                    <button
                        type="button"
                        className="button button-primary"
                        disabled={busy}
                        onClick={() => {
                            void finish(true);
                        }}
                    >
                        {t("onboarding.startWithRoutine")}
                    </button>
                </>
            }
        >
            <p>{t("onboarding.description")}</p>
            <div className="field">
                <label htmlFor="onboarding-language">
                    {t("onboarding.language")}
                </label>
                <select
                    id="onboarding-language"
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
                <legend>{t("onboarding.theme")}</legend>
                <div className="segmented">
                    {themeOptions.map((option) => (
                        <label key={option.value}>
                            <input
                                type="radio"
                                name="onboarding-theme"
                                value={option.value}
                                checked={settings.theme === option.value}
                                onChange={() => {
                                    void store.updateSettings({
                                        theme: option.value,
                                    });
                                }}
                            />
                            <span>{t(option.labelKey)}</span>
                        </label>
                    ))}
                </div>
            </fieldset>
            <h3>{t("onboarding.starterTitle")}</h3>
            <p>{t("onboarding.starterDescription")}</p>
            <p className="notice">{t("onboarding.storageNotice")}</p>
        </Modal>
    );
}
