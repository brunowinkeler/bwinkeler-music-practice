import type { MessageKey } from "../i18n";
import type { BuiltInAreaKey } from "./types";

/** Editable first routine offered during onboarding. */
export const starterActivities: {
    titleKey: MessageKey;
    areaKey: BuiltInAreaKey;
    minutes: number;
}[] = [
    { titleKey: "starter.warmUp", areaKey: "technique", minutes: 5 },
    { titleKey: "starter.scales", areaKey: "scalesChords", minutes: 10 },
    { titleKey: "starter.lesson", areaKey: "courseStudy", minutes: 10 },
    { titleKey: "starter.repertoire", areaKey: "repertoire", minutes: 15 },
];
