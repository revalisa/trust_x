import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Jika belum login, arahkan ke halaman login
  if (!user) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Selamat datang di TrustX</h1>
      <p>{user.email}</p>
    </main>
  );
}