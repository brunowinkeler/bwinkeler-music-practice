import { useState } from "react";
import { useNavigate } from "react-router";
import { useAppStore } from "../../app/store";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { ActivityForm } from "../routines/ActivityForm";

export function QuickPracticePage() {
    const store = useAppStore();
    const { t, activities } = store;
    const navigate = useNavigate();
    const available = activities.filter((activity) => !activity.archived);
    const [activityId, setActivityId] = useState(available[0]?.id ?? "");
    const [creating, setCreating] = useState(false);

    const start = async (id: string) => {
        const activity = store.activities.find(
            (candidate) => candidate.id === id,
        );
        if (!activity) {
            return;
        }
        const session = await store.startQuickSession(activity);
        if (session) {
            store.announce(t("practice.announceStart"));
            void navigate(`/practice/${session.id}`);
        }
    };

    return (
        <div className="page">
            <header className="page-header">
                <h1>{t("quick.title")}</h1>
                <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => {
                        void navigate("/");
                    }}
                >
                    <Icon name="previous" />
                    {t("common.back")}
                </button>
            </header>
            <p>{t("quick.description")}</p>

            {available.length === 0 ? (
                <p className="notice">{t("quick.noActivities")}</p>
            ) : (
                <div className="field">
                    <label htmlFor="quick-activity">
                        {t("quick.chooseActivity")}
                    </label>
                    <select
                        id="quick-activity"
                        value={activityId}
                        onChange={(event) => {
                            setActivityId(event.target.value);
                        }}
                    >
                        {available.map((activity) => (
                            <option key={activity.id} value={activity.id}>
                                {activity.title}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="row row-wrap">
                <button
                    type="button"
                    id="quick-start"
                    className="button button-primary button-large"
                    disabled={!activityId}
                    onClick={() => {
                        void start(activityId);
                    }}
                >
                    <Icon name="play" />
                    {t("quick.start")}
                </button>
                <button
                    type="button"
                    className="button"
                    onClick={() => {
                        setCreating(true);
                    }}
                >
                    <Icon name="plus" />
                    {t("activities.new")}
                </button>
            </div>

            <Modal
                open={creating}
                title={t("activityForm.newTitle")}
                onClose={() => {
                    setCreating(false);
                }}
            >
                <ActivityForm
                    submitLabel={t("quick.start")}
                    onCancel={() => {
                        setCreating(false);
                    }}
                    onSubmit={(input) => {
                        void store.createActivity(input).then((activity) => {
                            setCreating(false);
                            if (activity) {
                                void start(activity.id);
                            }
                        });
                    }}
                />
            </Modal>
        </div>
    );
}
