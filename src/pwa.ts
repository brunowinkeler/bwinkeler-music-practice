import { registerSW } from "virtual:pwa-register";

/**
 * Update policy: never reload while the learner is practising. The service
 * worker waits, the prompt explains why, and the reload happens on request.
 */

type UpdateListener = (needsRefresh: boolean) => void;

let needsRefresh = false;
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<UpdateListener>();

function publish(): void {
    for (const listener of listeners) {
        listener(needsRefresh);
    }
}

export function subscribeToUpdates(listener: UpdateListener): () => void {
    listeners.add(listener);
    listener(needsRefresh);
    return () => {
        listeners.delete(listener);
    };
}

export function updateAvailable(): boolean {
    return needsRefresh;
}

export async function applyPendingUpdate(): Promise<void> {
    await applyUpdate?.(true);
}

export function registerServiceWorker(): void {
    if (!("serviceWorker" in navigator)) {
        return;
    }
    applyUpdate = registerSW({
        immediate: true,
        onNeedRefresh() {
            needsRefresh = true;
            publish();
        },
    });
}

export async function checkForUpdate(): Promise<boolean> {
    if (!("serviceWorker" in navigator)) {
        return false;
    }
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
    return needsRefresh;
}
