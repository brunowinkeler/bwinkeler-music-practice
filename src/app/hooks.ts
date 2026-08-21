import { useEffect, useState } from "react";

/** Re-renders on a fixed cadence so timers stay smooth without owning time. */
export function useNow(intervalMs: number, active = true): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!active) {
            return;
        }
        const timer = setInterval(() => {
            setNow(Date.now());
        }, intervalMs);
        const onVisible = () => {
            if (document.visibilityState === "visible") {
                setNow(Date.now());
            }
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [active, intervalMs]);

    return now;
}

export function useOnlineStatus(): boolean {
    const [online, setOnline] = useState(() =>
        typeof navigator === "undefined" ? true : navigator.onLine,
    );
    useEffect(() => {
        const update = () => {
            setOnline(navigator.onLine);
        };
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);
    return online;
}
