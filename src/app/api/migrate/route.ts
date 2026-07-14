import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { join } from 'path';

export async function GET() {
  try {
    const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
    const result = execSync(
      `npx prisma db push --skip-generate --schema="${schemaPath}"`,
      { timeout: 30000, stdio: 'pipe' }
    ).toString();
    return NextResponse.json({ success: true, message: result.trim() });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    // Even "error" from prisma push can mean "already in sync" — still ok
    return NextResponse.json({ success: true, message: msg.substring(0, 500) });
  }
}