
import { getSupabase } from "@/lib/supabase/server";

function dateDefiCourante(): string {
  const maintenant = new Date();

  const parties = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(maintenant);

  const obtenir = (type: string) =>
    parties.find((p) => p.type === type)?.value ?? "";

  const annee = Number(obtenir("year"));
  const mois = Number(obtenir("month"));
  const jour = Number(obtenir("day"));
  const heure = Number(obtenir("hour"));

  const date = new Date(
    Date.UTC(annee, mois - 1, jour - (heure < 12 ? 1 : 0))
  );

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function datePrecedente(date: string): string {
  const [annee, mois, jour] = date.split("-").map(Number);
  const precedente = new Date(Date.UTC(annee, mois - 1, jour - 1));

  return [
    precedente.getUTCFullYear(),
    String(precedente.getUTCMonth() + 1).padStart(2, "0"),
    String(precedente.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export async function GET() {
  try {
    const supabase = getSupabase();

    // Date du défi actif : midi à midi, heure de Paris.
    const date = dateDefiCourante();
    const datePrecedenteDefi = datePrecedente(date);

    // Récupérer le défi précédent.
    const { data: defiPrecedent, error: erreurDefiPrecedent } =
      await supabase
        .from("defis_quotidiens")
        .select("rue_id")
        .eq("date_defi", datePrecedenteDefi)
        .maybeSingle();

    if (erreurDefiPrecedent) throw erreurDefiPrecedent;

    let rueDHier: string | null = null;

    if (defiPrecedent) {
      const { data: ruePrecedente, error } = await supabase
        .from("rues")
        .select("nom")
        .eq("id", defiPrecedent.rue_id)
        .single();

      if (error) throw error;

      rueDHier = ruePrecedente.nom;
    }

    // Récupérer le défi actif.
    const { data: defi, error: erreurDefi } = await supabase
      .from("defis_quotidiens")
      .select("rue_id, date_defi")
      .eq("date_defi", date)
      .maybeSingle();

    if (erreurDefi) throw erreurDefi;

    if (!defi) {
      return Response.json({
        date,
        indices: [],
        rueDHier,
        defiDisponible: false,
      });
    }

    // Récupérer les indices.
    const { data: rue, error: erreurRue } = await supabase
      .from("rues")
      .select("indice_1, indice_2, indice_3")
      .eq("id", defi.rue_id)
      .single();

    if (erreurRue || !rue) {
      throw erreurRue ?? new Error("Rue du défi introuvable.");
    }

    return Response.json({
      date: defi.date_defi,
      indices: [rue.indice_1, rue.indice_2, rue.indice_3],
      rueDHier,
      defiDisponible: true,
    });
  } catch (erreur) {
    console.error("Erreur lors du chargement du défi :", erreur);

    return Response.json(
      { erreur: "Impossible de charger le défi." },
      { status: 500 }
    );
  }
}
