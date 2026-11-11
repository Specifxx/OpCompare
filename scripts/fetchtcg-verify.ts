// temporary
import { fetchRowsFor } from "../src/lib/fetchtcg";
const probes: [string, string][] = [["Roronoa Zoro", "OP01-001"], ["Monkey.D.Luffy", "OP01-003"], ["Nami", "OP01-016"], ["Okiku", "OP01-035"], ["Trafalgar Law", "OP01-002"], ["Portgas.D.Ace", "OP02-013"], ["Edward.Newgate", "OP02-001"], ["Kuzan", "OP02-064"]];
for (const [name, number] of probes) { const r = fetchRowsFor({ name, number, variant: null }); console.log(number, name, r ? `${r.rows[0].condition} ${r.rows[0].priceCents}c` : "no row"); }
