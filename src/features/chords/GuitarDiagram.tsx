import { diagramFrets, type GuitarShape } from "../../music/guitar";

const marginX = 22;
const marginTop = 34;
const stringGap = 18;
const fretGap = 22;
const width = marginX * 2 + stringGap * 5;
const height = marginTop + fretGap * diagramFrets + 12;

function stringX(index: number): number {
    return marginX + index * stringGap;
}

function fretY(offset: number): number {
    return marginTop + offset * fretGap;
}

/**
 * A chord chart drawn as six vertical strings crossed by five frets, with the
 * low E string on the left, as printed diagrams do.
 */
export function GuitarDiagram({
    shape,
    label,
}: {
    shape: GuitarShape;
    label: string;
}) {
    const openShape = shape.baseFret === 1;
    const barre = shape.barre;

    return (
        <svg
            className="chord-diagram"
            viewBox={`0 0 ${String(width)} ${String(height)}`}
            role="img"
            aria-label={label}
        >
            {openShape ? (
                <rect
                    x={stringX(0)}
                    y={fretY(0) - 4}
                    width={stringGap * 5}
                    height={5}
                    fill="var(--ink)"
                />
            ) : (
                <text
                    x={stringX(0) - 8}
                    y={fretY(0) + fretGap * 0.7}
                    textAnchor="end"
                    fontSize="11"
                    fill="var(--muted)"
                >
                    {shape.baseFret}
                </text>
            )}

            {Array.from({ length: diagramFrets + 1 }, (_, index) => (
                <line
                    key={`fret-${String(index)}`}
                    x1={stringX(0)}
                    y1={fretY(index)}
                    x2={stringX(5)}
                    y2={fretY(index)}
                    stroke="var(--line)"
                    strokeWidth={1}
                />
            ))}

            {shape.frets.map((_, index) => (
                <line
                    key={`string-${String(index)}`}
                    x1={stringX(index)}
                    y1={fretY(0)}
                    x2={stringX(index)}
                    y2={fretY(diagramFrets)}
                    stroke="var(--line)"
                    strokeWidth={1}
                />
            ))}

            {shape.frets.map((fret, index) =>
                fret === null || fret === 0 ? (
                    <text
                        key={`marker-${String(index)}`}
                        x={stringX(index)}
                        y={marginTop - 10}
                        textAnchor="middle"
                        fontSize="13"
                        fill="var(--muted)"
                    >
                        {fret === null ? "\u00d7" : "\u25cb"}
                    </text>
                ) : null,
            )}

            {barre ? (
                <rect
                    x={stringX(barre.from) - 7}
                    y={fretY(barre.fret - shape.baseFret + 0.5) - 7}
                    width={(barre.to - barre.from) * stringGap + 14}
                    height={14}
                    rx={7}
                    fill="var(--primary)"
                />
            ) : null}

            {shape.frets.map((fret, index) => {
                if (fret === null || fret === 0) {
                    return null;
                }
                if (barre && fret === barre.fret) {
                    return null;
                }
                return (
                    <circle
                        key={`dot-${String(index)}`}
                        cx={stringX(index)}
                        cy={fretY(fret - shape.baseFret + 0.5)}
                        r={7}
                        fill="var(--primary)"
                    />
                );
            })}

            {shape.fingers.map((finger, index) => {
                const fret = shape.frets[index];
                if (
                    finger === null ||
                    fret === null ||
                    fret === undefined ||
                    fret === 0
                ) {
                    return null;
                }
                if (barre && fret === barre.fret && index !== barre.from) {
                    return null;
                }
                return (
                    <text
                        key={`finger-${String(index)}`}
                        x={stringX(index)}
                        y={fretY(fret - shape.baseFret + 0.5) + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="var(--primary-ink)"
                    >
                        {finger}
                    </text>
                );
            })}
        </svg>
    );
}
