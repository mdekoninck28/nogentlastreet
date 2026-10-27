
import { getSupabase } from "@/lib/supabase/server";

function dateParis() {
  const maintenant = new Date();

  const parties = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(maintenant);

  const annee = Number(
    parties.find((partie) => partie.type === "year")?.value
  );
  const mois = Number(
    parties.find((partie) => partie.type === "month")?.value
  );
  const jour = Number(
    parties.find((partie) => partie.type === "day")?.value
  );

  return `${annee}-${String(mois).padStart(2, "0")}-${String(
    jour
  ).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  try {
    const corps = await request.json();
    const rueId = Number(corps.rueId);

    if (!Number.isInteger(rueId) || rueId <= 0) {
      return Response.json(
        { erreur: "Identifiant de rue invalide." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: defi, error: erreurDefi } = await supabase
      .from("defis_quotidiens")
      .select("rue_id")
      .eq("date_defi", dateParis())
      .maybeSingle();

    if (erreurDefi) {
      console.error("Erreur lecture défi :", erreurDefi);
      return Response.json(
        { erreur: "Impossible de récupérer le défi." },
        { status: 500 }
      );
    }

    if (!defi) {
      return Response.json(
        { erreur: "Aucun défi enregistré pour aujourd'hui." },
        { status: 404 }
      );
    }

    if (rueId !== defi.rue_id) {
      return Response.json({ correcte: false });
    }

    const { data: rue, error: erreurRue } = await supabase
      .from("rues")
      .select("nom")
      .eq("id", defi.rue_id)
      .single();

    if (erreurRue || !rue) {
      console.error("Erreur lecture rue :", erreurRue);
      return Response.json(
        { erreur: "Impossible de récupérer la rue." },
        { status: 500 }
      );
    }

    return Response.json({
      correcte: true,
      nom: rue.nom,
    });
  } catch (error) {
    console.error("Erreur vérification :", error);
    return Response.json(
      { erreur: "Impossible de vérifier la réponse." },
      { status: 500 }
    );
  }
}
