"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { DateTime } from "luxon";
import tzLookup from "tz-lookup";
import { calculateNatalChart, formatDegree, ZODIAC_SIGNS } from "@/lib/astrology";

type InputState = {
  name: string;
  date: string;
  time: string;
  latitude: string;
  longitude: string;
  elevation: string;
};

const DEG2RAD = Math.PI / 180;

const defaultState: InputState = {
  name: "",
  date: "",
  time: "",
  latitude: "",
  longitude: "",
  elevation: "0",
};

const toNumber = (value: string): number | null => {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
};

const angleToCoordinates = (angle: number, radius: number) => {
  const rad = (90 - angle) * DEG2RAD;
  return {
    x: 50 + radius * Math.cos(rad),
    y: 50 - radius * Math.sin(rad),
  };
};

const PlanetBadge = ({
  label,
  sign,
  degree,
  retrograde,
}: {
  label: string;
  sign: string;
  degree: string;
  retrograde: boolean;
}) => (
  <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white/70 p-3 shadow-sm">
    <span className="text-sm font-semibold text-zinc-900">{label}</span>
    <span className="text-xs text-zinc-500">{sign}</span>
    <span className="text-sm font-mono text-zinc-700">{degree}</span>
    {retrograde ? (
      <span className="text-xs font-semibold uppercase text-rose-600">
        Rétrograde
      </span>
    ) : null}
  </div>
);

