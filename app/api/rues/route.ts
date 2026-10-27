
import { getSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const terme = (searchParams.get("q") ?? "").trim();

    if (terme.length < 5) {
      return Response.json({ rues: [] });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("rues")
      .select("id, nom")
      .eq("actif", true)
      .ilike("nom", `%${terme}%`)
      .order("nom")
      .limit(20);

    if (error) {
      console.error("Erreur Supabase recherche :", error);
      return Response.json(
        { erreur: "Erreur lors de la recherche des rues." },
        { status: 500 }
      );
    }

    return Response.json({ rues: data ?? [] });
  } catch (error) {
    console.error("Erreur API rues :", error);
    return Response.json(
      { erreur: "Impossible de rechercher les rues." },
      { status: 500 }
    );
  }
}
