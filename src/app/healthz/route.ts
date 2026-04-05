import { NextResponse } from "next/server";
import { getRuntimeHealth } from "@/lib/runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const health = getRuntimeHealth();

  return NextResponse.json(health, {
    status: health.status === "ok" ? 200 : 503,
  });
}
