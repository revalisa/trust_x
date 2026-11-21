import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth", origin)
    );
  }

  try {
    const supabase = await createClient();

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("OAuth exchange:", exchangeError.message);

      return NextResponse.redirect(
        new URL("/login?error=auth", origin)
      );
    }

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.redirect(
        new URL("/login?error=auth", origin)
      );
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profil_pengguna")
        .select("jenis_akun")
        .eq("id", userData.user.id)
        .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL("/login?error=profile", origin)
      );
    }

    if (profile.jenis_akun === "buyer") {
      return NextResponse.redirect(
        new URL("/buyer", origin)
      );
    }

    if (profile.jenis_akun === "seller") {
      return NextResponse.redirect(
        new URL("/seller", origin)
      );
    }

    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL("/login?error=role", origin)
    );
  } catch (error) {
    console.error("OAuth callback:", error);

    return NextResponse.redirect(
      new URL("/login?error=auth", origin)
    );
  }
}