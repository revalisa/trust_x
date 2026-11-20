"use client";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main>
      <h1>Halaman Login TrustX</h1>

      <button onClick={() => router.push("/")}>
        Kembali ke Beranda
      </button>

      <button onClick={() => router.push("/dashboard")}>
        Masuk ke Dashboard
      </button>
    </main>
  );
}