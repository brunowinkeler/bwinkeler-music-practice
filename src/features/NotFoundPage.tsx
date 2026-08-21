import { useNavigate } from "react-router";
import { useAppStore } from "../app/store";

export function NotFoundPage() {
    const { t } = useAppStore();
    const navigate = useNavigate();
    return (
        <div className="page">
            <h1>{t("error.notFound")}</h1>
            <button
                type="button"
                className="button button-primary"
                onClick={() => {
                    void navigate("/");
                }}
            >
                {t("error.backToToday")}
            </button>
        </div>
    );
}
