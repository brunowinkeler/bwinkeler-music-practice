import { useEffect, useId, useRef, type ReactNode } from "react";
import { useAppStore } from "../app/store";

interface ModalProps {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
}

/**
 * Native `<dialog>` gives modal focus containment, `Esc`, and inertness of the
 * page behind it without a dependency.
 */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) {
            return;
        }
        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            className="modal"
            ref={ref}
            aria-labelledby={titleId}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClose={onClose}
        >
            <div className="modal-body">
                <h2 id={titleId}>{title}</h2>
                {children}
                {footer ? <div className="modal-actions">{footer}</div> : null}
            </div>
        </dialog>
    );
}

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel,
    destructive = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const { t } = useAppStore();
    return (
        <Modal
            open={open}
            title={title}
            onClose={onCancel}
            footer={
                <>
                    <button type="button" className="button" onClick={onCancel}>
                        {t("common.cancel")}
                    </button>
                    <button
                        type="button"
                        className={
                            destructive
                                ? "button button-danger"
                                : "button button-primary"
                        }
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </>
            }
        >
            <p>{message}</p>
        </Modal>
    );
}
