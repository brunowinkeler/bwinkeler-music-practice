import { useRef, useState } from "react";
import { useAppStore } from "../../app/store";
import { Modal } from "../../components/Modal";
import { parseBackup, type ParsedBackup } from "../../data/backup";
import { limits } from "../../data/types";
import { ValidationError } from "../../data/validation";
import type { MessageKey } from "../../i18n";

const errorKeys: Record<string, MessageKey> = {
    tooLarge: "restore.errorTooLarge",
    invalidJson: "restore.errorInvalidJson",
    unsupportedFormat: "restore.errorUnsupportedFormat",
    unsupportedVersion: "restore.errorUnsupportedVersion",
    checksumMismatch: "restore.errorChecksumMismatch",
    invalidRecord: "restore.errorInvalidRecord",
};

export function RestoreDialog({
    open,
    onClose,
    onExportCurrent,
}: {
    open: boolean;
    onClose: () => void;
    onExportCurrent: () => void;
}) {
    const store = useAppStore();
    const { t, settings } = store;
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<ParsedBackup | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setPreview(null);
        setError(null);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const readFile = async (file: File) => {
        setPreview(null);
        setError(null);
        if (file.size > limits.maxBackupBytes) {
            setError(t("restore.errorTooLarge"));
            return;
        }
        try {
            const text = await file.text();
            setPreview(parseBackup(text));
        } catch (failure) {
            if (failure instanceof ValidationError) {
                const key = errorKeys[failure.code] ?? "restore.errorUnknown";
                setError(t(key, { path: failure.path }));
            } else {
                setError(t("restore.errorUnknown"));
            }
        }
    };

    return (
        <Modal
            open={open}
            title={t("restore.title")}
            onClose={() => {
                reset();
                onClose();
            }}
            footer={
                <>
                    <button
                        type="button"
                        className="button"
                        onClick={() => {
                            reset();
                            onClose();
                        }}
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        type="button"
                        id="confirm-restore"
                        className="button button-danger"
                        disabled={preview === null}
                        onClick={() => {
                            if (!preview) {
                                return;
                            }
                            void store
                                .restoreSnapshot(preview.snapshot)
                                .then(() => {
                                    store.announce(t("restore.done"));
                                    reset();
                                    onClose();
                                });
                        }}
                    >
                        {t("restore.confirm")}
                    </button>
                </>
            }
        >
            <div className="field">
                <label htmlFor="restore-file">{t("restore.chooseFile")}</label>
                <input
                    id="restore-file"
                    ref={inputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                            void readFile(file);
                        }
                    }}
                />
            </div>

            {error ? (
                <div role="alert">
                    <p className="field-error">{error}</p>
                    <p className="muted">{t("restore.unchanged")}</p>
                </div>
            ) : null}

            {preview ? (
                <div className="panel">
                    <h3>{t("restore.previewTitle")}</h3>
                    <p>
                        {t("restore.exportedAt", {
                            date: new Intl.DateTimeFormat(settings.language, {
                                dateStyle: "medium",
                                timeStyle: "short",
                            }).format(new Date(preview.exportedAt)),
                        })}
                    </p>
                    <p>
                        {t("restore.appVersion", {
                            version: preview.appVersion || "—",
                        })}
                        {" · "}
                        {t("restore.schemaVersion", {
                            version: preview.schemaVersion,
                        })}
                    </p>
                    <p id="restore-counts">
                        {t("restore.counts", {
                            sessions: preview.counts.sessions,
                            routines: preview.counts.routines,
                            activities: preview.counts.activities,
                        })}
                    </p>
                    <p className="notice">{t("restore.warning")}</p>
                    <button
                        type="button"
                        className="button"
                        onClick={onExportCurrent}
                    >
                        {t("restore.exportFirst")}
                    </button>
                </div>
            ) : null}
        </Modal>
    );
}
