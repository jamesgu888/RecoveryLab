import { NextRequest, NextResponse } from "next/server";
import { listAvatars } from "@/lib/recoverai/heygen";

/**
 * GET /api/avatar/list
 * Returns available HeyGen avatars for user selection
 */
export async function GET(_req: NextRequest) {
  try {
    const avatars = await listAvatars();
    return NextResponse.json({ success: true, data: avatars });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
