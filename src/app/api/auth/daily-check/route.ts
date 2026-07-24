import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { getCurrentUser } from "@/lib/user-auth";

export async function GET() {
  const adminSession = await getAdminSession();
  const user = adminSession ? null : await getCurrentUser();

  return new NextResponse(null, {
    status: adminSession || user ? 204 : 401,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
}
