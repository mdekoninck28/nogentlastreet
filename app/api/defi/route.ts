import { getSupabase } from "@/lib/supabase/server";

type PartiesParis = {
  annee: number;
  mois: number;
  jour: number;
  heure: number;
};

function partiesParis(): PartiesParis {
  const parties = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const lire = (type: string): number => {
    const valeur = Number(
      parties.find((p) => p.type === type)?.value
    );
    if (Number.isNaN(valeur)) {
      throw new Error(
        `Impossible de lire "${type}" pour Europe/Paris.`
      );
    }
    return valeur;
  };

  return {
    annee: lire("year"),
    mois: lire("month"),
    jour: lire("day"),
    heure: lire("hour"),
  };
}

function formaterDate(
  annee: number,
  mois: number,
  jour: number
): string {
  // Date.UTC gère les débordements de jour (ex. jour = 0 ou -1).
  const date = new Date(Date.UTC(annee, mois - 1, jour));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Date du défi actif et du défi précédent.
 * Avant midi (heure de Paris), le défi actif est celui de la veille.
 */
function datesDefis(): { actif: string; precedent: string } {
  const { annee, mois, jour, heure } = partiesParis();

  const decalage = heure < 12 ? -1 : 0;

  return {
    actif: formaterDate(annee, mois, jour + decalage),
    precedent: formaterDate(annee, mois, jour + decalage - 1),
  };
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const { actif: date, precedent: datePrecedente } =
      datesDefis();

    // 1. Récupérer la réponse du défi précédent.
    const { data: defiPrecedent, error: erreurDefiPrecedent } =
      await supabase
        .from("defis_quotidiens")
        .select("rue_id")
        .eq("date_defi", datePrecedente)
        .maybeSingle();

    if (erreurDefiPrecedent) {
      throw erreurDefiPrecedent;
    }

    let rueDHier: string | null = null;

    if (defiPrecedent) {
      const { data: ruePrecedente, error: erreurRuePrecedente } =
        await supabase
          .from("rues")
          .select("nom")
          .eq("id", defiPrecedent.rue_id)
          .single();

      if (erreurRuePrecedente || !ruePrecedente) {
        throw (
          erreurRuePrecedente ??
          new Error("Rue du défi précédent introuvable.")
        );
      }

      rueDHier = ruePrecedente.nom;
    }

    // 2. Récupérer le défi actif.
    const { data: defi, error: erreurDefi } = await supabase
      .from("defis_quotidiens")
      .select("rue_id, date_defi")
      .eq("date_defi", date)
      .maybeSingle();

    if (erreurDefi) {
      throw erreurDefi;
    }

    // Le défi actif n'a pas encore été généré.
    if (!defi) {
      return Response.json(
        {
          date,
          indices: [],
          rueDHier,
          defiDisponible: false,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // 3. Récupérer les indices du défi actif.
    const { data: rue, error: erreurRue } = await supabase
      .from("rues")
      .select("indice_1, indice_2, indice_3")
      .eq("id", defi.rue_id)
      .single();

    if (erreurRue || !rue) {
      throw (
        erreurRue ?? new Error("Rue du défi actif introuvable.")
      );
    }

    // 4. Renvoyer la date réellement enregistrée.
    return Response.json(
      {
        date: defi.date_defi,
        indices: [rue.indice_1, rue.indice_2, rue.indice_3],
        rueDHier,
        defiDisponible: true,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (erreur) {
    console.error("Erreur lors du chargement du défi :", erreur);

    return Response.json(
      { erreur: "Impossible de charger le défi."
