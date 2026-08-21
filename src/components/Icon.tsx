import type { SVGProps } from "react";

/**
 * Local icon set. Drawing the few glyphs the app needs keeps the bundle small
 * and avoids a third-party runtime dependency in a CSP-restricted build.
 */
const paths = {
    play: "M8 5.5v13l11-6.5z",
    pause: "M8.5 5h3v14h-3zM12.5 5h3v14h-3z",
    stop: "M6.5 6.5h11v11h-11z",
    check: "M4.5 12.5l5 5 10-11",
    previous: "M15 5l-7 7 7 7",
    next: "M9 5l7 7-7 7",
    up: "M12 5l-7 7h4v7h6v-7h4z",
    down: "M12 19l7-7h-4V5H9v7H5z",
    plus: "M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z",
    edit: "M4 17.5l9.5-9.5 3 3L7 20.5H4zM15.5 6L18 3.5l3 3L18.5 9z",
    trash: "M6 7h12l-1 13H7zM9 4h6v2H9z",
    archive: "M3.5 4.5h17v4h-17zM5 10h14v9.5H5zM9 13h6v2H9z",
    copy: "M8 3h11v14H8zM4 7h2v12h10v2H4z",
    download: "M11 3h2v9h4l-5 6-5-6h4z",
    upload: "M11 20h2v-9h4l-5-6-5 6h4z",
    settings:
        "M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm-1-6h2l.6 2.6 1.9.8 2.3-1.4 1.4 1.4-1.4 2.3.8 1.9 2.6.6v2l-2.6.6-.8 1.9 1.4 2.3-1.4 1.4-2.3-1.4-1.9.8-.6 2.6h-2l-.6-2.6-1.9-.8-2.3 1.4-1.4-1.4 1.4-2.3-.8-1.9L2.5 13v-2l2.6-.6.8-1.9L4.5 6.2l1.4-1.4 2.3 1.4 1.9-.8z",
    home: "M12 3l9 8h-3v9h-4v-6h-4v6H6v-9H3z",
    list: "M4 5h16v3H4zM4 10.5h16v3H4zM4 16h16v3H4z",
    history:
        "M12 4a8 8 0 108 8h-2a6 6 0 11-6-6v3l4-4-4-4zM11 8h2v5l4 2-1 1.7-5-2.7z",
    chart: "M4 20V4h2v14h14v2zM8.5 16V9h3v7zm5 0V6h3v10z",
    metronome: "M11 3h2l5 18H6zM9.5 14h5l.5 2h-6z",
    close: "M5.5 4L12 10.5 18.5 4 20 5.5 13.5 12 20 18.5 18.5 20 12 13.5 5.5 20 4 18.5 10.5 12 4 5.5z",
    alert: "M12 3l10 18H2zm-1 6h2v6h-2zm0 8h2v2h-2z",
    external:
        "M14 4h6v6h-2V7.4l-7.3 7.3-1.4-1.4L16.6 6H14zM5 6h5v2H7v9h9v-3h2v5H5z",
    music: "M9 18a3 3 0 100-6 3 3 0 000 6zm3-3V4l8-1.5v10",
} as const;

export type IconName = keyof typeof paths;

interface IconProps extends SVGProps<SVGSVGElement> {
    name: IconName;
}

export function Icon({ name, ...props }: IconProps) {
    const filled = name !== "check" && name !== "previous" && name !== "next";
    return (
        <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
            focusable="false"
            fill={filled ? "currentColor" : "none"}
            stroke={filled ? "none" : "currentColor"}
            strokeWidth={filled ? 0 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d={paths[name]} />
        </svg>
    );
}
