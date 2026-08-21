import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./app/App";
import { AppStoreProvider } from "./app/store";
import { applyStoredAppearance } from "./app/appearance";
import { registerServiceWorker } from "./pwa";
import "./styles.css";

applyStoredAppearance();

const container = document.querySelector("#root");
if (!container) {
    throw new Error("Missing #root container");
}

createRoot(container).render(
    <StrictMode>
        <BrowserRouter>
            <AppStoreProvider>
                <App />
            </AppStoreProvider>
        </BrowserRouter>
    </StrictMode>,
);

registerServiceWorker();
