// temporary
import { fetchRowsFor } from "../src/lib/fetchtcg";
const probes: [string, string, string][] = [["Roronoa Zoro", "OP01-001", "Normal"], ["Nami", "OP01-016", "Foil"], ["Okiku", "OP01-035", "Foil"], ["Monkey.D.Luffy", "OP01-003", "Foil"], ["Portgas.D.Ace", "OP02-013", "Foil"]];
for (const [name, number, finish] of probes) { const r = fetchRowsFor({ name, number, variant: null, finish }); console.log(number, name, r ? `${r.rows[0].condition} ${r.rows[0].priceCents}c` : "no row"); }
