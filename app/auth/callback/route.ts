
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Mencegah redirect ke alamat eksternal
  const safeNext =
    next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/";

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth", origin)
    );
  }

  try {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback error:", error.message);

      return NextResponse.redirect(
        new URL("/login?error=auth", origin)
      );
    }

    // Login berhasil, arahkan ke halaman utama
    return NextResponse.redirect(
      new URL(safeNext, origin)
    );

  } catch (error) {
    console.error("Callback error:", error);

    return NextResponse.redirect(
      new URL("/login?error=auth", origin)
    );
  }
}
