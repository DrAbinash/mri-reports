import { NextResponse } from "next/server";
import fs from "fs";
export async function GET() {
  try {
    const dir = "/app/data/backup-snapshot";
    if (!fs.existsSync(dir)) return NextResponse.json({ ok: false });
    const files = fs.readdirSync(dir);
    if (!files.length) return NextResponse.json({ ok: false });
    const newest = Math.max(...files.map(f => fs.statSync(`${dir}/${f}`).mtimeMs));
    const ageH = (Date.now() - newest) / 3600000;
    return NextResponse.json({
      ok: ageH < 36,
      last: new Date(newest).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
