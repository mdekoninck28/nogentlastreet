
"use client";

import { useEffect, useState } from "react";

type RueSuggestion = {
  id: number;
  nom: string;
};

export default function Home() {
  const [recherche, setRecherche] = useState("");
  const [rueChoisieId, setRueChoisieId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [validee, setValidee] = useState(false);
  const [indiceActuel, setIndiceActuel] = useState(0);
  const [nombreCoups, setNombreCoups] = useState(0);

  const [dateDefi, setDateDefi] = useState("");
  const [indices, setIndices] = useState<string[]>([]);
  const [rueDHier, setRueDHier] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<RueSuggestion[]>([]);
  const [chargementDefi, setChargementDefi] = useState(true);
  const [chargementSuggestions, setChargementSuggestions] = useState(false);
  const [chargementValidation, setChargementValidation] = useState(false);
  const [ruesDejaTentees, setRuesDejaTentees] = useState<number[]>([]);

  // Charger le défi du jour et la réponse d'hier
  useEffect(() => {
    const controleur = new AbortController();

    async function chargerDefi() {
      try {
        const reponse = await fetch("/api/defi", {
          signal: controleur.signal,
          cache: "no-store",
        });

        const resultat = await reponse.json();

        if (!reponse.ok) {
          throw new Error(
            resultat.erreur ?? "Impossible de charger le défi."
          );
        }

        setDateDefi(resultat.date);
        setIndices(resultat.indices);
        setRueDHier(resultat.rueDHier ?? null);
      } catch (erreur) {
        if (erreur instanceof Error && erreur.name === "AbortError") {
          return;
        }

        setMessage("Impossible de charger le défi du jour. Réessaie plus tard.");
      } finally {
        if (!controleur.signal.aborted) {
          setChargementDefi(false);
        }
      }
    }

    chargerDefi();

    return () => controleur.abort();
  }, []);

  // Rechercher les rues dans Supabase via l'API
  useEffect(() => {
    const terme = recherche.trim();

    if (
      terme.length < 5 ||
      validee ||
      chargementDefi ||
      rueChoisieId !== null
    ) {
      setSuggestions([]);
      setChargementSuggestions(false);
      return;
    }

    const controleur = new AbortController();

    async function rechercherRues() {
      setChargementSuggestions(true);

      try {
        const reponse = await fetch(
          `/api/rues?q=${encodeURIComponent(terme)}`,
          {
            signal: controleur.signal,
            cache: "no-store",
          }
        );

        const resultat = await reponse.json();

        if (!reponse.ok) {
          throw new Error("Erreur de recherche");
        }

        setSuggestions(resultat.rues ?? []);
      } catch (erreur) {
        if (erreur instanceof Error && erreur.name === "AbortError") {
          return;
        }

        setSuggestions([]);
      } finally {
        if (!controleur.signal.aborted) {
          setChargementSuggestions(false);
        }
      }
    }

    // Éviter d'interroger la base à chaque frappe instantanément
    const temporisation = setTimeout(rechercherRues, 250);

    return () => {
      clearTimeout(temporisation);
      controleur.abort();
    };
  }, [recherche, validee, chargementDefi, rueChoisieId]);

  // Valider la réponse côté serveur
  async function validerReponse() {
    if (chargementDefi || chargementValidation || validee) {
      return;
    }

    if (recherche.trim().length < 5) {
      setMessage("💘 Tape au moins 5 caractères pour rechercher une rue.");
      return;
    }

    if (rueChoisieId === null) {
      setMessage("💘 Sélectionne une rue dans la liste des suggestions.");
      return;
    }

    if (ruesDejaTentees.includes(rueChoisieId)) {
      setMessage("💘 Tu as déjà essayé cette rue ! Choisis une autre réponse.");
      return;
    }

    setChargementValidation(true);
    setMessage("");

    try {
      const reponse = await fetch("/api/verifier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rueId: rueChoisieId }),
      });

      const resultat = await reponse.json();

      if (!reponse.ok) {
        throw new Error(
          resultat.erreur ?? "🪲 Impossible de vérifier ta réponse."
        );
      }

      const coups = nombreCoups + 1;
      setNombreCoups(coups);

      setRuesDejaTentees((anciennes) => [
        ...anciennes,
        rueChoisieId,
      ]);

      if (resultat.correcte) {
        setValidee(true);
        setMessage(
          `🎉 Bravo  ! Tu as trouvé ${resultat.nom} en ${coups} ${
            coups === 1 ? "coup" : "coups"
          } !`
        );
      } else {
        if (indiceActuel < indices.length - 1) {
          setIndiceActuel((indice) => indice + 1);
          setMessage(
            "📍 Ce n'est pas la bonne rue. Voici un indice supplémentaire !"
          );
        } else {
          setMessage(
            "❌ Ce n'est pas la bonne rue. Réessaie avec un autre nom."
          );
        }

        // Préparer la recherche suivante
        setRecherche("");
        setRueChoisieId(null);
        setSuggestions([]);
      }
    } catch (erreur) {
      setMessage(
        erreur instanceof Error
          ? erreur.message
          : "🪲 Une erreur est survenue. Réessaie."
      );
    } finally {
      setChargementValidation(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-[#2d58db] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo Nogent-la-Street"
            className="h-48 w-48 shrink-0 object-contain"
          />
          <div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">
              Nogent la Street
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em]">
              Ici c'est Nogent !
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-[#efefef] bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold uppercase tracking-widest">
              Défi du{" "}
              {dateDefi ? dateDefi.split("-").reverse().join("/") : "…"}
            </p>

            <span className="rounded-full bg-[#efefef] px-3 py-2 text-sm font-bold text-[#2d58db]">
              Coups : {nombreCoups}
            </span>
          </div>

          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
            Quelle rue de Nogent-le-Rotrou se cache derrière ces indices ?
          </h2>

          <p className="mt-3 text-gray-600">
            Lis les indices, cherche le nom d'une rue et valide ta réponse.
          </p>

          <div className="mt-8 rounded-2xl bg-[#efefef] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">Tes indices</h3>

              <span className="rounded-full bg-[#e6db3e] px-3 py-1 text-sm font-bold">
                Indice{" "}
                {indices.length > 0
                  ? Math.min(indiceActuel + 1, indices.length)
                  : 0}
                /{indices.length || 3}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {chargementDefi ? (
                <p className="rounded-xl border border-white bg-white p-4 text-gray-600">
                  Chargement des indices…
                </p>
              ) : (
                indices.slice(0, indiceActuel + 1).map((indice, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-white bg-white p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#2d58db]">
                      Indice {index + 1}
                    </p>
                    <p className="mt-2 leading-7 text-gray-800">{indice}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <form
            className="mt-8"
            onSubmit={(event) => {
              event.preventDefault();
              void validerReponse();
            }}
          >
            <label htmlFor="recherche-rue" className="block font-bold">
              Quelle est cette rue ?
            </label>

            <p className="mt-1 text-sm text-gray-500">
              Saisis au moins 5 caractères pour afficher les suggestions.
            </p>

            <div className="relative mt-3">
              <input
                id="recherche-rue"
                type="text"
                value={recherche}
                disabled={validee || chargementDefi || chargementValidation}
                onChange={(event) => {
                  setRecherche(event.target.value);
                  setRueChoisieId(null);
                  setMessage("");
                }}
                placeholder="Rechercher une rue..."
                autoComplete="off"
                className="w-full rounded-xl border-2 border-[#efefef] bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-[#2d58db] disabled:bg-gray-100"
              />

              {recherche.trim().length >= 5 &&
                !validee &&
                rueChoisieId === null && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-[#efefef] bg-white">
                    {chargementSuggestions ? (
                      <p className="px-4 py-3 text-sm text-gray-500">
                        Recherche des rues…
                      </p>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((rue) => (
                        <button
                          key={rue.id}
                          type="button"
                          onClick={() => {
                            setRueChoisieId(rue.id);
                            setRecherche(rue.nom);
                            setSuggestions([]);
                            setMessage("");
                          }}
                          className="block w-full border-b border-[#efefef] px-4 py-3 text-left text-sm last:border-b-0 hover:bg-[#efefef]"
                        >
                          {rue.nom}
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-500">
                        Aucune rue correspondante dans la base.
                      </p>
                    )}
                  </div>
                )}
            </div>

            <button
              type="submit"
              disabled={validee || chargementDefi || chargementValidation}
              className="mt-4 w-full rounded-xl bg-[#2d58db] px-5 py-4 font-bold text-white transition hover:bg-[#2449b8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {chargementValidation
                ? "Vérification…"
                : validee
                  ? "Réponse trouvée !"
                  : "Valider ma réponse"}
            </button>
          </form>

          {message && (
            <p
              aria-live="polite"
              className={`mt-4 rounded-xl p-4 text-sm font-medium ${
                validee
                  ? "bg-[#e6db3e] text-[#20251f]"
                  : "bg-[#efefef] text-[#20251f]"
              }`}
            >
              {message}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-[#efefef] bg-[#efefef] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#2d58db]">
            Le défi d'hier
          </p>

          <h2 className="mt-2 text-xl font-black text-gray-900">
            {rueDHier ?? "Aucun défi enregistré hier"}
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Tu peux retrouver ici la rue qu'il fallait deviner hier.
          </p>
        </section>

        <footer className="mt-6 text-center text-sm text-gray-500">
          <p>Alors, vrai Nogentais ou Touriste ?</p>

          <p className="mt-2">
            Créé en soutien de {" "}
            <a
              href="https://wikiperche.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#2d58db] underline decoration-[#e6db3e] decoration-2 underline-offset-4 transition hover:text-[#2449b8]"
            >
              WikiPerche
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
