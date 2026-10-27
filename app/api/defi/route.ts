
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

export async function GET() {
  try {
    const supabase = getSupabase();
    const date = dateParis();

    // 1. Récupérer le défi du jour
    const { data: defi, error } = await supabase
      .from("defis_quotidiens")
      .select("rue_id")
      .eq("date_defi", date)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!defi) {
      return Response.json(
        { erreur: "Aucun défi disponible pour aujourd'hui." },
        { status: 404 }
      );
    }

    // 2. Récupérer les indices du défi du jour
    const { data: rue, error: erreurRue } = await supabase
      .from("rues")
      .select("indice_1, indice_2, indice_3")
      .eq("id", defi.rue_id)
      .single();

    if (erreurRue || !rue) {
      throw erreurRue ?? new Error("Rue introuvable.");
    }

    // 3. Récupérer le défi d'hier
    const { data: defiHier, error: erreurHier } = await supabase
      .from("defis_quotidiens")
      .select("rue_id")
      .eq("date_defi", dateParis(-1))
      .maybeSingle();

    if (erreurHier) {
      throw erreurHier;
    }

    let rueDHier: string | null = null;

    if (defiHier) {
      const { data: rueHier, error: erreurRueHier } = await supabase
        .from("rues")
        .select("nom")
        .eq("id", defiHier.rue_id)
        .single();

      if (erreurRueHier || !rueHier) {
        throw erreurRueHier ?? new Error("Rue d'hier introuvable.");
      }

      rueDHier = rueHier.nom;
    }

    // 4. Renvoyer les données nécessaires à la page
    return Response.json({
      date,
      indices: [
        rue.indice_1,
        rue.indice_2,
        rue.indice_3,
      ],
      rueDHier,
    });
  } catch (erreur) {
    console.error("Erreur lors du chargement du défi :", erreur);

    return Response.json(
      { erreur: "Impossible de charger le défi." },
      { status: 500 }
    );
  }
}
