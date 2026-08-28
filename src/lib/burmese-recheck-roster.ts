// Browser-safe roster + wording for the Burmese payment-proof recheck campaign.
//
// The Burmese restaurant owner is reconciling his own bank records against his
// paper ledger and reported these 34 households as unpaid on his end. Nothing
// here changes any payment record — this list exists only so Kari can ask each
// person to resend their receipt. Names/phones are exactly as supplied.

export const BURMESE_RECHECK_TEMPLATE_KEY = "burmese_recheck_text_template";

export const DEFAULT_BURMESE_RECHECK_TEMPLATE =
  "Hi {name}! We're reconciling payment records with the Burmese restaurant for A Taste of Special Conventions. Could you please resend/forward your payment receipt or Zelle confirmation for your meal? Thank you! — Kari";

export type BurmeseRecheckEntry = { name: string; phone: string };

export const BURMESE_RECHECK_ROSTER: BurmeseRecheckEntry[] = [
  { name: "Adrianna Marie Gonzalez", phone: "4028076980" },
  { name: "Alice Tuttle", phone: "4023198538" },
  { name: "Angela Waters", phone: "4026161025" },
  { name: "Anita Lindell", phone: "3082584911" },
  { name: "Autumn Carlson", phone: "4024608121" },
  { name: "Brenda Lucas", phone: "4028045102" },
  { name: "Catina Reeves", phone: "5312504883" },
  { name: "Chanel Jones", phone: "2139097589" },
  { name: "Dee Sallis", phone: "4022136518" },
  { name: "Deshon Bradley", phone: "4193714774" },
  { name: "Donette Madlock", phone: "4022028018" },
  { name: "Eh Paw", phone: "4022033249" },
  { name: "Elissa Johnson", phone: "4029060345" },
  { name: "Evan Hale", phone: "4027181847" },
  { name: "Gayle Swanson", phone: "4029814025" },
  { name: "Gina Moore", phone: "4029815972" },
  { name: "Ian Monaghan", phone: "4026395296" },
  { name: "Jennifer Gray", phone: "4022975224" },
  { name: "Jody Wommock", phone: "7204049198" },
  { name: "Julie Hegnet", phone: "4026760738" },
  { name: "Justy Lindell", phone: "4025709844" },
  { name: "Kathie and Dan Bennett", phone: "4022032151" },
  { name: "Kodjovi Pinto-Keko", phone: "4023069752" },
  { name: "Latea Glenn", phone: "4026865008" },
  { name: "Liza Efigenio", phone: "4025157916" },
  { name: "Maggie Gibson", phone: "4029174152" },
  { name: "Nathan Blaine", phone: "4025168841" },
  { name: "Raquel Winkler", phone: "4024153362" },
  { name: "Rick & Maddie Madrid", phone: "5623264395" },
  { name: "Selina Neizer", phone: "4029991465" },
  { name: "Stephanie Williams", phone: "4026869238" },
  { name: "Tess Andersen", phone: "4026692812" },
  { name: "Tiana Stoddard", phone: "4022028845" },
  { name: "Tina Santana", phone: "4026577364" },
];

/** Fill {name} (first name) and {fullName}/{guest} in the recheck template. */
export function renderBurmeseRecheckText(template: string, guestName: string) {
  const full = (guestName ?? "").trim();
  const first = (full.split(/\s+/)[0] ?? "").replace(/[,;:.]+$/, "");
  return (template || DEFAULT_BURMESE_RECHECK_TEMPLATE)
    .replaceAll("{name}", first || full || "there")
    .replaceAll("{guest}", full || first || "there")
    .replaceAll("{fullName}", full || first || "there");
}
