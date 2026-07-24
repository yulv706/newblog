import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/request-security";
import {
  requireUserSession,
  sanitizeUserDisplayName,
  updateUserDisplayName,
} from "@/lib/user-auth";

type RequestBody = {
  displayName?: unknown;
};

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let user;
  try {
    user = await requireUserSession();
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const displayName = sanitizeUserDisplayName(
    typeof body.displayName === "string" ? body.displayName : ""
  );
  if (!displayName) {
    return NextResponse.json(
      { ok: false, reason: "invalid_display_name" },
      { status: 400 }
    );
  }

  const updated = updateUserDisplayName(user.id, displayName);
  if (!updated) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json(
    { ok: true, user: updated },
    { headers: { "Cache-Control": "no-store" } }
  );
}
