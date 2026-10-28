
import { getSupabase } from "@/lib/supabase/server";

function dateParis(decalage = 0): string {
  const maintenant = new Date();

  const parties = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(maintenant);

  const annee = Number(
    parties.find((p) => p.type === "year")!.value
  );
  const mois = Number(
    parties.find((p) => p.type === "month")!.value
  );
  const jour = Number(
    parties.find((p) => p.type === "day")!.value
  );

  const date = new Date(
    Date.UTC(annee, mois - 1, jour + decalage)
  );

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function heureParis(): number {
  const heure = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

  return Number(heure);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const avantMidi = heureParis() < 12;

    // Avant midi, le défi actif reste celui de la veille.
    const date = dateParis(avantMidi ? -1 : 0);

    // Le défi précédent est celui qui précède le défi actif.
    const datePrecedente = dateParis(avantMidi ? -2 : -1);

    console.log("Heure de Paris :", heureParis());
    console.log("Avant midi :", avantMidi);
    console.log("Date du défi recherchée :", date);
    console.log("Date du défi précédent :", datePrecedente);

    // 1. Récupérer la réponse du défi précédent.
    const {
      data: defiPrecedent,
      error: erreurDefiPrecedent,
    } = await supabase
      .from("defis_quotidiens")
      .select("rue_id")
      .eq("date_defi", datePrecedente)
      .maybeSingle();

    if (erreurDefiPrecedent) {
      throw erreurDefiPrecedent;
    }

    let rueDHier: string | null = null;

    if (defiPrecedent) {
      const {
        data: ruePrecedente,
        error: erreurRuePrecedente,
      } = await supabase
        .from("rues")
        .select("nom")
        .eq("id", defiPrecedent.rue_id)
        .single();

      if (erreurRuePrecedente || !ruePrecedente) {
        throw erreurRuePrecedente ??
          new Error("Rue du défi précédent introuvable.");
      }

      rueDHier = ruePrecedente.nom;
    }

    // 2. Récupérer le défi actif.
    const {
      data: defi,
      error: erreurDefi,
    } = await supabase
      .from("defis_quotidiens")
      .select("rue_id")
      .eq("date_defi", date)
      .maybeSingle();

    if (erreurDefi) {
      throw erreurDefi;
    }

    // Le défi actif n'a pas encore été généré.
    // On conserve tout de même la réponse précédente.
    if (!defi) {
      return Response.json({
        date,
        indices: [],
        rueDHier,
        defiDisponible: false,
      });
    }

    // 3. Récupérer les indices du défi actif.
    const {
      data: rue,
      error: erreurRue,
    } = await supabase
      .from("rues")
      .select("indice_1, indice_2, indice_3")
      .eq("id", defi.rue_id)
      .single();

    if (erreurRue || !rue) {
      throw erreurRue ??
        new Error("Rue du défi actif introuvable.");
    }

    return Response.json({
      date,
      indices: [
        rue.indice_1,
        rue.indice_2,
        rue.indice_3,
      ],
      rueDHier,
      defiDisponible: true,
    });
  } catch (erreur) {
    console.error(
      "Erreur lors du chargement du défi :",
      erreur
    );

    return Response.json(
      { erreur: "Impossible de charger le défi." },
      { status: 500 }
    );
  }
}
