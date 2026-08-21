import { useNavigate, useParams } from "react-router";
import { useAppStore } from "../../app/store";
import { ActivityForm } from "./ActivityForm";
import { Icon } from "../../components/Icon";

export function ActivityEditorPage() {
    const store = useAppStore();
    const { t, activities } = store;
    const navigate = useNavigate();
    const { activityId } = useParams();
    const activity = activities.find(
        (candidate) => candidate.id === activityId,
    );
    const isNew = activityId === undefined;

    if (!isNew && !activity) {
        return (
            <div className="page">
                <p>{t("error.notFound")}</p>
            </div>
        );
    }

    const goBack = () => {
        void navigate("/routines?tab=activities");
    };

    return (
        <div className="page">
            <header className="page-header">
                <h1>
                    {isNew
                        ? t("activityForm.newTitle")
                        : t("activityForm.editTitle")}
                </h1>
            </header>
            {activity?.sourceUrl ? (
                <p>
                    <a
                        className="button button-quiet"
                        href={activity.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Icon name="external" />
                        {t("activityForm.openSource")}
                    </a>
                </p>
            ) : null}
            <ActivityForm
                {...(activity ? { activity } : {})}
                submitLabel={t("common.save")}
                onCancel={goBack}
                onSubmit={(input) => {
                    if (activity) {
                        void store
                            .updateActivity({ ...activity, ...input })
                            .then(goBack);
                    } else {
                        void store.createActivity(input).then(goBack);
                    }
                }}
            />
        </div>
    );
}
