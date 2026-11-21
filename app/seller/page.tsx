
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SellerProfile = {
  nama_lengkap: string;
  jenis_akun: string;
};

type StoreProfile = {
  nama_toko: string;
  username_toko: string | null;
};

export default function SellerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [nama, setNama] = useState("Penjual");
  const [namaToko, setNamaToko] = useState("");
  const [usernameToko, setUsernameToko] = useState("");
  const [mode, setMode] = useState<"wa" | "x">("wa");
  const [query, setQuery] = useState("");
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    async function loadSeller() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profil_pengguna")
        .select("nama_lengkap, jenis_akun")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        setPesan("Profil pengguna tidak ditemukan.");
        setLoading(false);
        return;
      }

      const sellerProfile = profile as SellerProfile;

      if (sellerProfile.jenis_akun !== "seller") {
        router.replace("/buyer");
        return;
      }

      setNama(sellerProfile.nama_lengkap || "Penjual");

      const { data: store } = await supabase
        .from("profil_toko")
        .select("nama_toko, username_toko")
        .eq("id", user.id)
        .single();

      if (store) {
        const storeProfile = store as StoreProfile;
        setNamaToko(storeProfile.nama_toko || "");
        setUsernameToko(storeProfile.username_toko || "");
      }

      setLoading(false);
    }

    loadSeller();
  }, [router, supabase]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      setPesan(
        mode === "wa"
          ? "Masukkan nomor WhatsApp terlebih dahulu."
          : "Masukkan username X terlebih dahulu."
      );
      return;
    }

    setPesan("Fitur pengecekan reputasi akan segera dihubungkan ke database.");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f4f6fa]">
        <p className="text-[#647089]">Memuat halaman penjual...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6fa] text-[#172033]">
      <div className="mx-auto max-w-6xl px-4 pb-12">

        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e3e7f0] bg-white py-4">
          <Link href="/seller" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#182550] text-lg font-bold text-white">
              T
            </div>
            <div>
              <h1 className="font-extrabold text-[#162350]">TrustX</h1>
              <p className="text-xs text-[#667089]">Cek Dulu</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/seller"
              className="rounded-xl bg-[#eef1f8] px-4 py-2 text-sm font-semibold text-[#162350]"
            >
              Beranda
            </Link>
            <Link
              href="/seller/laporan"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-[#667089] hover:bg-[#eef1f8]"
            >
              Laporan
            </Link>
            <Link
              href="/seller/profil-toko"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-[#667089] hover:bg-[#eef1f8]"
            >
              Akun Toko
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Notifikasi"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e3e7f0] bg-white"
            >
              ♧
            </button>

            <Link
              href="/profil"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#182550] font-semibold text-white"
            >
              {nama.charAt(0).toUpperCase()}
            </Link>
          </div>
        </header>

        {/* HERO */}
        <section className="relative mt-6 overflow-hidden bg-[#182550] px-6 py-9 text-white sm:px-10 sm:py-12">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
              🛡 Cek dulu sebelum transaksi
            </span>

            <h2 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl">
              Cek Reputasi Sebelum Transaksi
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-7 text-white/75">
              Pastikan akun penjual di X terpercaya, hindari penipuan,
              dan belanja dengan aman.
            </p>

            <ul className="mt-5 flex flex-wrap gap-3 text-sm text-white/90">
              <li className="rounded-lg bg-white/10 px-3 py-2">⌕ Nomor WA & username X</li>
              <li className="rounded-lg bg-white/10 px-3 py-2">♧ Laporan komunitas</li>
              <li className="rounded-lg bg-white/10 px-3 py-2">✓ Riwayat pengecekan</li>
            </ul>
          </div>

          <div className="pointer-events-none absolute -right-12 -top-16 hidden h-72 w-72 rounded-full border-white/5 sm:block" />
          <div className="pointer-events-none absolute -bottom-32 right-24 hidden h-64 w-64 rounded-full bg-[#4f6bd8]/20 sm:block" />
        </section>

        {/* SAPAAN */}
        <section className="mt-6">
          <p className="text-sm text-[#667089]">Selamat datang kembali,</p>
          <h2 className="mt-1 text-2xl font-bold">{nama}</h2>

          {namaToko && (
            <p className="mt-1 text-sm text-[#667089]">
              {namaToko}
              {usernameToko && ` · @${usernameToko.replace(/^@/, "")}`}
            </p>
          )}
        </section>

        {/* CEK REPUTASI */}
        <section className="mt-6 rounded-2xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-bold">Cek Reputasi Akun</h2>
          <p className="mt-1 text-sm text-[#667089]">
            Periksa akun sebelum melakukan transaksi.
          </p>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("wa");
                setQuery("");
                setPesan("");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                mode === "wa"
                  ? "bg-[#182550] text-white"
                  : "bg-[#eef1f8] text-[#667089]"
              }`}
            >
              Nomor WA
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("x");
                setQuery("");
                setPesan("");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                mode === "x"
                  ? "bg-[#182550] text-white"
                  : "bg-[#eef1f8] text-[#667089]"
              }`}
            >
              Username X
            </button>
          </div>

          <form onSubmit={handleSearch} className="mt-4">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPesan("");
              }}
              placeholder={
                mode === "wa"
                  ? "Masukkan nomor WhatsApp..."
                  : "Masukkan username X..."
              }
              className="w-full rounded-xl border border-[#e3e7f0] px-4 py-3 outline-none transition focus:border-[#4f6bd8] focus:ring-2 focus:ring-[#4f6bd8]/10"
            />

            {pesan && (
              <p className="mt-3 rounded-lg bg-[#fff1f1] px-3 py-2 text-sm text-[#b42332]">
                {pesan}
              </p>
            )}

            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-[#4f6bd8] px-4 py-3 font-bold text-white transition hover:bg-[#3d59c0]"
            >
              CEK REPUTASI
            </button>
          </form>
        </section>

        {/* ACTION CARDS */}
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e3e7f0] bg-white p-5 sm:flex-row sm:items-center">
            <div>
              <span className="text-2xl">🏪</span>
              <h3 className="mt-2 font-bold">Akun toko kamu dituduh keliru?</h3>
              <p className="mt-1 text-sm leading-6 text-[#667089]">
                Gunakan hak jawab resmi untuk pulihkan reputasi tokomu.
              </p>
            </div>
            <Link
              href="/seller/laporan"
              className="shrink-0 rounded-xl border border-[#e3e7f0] px-4 py-3 text-center text-sm font-semibold text-[#182550] hover:bg-[#eef1f8]"
            >
              Ajukan Sanggahan →
            </Link>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e3e7f0] bg-white p-5 sm:flex-row sm:items-center">
            <div>
              <span className="text-2xl">🤝</span>
              <h3 className="mt-2 font-bold">Kena Tipu atau Transaksi Sukses?</h3>
              <p className="mt-1 text-sm leading-6 text-[#667089]">
                Bantu komunitas pembeli & penjual tetap aman.
              </p>
            </div>
            <Link
              href="/seller/lapor"
              className="shrink-0 rounded-xl bg-[#182550] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-[#263a70]"
            >
              + Lapor
            </Link>
          </div>
        </section>

        {/* FEED */}
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Feed Laporan Komunitas</h2>
            <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#667089]">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Live Monitor
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-[#e3e7f0] bg-white p-6 text-center">
            <p className="text-sm text-[#667089]">
              Feed laporan akan ditampilkan di sini setelah dihubungkan
              dengan database Supabase.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-10 border-t border-[#e3e7f0] py-6 text-center text-xs text-[#667089]">
          © 2026 TrustX. Cek Dulu Sebelum Transaksi.
        </footer>
      </div>
    </main>
  );
}