export default function Home() {
  const [inputs, setInputs] = useState<InputState>(defaultState);
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [timezoneLocked, setTimezoneLocked] = useState(false);

  const autoDetectTimezone = (
    latValue: string,
    lonValue: string,
    options: { force?: boolean } = {}
  ) => {
    const { force = false } = options;
    const lat = toNumber(latValue);
    const lon = toNumber(lonValue);
    if (
      (!force && timezoneLocked) ||
      lat === null ||
      lon === null ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    ) {
      return;
    }
    try {
      const detected = tzLookup(lat, lon);
      setTimezone((current) => (current === detected ? current : detected));
    } catch {
      // Ignore detection errors (e.g., oceans) and keep current timezone
    }
  };

  const { chart, validationErrors } = useMemo(() => {
    const validationErrors: string[] = [];
    if (!inputs.date) validationErrors.push("La date de naissance est requise.");
    if (!inputs.time) validationErrors.push("L'heure de naissance est requise.");

    const lat = toNumber(inputs.latitude);
    const lon = toNumber(inputs.longitude);
    const elevation = toNumber(inputs.elevation) ?? 0;
    if (lat === null || Math.abs(lat) > 90) {
      validationErrors.push("Latitude invalide. Utilisez des degrés décimaux (ex: 48.8566).");
    }
    if (lon === null || Math.abs(lon) > 180) {
      validationErrors.push("Longitude invalide. Utilisez des degrés décimaux (ex: 2.3522).");
    }
    if (!timezone) {
      validationErrors.push("Le fuseau horaire est requis.");
    }

    if (validationErrors.length > 0 || lat === null || lon === null) {
      return { chart: null, validationErrors };
    }

    const iso = `${inputs.date}T${inputs.time}`;
    const birth = DateTime.fromISO(iso, { zone: timezone });
    if (!birth.isValid) {
      return {
        chart: null,
        validationErrors: ["Impossible de parser la date/heure saisie."],
      };
    }
    const chartDate = birth.toUTC().toJSDate();

    return {
      chart: calculateNatalChart({
        date: chartDate,
        latitude: lat,
        longitude: lon,
        elevation,
      }),
      validationErrors,
    };
  }, [inputs, timezone]);

  const handleChange =
    (field: keyof InputState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      const nextInputs: InputState = { ...inputs, [field]: value };
      setInputs(nextInputs);

      if (field === "latitude" || field === "longitude") {
        autoDetectTimezone(nextInputs.latitude, nextInputs.longitude);
      }
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 py-16 text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Calculateur de Thème Astral
          </h1>
          <p className="max-w-3xl text-lg text-slate-200">
            Calculez instantanément les positions planétaires, l&apos;ascendant et les maisons
            astrologiques à partir d&apos;une date, d&apos;une heure et d&apos;un lieu précis. Toutes les
            données restent en local: aucune information personnelle n&apos;est transmise.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,_1.4fr)_minmax(0,_1fr)]">
          <form className="flex flex-col gap-6 rounded-3xl bg-white/5 p-8 shadow-2xl backdrop-blur">
            <h2 className="text-2xl font-semibold text-white">Informations de naissance</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-200">Nom (optionnel)</span>
                <input
                  value={inputs.name}
                  onChange={handleChange("name")}
                  type="text"
                  placeholder="Prénom"
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-200">Date</span>
                <input
                  value={inputs.date}
                  onChange={handleChange("date")}
                  type="date"
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-200">Heure</span>
                <input
                  value={inputs.time}
                  onChange={handleChange("time")}
                  type="time"
                  step={60}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-200">
                  Fuseau horaire (IANA, ex: Europe/Paris)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    value={timezone}
                    onChange={(event) => {
                      setTimezoneLocked(true);
                      setTimezone(event.target.value);
                    }}
                    type="text"
                    className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setTimezoneLocked(false);
                      autoDetectTimezone(inputs.latitude, inputs.longitude, { force: true });
                    }}
                    className="whitespace-nowrap rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-sky-400/60 hover:text-white"
                  >
                    Auto
                  </button>
                </div>
                <span className="text-xs text-slate-400">
                  {timezoneLocked
                    ? "Détection automatique désactivée"
                    : "Détection automatique active"}
                </span>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-200">Latitude (°)</span>
                <input
                  value={inputs.latitude}
                  onChange={handleChange("latitude")}
                  type="text"
                  placeholder="48.8566"
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-200">Longitude (°)</span>
                <input
                  value={inputs.longitude}
                  onChange={handleChange("longitude")}
                  type="text"
                  placeholder="2.3522"
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-200">Altitude (m)</span>
                <input
                  value={inputs.elevation}
                  onChange={handleChange("elevation")}
                  type="number"
                  placeholder="0"
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate-300">
              <span className="font-semibold text-slate-100">Conseils</span>
              <p>
                Saisissez les coordonnées GPS en degrés décimaux. Vous pouvez les obtenir via un
                service cartographique en ligne. Les calculs utilisent le fuseau horaire sélectionné
                pour convertir automatiquement l&apos;heure en UTC.
              </p>
            </div>
            {validationErrors.length > 0 ? (
              <ul className="space-y-1 rounded-xl border border-rose-400/50 bg-rose-500/10 p-4 text-sm text-rose-100">
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm text-sky-100">
                Prêt à calculer. Les résultats se mettent à jour dès que toutes les informations sont
                complètes.
              </div>
            )}
          </form>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl bg-white/5 p-8 shadow-2xl backdrop-blur md:p-10">
              {chart ? (
                <>
                  <h2 className="text-2xl font-semibold text-white">
                    Angles principaux
                  </h2>
                  <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/10 p-4">
                      <span className="text-sm font-medium text-slate-200">Ascendant</span>
                      <span className="text-lg font-semibold text-white">
                        {formatDegree(chart.angles.ascendant)} —{" "}
                        {ZODIAC_SIGNS[Math.floor(chart.angles.ascendant / 30)].name}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/10 p-4">
                      <span className="text-sm font-medium text-slate-200">Milieu du Ciel</span>
                      <span className="text-lg font-semibold text-white">
                        {formatDegree(chart.angles.midheaven)} —{" "}
                        {ZODIAC_SIGNS[Math.floor(chart.angles.midheaven / 30)].name}
                      </span>
                    </div>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-white">Planètes</h3>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {chart.planets.map((planet) => (
                        <PlanetBadge
                          key={planet.key}
                          label={planet.label}
                          sign={`${planet.signName} ${planet.signSymbol}`}
                          degree={formatDegree(planet.degreeInSign)}
                          retrograde={planet.retrograde}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col justify-center rounded-2xl border border-dashed border-white/15 p-10 text-center text-slate-300">
                  <h3 className="text-lg font-semibold text-white">
                    Entrez vos informations pour générer le thème astral
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Les résultats apparaîtront instantanément dès que tous les champs requis seront
                    renseignés.
                  </p>
                </div>
              )}
            </div>
            {chart ? (
              <div className="flex flex-col gap-6 rounded-3xl bg-white/5 p-8 shadow-2xl backdrop-blur md:p-10">
                <h2 className="text-2xl font-semibold text-white">Maisons astrologiques</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {chart.houses.map((house) => (
                    <div
                      key={house.index}
                      className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/10 p-4"
                    >
                      <span className="text-sm font-medium text-slate-200">
                        Maison {house.index}
                      </span>
                      <span className="text-base font-semibold text-white">
                        {house.signName} {house.signSymbol}
                      </span>
                      <span className="font-mono text-sm text-slate-300">
                        {formatDegree(house.cusp % 30)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                  <h3 className="text-lg font-semibold text-white">Carte interactive</h3>
                  <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.1fr)]">
                    <div className="relative aspect-square w-full">
                      <svg
                        viewBox="0 0 100 100"
                        className="h-full w-full drop-shadow-lg"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          className="fill-transparent stroke-white/30"
                          strokeWidth="0.5"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="32"
                          className="fill-transparent stroke-white/10"
                          strokeWidth="0.5"
                        />
                        {chart.houses.map((house) => {
                          const start = angleToCoordinates(house.cusp, 45);
                          return (
                            <line
                              key={`house-${house.index}`}
                              x1="50"
                              y1="50"
                              x2={start.x}
                              y2={start.y}
                              stroke="rgba(255,255,255,0.35)"
                              strokeWidth="0.4"
                            />
                          );
                        })}
                        {chart.planets.map((planet) => {
                          const point = angleToCoordinates(planet.longitude, 38);
                          return (
                            <g key={`planet-${planet.key}`}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="1.4"
                                className="fill-sky-400"
                              />
                              <text
                                x={point.x}
                                y={point.y - 2}
                                textAnchor="middle"
                                className="fill-white text-[3px]"
                              >
                                {planet.label[0]}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="w-28 rounded-full border border-white/10 bg-white/5 py-3 text-center text-xs text-slate-200">
                          {inputs.name ? inputs.name : "Thème natal"}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 text-sm text-slate-200">
                      <p>
                        L&apos;ascendant se situe à{" "}
                        <span className="font-semibold text-white">
                          {formatDegree(chart.angles.ascendant)} (
                          {ZODIAC_SIGNS[Math.floor(chart.angles.ascendant / 30)].name})
                        </span>
                        . Le Milieu du Ciel culmine à{" "}
                        <span className="font-semibold text-white">
                          {formatDegree(chart.angles.midheaven)} (
                          {ZODIAC_SIGNS[Math.floor(chart.angles.midheaven / 30)].name})
                        </span>
                        .
                      </p>
                      <p>
                        Chaque maison succède à la précédente tous les 30 degrés (système des maisons
                        égales). Les positions planétaires sont mesurées sur le zodiaque tropical et
                        basées sur les éphémérides numériques de l&apos;Astronomy Engine, garantissant
                        une grande précision astronomique.
                      </p>
                      <p className="text-xs text-slate-400">
                        Calculé pour UTC:{" "}
                        {chart.birthTime.date.toISOString().replace("T", " ").slice(0, 16)} — Temps
                        sidéral local et nutation pris en compte.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}
