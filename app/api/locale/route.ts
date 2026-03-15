import { NextResponse } from "next/server";

const ALLOWED = new Set(["en", "hi", "bn"]);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { locale?: unknown } | null;
  const locale = typeof body?.locale === "string" ? body.locale.trim() : "";

  if (!ALLOWED.has(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, locale });

  // next-intl reads NEXT_LOCALE by default in middleware.
  res.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}

