import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../app/store";
import { Icon } from "../../components/Icon";
import { Metronome, type MetronomeStatus } from "../../audio/metronome";
import {
    clampBpm,
    meterDefinitions,
    registerTap,
    tapTempoBpm,
} from "../../audio/scheduler";
import type { MetronomeMeter } from "../../data/types";
import { limits } from "../../data/types";

const meters: MetronomeMeter[] = ["2/4", "3/4", "4/4", "6/8"];

export function MetronomePanel({ targetBpm }: { targetBpm: number | null }) {
    const store = useAppStore();
    const { t, settings } = store;
    const [bpm, setBpm] = useState(settings.metronomeBpm);
    const [meter, setMeter] = useState<MetronomeMeter>(settings.metronomeMeter);
    const [volume, setVolume] = useState(settings.metronomeVolume);
    const [muted, setMuted] = useState(settings.metronomeMuted);
    const [status, setStatus] = useState<MetronomeStatus>("idle");
    const [beat, setBeat] = useState<{ index: number; total: number } | null>(
        null,
    );
    const [taps, setTaps] = useState<number[]>([]);

    const metronomeRef = useRef<Metronome | null>(null);
    const beatTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const metronome = new Metronome(
            {
                bpm: settings.metronomeBpm,
                meter: settings.metronomeMeter,
                volume: settings.metronomeVolume,
                muted: settings.metronomeMuted,
            },
            {
                onStatusChange: setStatus,
                onBeat: (scheduled, delayMs) => {
                    const timer = setTimeout(() => {
                        setBeat({
                            index: scheduled.beatIndex,
                            total: scheduled.beatsPerBar,
                        });
                    }, delayMs);
                    beatTimers.current.push(timer);
                    if (beatTimers.current.length > 64) {
                        beatTimers.current = beatTimers.current.slice(-32);
                    }
                },
            },
        );
        metronomeRef.current = metronome;
        return () => {
            for (const timer of beatTimers.current) {
                clearTimeout(timer);
            }
            beatTimers.current = [];
            metronome.dispose();
            metronomeRef.current = null;
        };
        // The metronome is created once; later changes go through its setters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const persist = (patch: Parameters<typeof store.updateSettings>[0]) => {
        if (persistTimer.current !== null) {
            clearTimeout(persistTimer.current);
        }
        persistTimer.current = setTimeout(() => {
            void store.updateSettings(patch);
        }, 600);
    };

    const changeBpm = (value: number) => {
        const next = clampBpm(value);
        setBpm(next);
        metronomeRef.current?.setBpm(next);
        persist({ metronomeBpm: next });
    };

    const changeMeter = (value: MetronomeMeter) => {
        setMeter(value);
        metronomeRef.current?.setMeter(value);
        persist({ metronomeMeter: value });
    };

    const toggle = () => {
        const metronome = metronomeRef.current;
        if (!metronome) {
            return;
        }
        if (status === "running") {
            metronome.stop();
            setBeat(null);
        } else {
            void metronome.start();
        }
    };

    const beatsPerBar = meterDefinitions[meter].beatsPerBar;

    return (
        <section className="card metronome" aria-labelledby="metronome-title">
            <h2 id="metronome-title">{t("metronome.title")}</h2>

            <div className="metronome-beats" aria-hidden="true">
                {Array.from({ length: beatsPerBar }, (_value, index) => (
                    <span
                        key={index}
                        className={
                            beat?.index === index
                                ? index === 0
                                    ? "beat beat-active beat-down"
                                    : "beat beat-active"
                                : index === 0
                                  ? "beat beat-down"
                                  : "beat"
                        }
                    />
                ))}
            </div>
            <p className="visually-hidden" role="status">
                {beat
                    ? t("metronome.beat", {
                          index: beat.index + 1,
                          total: beat.total,
                      })
                    : ""}
            </p>

            <div className="row row-center">
                <button
                    type="button"
                    className="button"
                    aria-label={t("metronome.decrease")}
                    onClick={() => {
                        changeBpm(bpm - 1);
                    }}
                >
                    −
                </button>
                <div className="field field-narrow">
                    <label htmlFor="metronome-bpm">
                        {t("metronome.tempo")}
                    </label>
                    <input
                        id="metronome-bpm"
                        type="number"
                        inputMode="numeric"
                        min={limits.minBpm}
                        max={limits.maxBpm}
                        value={bpm}
                        onChange={(event) => {
                            changeBpm(Number.parseInt(event.target.value, 10));
                        }}
                    />
                </div>
                <button
                    type="button"
                    className="button"
                    aria-label={t("metronome.increase")}
                    onClick={() => {
                        changeBpm(bpm + 1);
                    }}
                >
                    +
                </button>
            </div>

            <div className="row row-wrap">
                <button
                    type="button"
                    id="metronome-toggle"
                    className={
                        status === "running"
                            ? "button button-danger"
                            : "button button-primary"
                    }
                    onClick={toggle}
                >
                    <Icon name={status === "running" ? "stop" : "play"} />
                    {status === "running"
                        ? t("metronome.stop")
                        : t("metronome.start")}
                </button>
                <button
                    type="button"
                    className="button"
                    onClick={() => {
                        const next = registerTap(taps, Date.now());
                        setTaps(next);
                        const tapped = tapTempoBpm(next);
                        if (tapped !== null) {
                            changeBpm(tapped);
                        }
                    }}
                >
                    {t("metronome.tap")}
                </button>
                {targetBpm ? (
                    <button
                        type="button"
                        className="button button-quiet"
                        onClick={() => {
                            changeBpm(targetBpm);
                        }}
                    >
                        {t("metronome.useTarget", { bpm: targetBpm })}
                    </button>
                ) : null}
            </div>

            <fieldset className="field">
                <legend>{t("metronome.meter")}</legend>
                <div className="segmented">
                    {meters.map((option) => (
                        <label key={option}>
                            <input
                                type="radio"
                                name="metronome-meter"
                                value={option}
                                checked={meter === option}
                                onChange={() => {
                                    changeMeter(option);
                                }}
                            />
                            <span>{option}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <div className="row row-wrap">
                <div className="field">
                    <label htmlFor="metronome-volume">
                        {t("metronome.volume")}
                    </label>
                    <input
                        id="metronome-volume"
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(volume * 100)}
                        onChange={(event) => {
                            const next =
                                Number.parseInt(event.target.value, 10) / 100;
                            setVolume(next);
                            metronomeRef.current?.setVolume(next);
                            persist({ metronomeVolume: next });
                        }}
                    />
                </div>
                <button
                    type="button"
                    className="button"
                    aria-pressed={muted}
                    onClick={() => {
                        const next = !muted;
                        setMuted(next);
                        metronomeRef.current?.setMuted(next);
                        persist({ metronomeMuted: next });
                    }}
                >
                    {muted ? t("metronome.unmute") : t("metronome.mute")}
                </button>
            </div>

            {status === "unavailable" ? (
                <p className="notice">{t("metronome.unavailable")}</p>
            ) : (
                <p className="muted small">{t("metronome.foregroundOnly")}</p>
            )}
        </section>
    );
}
