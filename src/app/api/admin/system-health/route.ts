import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { getSystemHealthSnapshot } from "@/lib/admin/system-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getSystemHealthSnapshot(), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
