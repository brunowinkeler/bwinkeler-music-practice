import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router";
import { useAppStore } from "./store";
import { useOnlineStatus } from "./hooks";
import { Icon, type IconName } from "../components/Icon";
import { applyPendingUpdate, subscribeToUpdates } from "../pwa";
import type { MessageKey } from "../i18n";

const destinations: { to: string; labelKey: MessageKey; icon: IconName }[] = [
    { to: "/", labelKey: "nav.today", icon: "home" },
    { to: "/routines", labelKey: "nav.routines", icon: "list" },
    { to: "/history", labelKey: "nav.history", icon: "history" },
    { to: "/progress", labelKey: "nav.progress", icon: "chart" },
    { to: "/settings", labelKey: "nav.settings", icon: "settings" },
];

function UpdateBanner() {
    const { t, activeSession } = useAppStore();
    const [pending, setPending] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => subscribeToUpdates(setPending), []);

    if (!pending || dismissed) {
        return null;
    }
    const blocked = activeSession !== null;
    return (
        <div className="banner" role="status">
            <div>
                <strong>{t("pwa.updateTitle")}</strong>
                <p>
                    {blocked
                        ? t("pwa.updateDuringSession")
                        : t("pwa.updateDescription")}
                </p>
            </div>
            <div className="banner-actions">
                <button
                    type="button"
                    className="button button-primary"
                    disabled={blocked}
                    onClick={() => {
                        void applyPendingUpdate();
                    }}
                >
                    {t("pwa.updateNow")}
                </button>
                <button
                    type="button"
                    className="button"
                    onClick={() => {
                        setDismissed(true);
                    }}
                >
                    {t("pwa.updateLater")}
                </button>
            </div>
        </div>
    );
}

function ErrorBanner() {
    const { errorKey, dismissError, t } = useAppStore();
    if (!errorKey) {
        return null;
    }
    return (
        <div className="banner banner-error" role="alert">
            <div>
                <Icon name="alert" />
                <p>{t(errorKey)}</p>
            </div>
            <button type="button" className="button" onClick={dismissError}>
                {t("common.close")}
            </button>
        </div>
    );
}

export function AppShell({
    children,
    focusMode,
}: {
    children: ReactNode;
    focusMode: boolean;
}) {
    const { t, liveMessage } = useAppStore();
    const online = useOnlineStatus();

    return (
        <div className={focusMode ? "shell shell-focus" : "shell"}>
            <a className="skip-link" href="#main">
                {t("app.skipToContent")}
            </a>
            {focusMode ? null : (
                <nav className="nav" aria-label={t("nav.label")}>
                    <p className="nav-brand">
                        <Icon name="music" />
                        <span>{t("app.name")}</span>
                    </p>
                    <ul>
                        {destinations.map((destination) => (
                            <li key={destination.to}>
                                <NavLink
                                    to={destination.to}
                                    end={destination.to === "/"}
                                >
                                    <Icon name={destination.icon} />
                                    <span>{t(destination.labelKey)}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
            <main id="main" className="main" tabIndex={-1}>
                <UpdateBanner />
                <ErrorBanner />
                {online ? null : (
                    <p className="offline-note" role="status">
                        {t("pwa.offline")}
                    </p>
                )}
                {children}
            </main>
            <p className="visually-hidden" role="status" aria-live="polite">
                {liveMessage}
            </p>
        </div>
    );
}
