import { getSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabase();

    const { count, error } = await supabase
      .from("rues")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("Erreur Supabase :", error.message);

      return Response.json(
        { ok: false, erreur: "Impossible de lire la table rues." },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      message: "Connexion à Supabase réussie !",
      nombreDeRues: count,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { ok: false, erreur: "Configuration Supabase incorrecte." },
      { status: 500 }
    );
  }
}
