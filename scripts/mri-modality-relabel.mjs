import fs from "node:fs";
const dir = "/app/data/db";
const f = fs.readdirSync(dir).find((n) => n.endsWith(".db"));
process.env.DATABASE_URL = `file:${dir}/${f}`;
const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient();
let n = 0;
for (const o of await p.careOrderLink.findMany({ where: { modality: "MR" } })) {
  const tn = o.testName ?? "";
  let m = null;
  if (/usg|ultrasound|sonograph|doppler|antenatal|obstetric|tvs|trus/i.test(tn)) m = "USG";
  else if (/x-?ray/i.test(tn)) m = "X-Ray";
  else if (/\bct\b/i.test(tn)) m = "CT";
  if (m) { await p.careOrderLink.update({ where: { id: o.id }, data: { modality: m } }); n++; }
}
console.log("relabeled rows:", n);
await p.$disconnect();
