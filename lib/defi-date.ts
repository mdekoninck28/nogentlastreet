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
export function datesDefis(): { actif: string; precedent: string } {
  const { annee, mois, jour, heure } = partiesParis();
  const decalage = heure < 12 ? -1 : 0;

  return {
    actif: formaterDate(annee, mois, jour + decalage),
    precedent: formaterDate(annee, mois, jour + decalage - 1),
  };
}
