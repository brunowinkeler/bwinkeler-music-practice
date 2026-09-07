import { keyboardLayout, keyboardRange } from "../../music/piano";

/**
 * A keyboard section wide enough for the voicing, drawn in whole octaves so the
 * white and black key pattern stays readable.
 */
export function PianoDiagram({
    notes,
    labels,
    label,
}: {
    notes: number[];
    labels: Map<number, string>;
    label: string;
}) {
    const range = keyboardRange(notes);
    const layout = keyboardLayout(range.from, range.to);
    const pressed = new Set(notes);
    const white = layout.keys.filter((key) => !key.black);
    const black = layout.keys.filter((key) => key.black);

    return (
        <svg
            className="piano-diagram"
            viewBox={`0 0 ${String(layout.width)} ${String(layout.height)}`}
            role="img"
            aria-label={label}
        >
            {white.map((key) => (
                <rect
                    key={key.midi}
                    x={key.x}
                    y={0}
                    width={layout.whiteWidth}
                    height={layout.whiteHeight}
                    fill={
                        pressed.has(key.midi)
                            ? "var(--primary)"
                            : "var(--key-white)"
                    }
                    stroke="var(--key-edge)"
                    strokeWidth={1}
                />
            ))}
            {black.map((key) => (
                <rect
                    key={key.midi}
                    x={key.x}
                    y={0}
                    width={layout.blackWidth}
                    height={layout.blackHeight}
                    fill={
                        pressed.has(key.midi)
                            ? "var(--primary)"
                            : "var(--key-black)"
                    }
                    stroke="var(--key-black)"
                    strokeWidth={1}
                />
            ))}
            {layout.keys.map((key) => {
                const name = labels.get(key.midi);
                if (!name || !pressed.has(key.midi)) {
                    return null;
                }
                return (
                    <text
                        key={`label-${String(key.midi)}`}
                        x={
                            key.x +
                            (key.black
                                ? layout.blackWidth
                                : layout.whiteWidth) /
                                2
                        }
                        y={
                            key.black
                                ? layout.blackHeight - 8
                                : layout.whiteHeight - 8
                        }
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="600"
                        fill="var(--primary-ink)"
                    >
                        {name}
                    </text>
                );
            })}
        </svg>
    );
}
