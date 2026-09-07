import { Route, Routes, useLocation } from "react-router";
import { useAppStore } from "./store";
import { AppShell } from "./AppShell";
import { TodayPage } from "../features/today/TodayPage";
import { RoutinesPage } from "../features/routines/RoutinesPage";
import { RoutineEditorPage } from "../features/routines/RoutineEditorPage";
import { ActivityEditorPage } from "../features/routines/ActivityEditorPage";
import { QuickPracticePage } from "../features/practice/QuickPracticePage";
import { PracticePage } from "../features/practice/PracticePage";
import { ChordsPage } from "../features/chords/ChordsPage";
import { HistoryPage } from "../features/history/HistoryPage";
import { SessionDetailPage } from "../features/history/SessionDetailPage";
import { ProgressPage } from "../features/progress/ProgressPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { NotFoundPage } from "../features/NotFoundPage";
import { FirstRunDialog } from "../features/onboarding/FirstRunDialog";

export function App() {
    const { ready, t, settings } = useAppStore();
    const location = useLocation();
    const inSession = location.pathname.startsWith("/practice/");

    if (!ready) {
        return (
            <p className="boot-message" role="status">
                {t("common.loading")}
            </p>
        );
    }

    return (
        <AppShell focusMode={inSession}>
            {settings.onboardingCompletedAt === null ? (
                <FirstRunDialog />
            ) : null}
            <Routes>
                <Route path="/" element={<TodayPage />} />
                <Route path="/routines" element={<RoutinesPage />} />
                <Route path="/routines/new" element={<RoutineEditorPage />} />
                <Route
                    path="/routines/:routineId"
                    element={<RoutineEditorPage />}
                />
                <Route
                    path="/activities/new"
                    element={<ActivityEditorPage />}
                />
                <Route
                    path="/activities/:activityId"
                    element={<ActivityEditorPage />}
                />
                <Route path="/practice/quick" element={<QuickPracticePage />} />
                <Route path="/practice/:sessionId" element={<PracticePage />} />
                <Route path="/chords" element={<ChordsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route
                    path="/history/:sessionId"
                    element={<SessionDetailPage />}
                />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </AppShell>
    );
}
