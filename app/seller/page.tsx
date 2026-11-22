
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

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

  const [loading, setLoading] = useState(true);
  const [nama, setNama] = useState("Penjual");
  const [namaToko, setNamaToko] = useState("");
  const [mode, setMode] = useState<"wa" | "x">("wa");
  const [query, setQuery] = useState("");
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    let aktif = true;

    async function loadSeller() {
      const supabase = createClient();

      try {
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
          if (aktif) setPesan("Profil pengguna tidak ditemukan.");
          return;
        }

        const sellerProfile = profile as SellerProfile;

        if (sellerProfile.jenis_akun !== "seller") {
          router.replace("/buyer");
          return;
        }

        if (aktif) {
          setNama(sellerProfile.nama_lengkap || "Penjual");
        }

        const { data: store } = await supabase
          .from("profil_toko")
          .select("nama_toko, username_toko")
          .eq("id", user.id)
          .maybeSingle();

        if (aktif && store) {
          const storeProfile = store as StoreProfile;
          setNamaToko(storeProfile.nama_toko || "");
        }
      } catch (error) {
        console.error("Gagal memuat profil seller:", error);
        if (aktif) {
          setPesan("Terjadi kesalahan saat memuat profil.");
        }
      } finally {
        if (aktif) setLoading(false);
      }
    }

    loadSeller();

    return () => {
      aktif = false;
    };
  }, [router]);

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

    setPesan(
      "Fitur pengecekan reputasi akan segera dihubungkan ke database."
    );
  }

  const initialProfil = nama.trim().charAt(0).toUpperCase() || "P";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6fa]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e1e7f5] border-t-[#4f6bd8]" />
          <p className="text-sm font-medium text-[#647089]">
            Memuat halaman penjual...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fc] text-[#172033]">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#e8ecf4] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* BRAND */}
          <Link href="/seller" className="flex shrink-0 items-center gap-3">
            <Image
              src="/assets/images/logo-trustx.svg"
              alt="Logo TrustX"
              width={42}
              height={42}
              priority
            />
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-[#162350]">
                TrustX
              </h1>
              <p className="text-[11px] font-medium text-[#8992a7]">
                Seller Workspace
              </p>
            </div>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/seller"
              aria-current="page"
              className="rounded-xl bg-[#eef2ff] px-4 py-2.5 text-sm font-bold text-[#405ec7]"
            >
              Beranda
            </Link>
            <Link
              href="/seller/laporan"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#68748c] transition hover:bg-[#f4f6fa] hover:text-[#162350]"
            >
              Laporan
            </Link>
            <Link
              href="/seller/profil"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#68748c] transition hover:bg-[#f4f6fa] hover:text-[#162350]"
            >
              Akun Toko
            </Link>
          </nav>

          {/* HEADER ACTIONS */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* NOTIFICATION */}
            <button
              type="button"
              aria-label="Notifikasi"
              title="Notifikasi"
              className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#e8ecf4] bg-white text-[#53617d] transition hover:border-[#cdd7f5] hover:bg-[#f5f7ff] hover:text-[#4f6bd8]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#4f6bd8]" />
            </button>

            {/* PROFILE AVATAR */}
            <Link
              href="/seller/profil"
              aria-label={`Profil ${nama}`}
              title={nama}
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-linear-to-br from-[#4f6bd8] to-[#162350] text-sm font-extrabold uppercase text-white shadow-md ring-1 ring-[#4f6bd8]/20 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:ring-[#4f6bd8]/50"
            >
              {initialProfil}
            </Link>
          </div>
        </div>

        {/* MOBILE NAVIGATION */}
        <nav className="flex border-t border-[#edf0f6] px-3 py-2 md:hidden">
          <Link
            href="/seller"
            aria-current="page"
            className="flex-1 rounded-lg bg-[#eef2ff] py-2 text-center text-xs font-bold text-[#405ec7]"
          >
            Beranda
          </Link>
          <Link
            href="/seller/laporan"
            className="flex-1 rounded-lg py-2 text-center text-xs font-semibold text-[#68748c] transition hover:bg-[#f4f6fa]"
          >
            Laporan
          </Link>
          <Link
            href="/seller/profil"
            className="flex-1 rounded-lg py-2 text-center text-xs font-semibold text-[#68748c] transition hover:bg-[#f4f6fa]"
          >
            Akun Toko
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* HERO / WELCOME */}
        <section className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#162350] via-[#22346b] to-[#3c56ad] px-6 py-8 text-white shadow-xl shadow-[#162350]/10 sm:px-10 sm:py-11 lg:px-12">
          {/* DECORATION */}
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 right-36 h-64 w-64 rounded-full bg-[#6c88f5]/15 blur-2xl" />
          <div className="pointer-events-none absolute bottom-10 right-10 h-24 w-24 rounded-full bg-[#8ea6ff]/10 blur-xl" />

          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              {/* WELCOME LABEL */}
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path d="M12 3 4.5 6v5c0 4.5 3 7.5 7.5 10 4.5-2.5 7.5-5.5 7.5-10V6L12 3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Ruang aman transaksi digital
              </span>

              {/* GREETING */}
              <p className="mt-6 text-sm font-semibold tracking-wide text-[#c5d2ff] sm:text-base">
                Selamat datang kembali 👋
              </p>

              {/* USER NAME */}
              <h1 className="mt-2 break-word text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                {nama}
              </h1>

              {/* TRANSACTION SAFE TEXT */}
              <div className="mt-3 inline-flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 shrink-0 text-[#a9bcff]"
                >
                  <path d="M12 3 4.5 6v5c0 4.5 3 7.5 7.5 10 4.5-2.5 7.5-5.5 7.5-10V6L12 3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span className="text-sm font-bold text-[#c5d2ff] sm:text-base">
                  Transaksi Aman bersama TrustX
                </span>
              </div>

              {/* DESCRIPTION */}
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/75 sm:text-base">
                Pastikan reputasi akun sebelum bertransaksi. Cari informasi,
                kenali riwayat laporan, dan jadilah bagian dari komunitas
                digital yang lebih aman.
              </p>

              {/* FEATURE BADGES */}
              <div className="mt-6 flex flex-wrap gap-2.5">
                {[
                  "Pengecekan akun",
                  "Laporan komunitas",
                  "Informasi transparan",
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-sm"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-3.5 w-3.5 text-[#a9bcff]"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* HERO ILLUSTRATION */}
            <div className="hidden lg:flex lg:items-center lg:justify-center">
              <div className="relative flex h-56 w-56 items-center justify-center rounded-[36px] border border-white/15 bg-white/10 shadow-2xl backdrop-blur-sm">
                <div className="absolute inset-5 rounded-[28px] border border-white/10" />

                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-linear-to-br from-[#7792ff] to-[#4f6bd8] shadow-2xl shadow-black/20">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    className="h-16 w-16 text-white"
                  >
                    <path d="M12 3 4.5 6v5c0 4.5 3 7.5 7.5 10 4.5-2.5 7.5-5.5 7.5-10V6L12 3Z" />
                    <path d="m8.5 12 2.5 2.5 5-5" />
                  </svg>
                </div>

                {/* FLOATING SEARCH ICON */}
                <div className="absolute -right-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-[#162350] shadow-lg">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5 text-[#a9bcff]"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                </div>

                {/* FLOATING BADGE */}
                <div className="absolute -bottom-4 -left-5 rounded-xl border border-white/15 bg-[#25376e] px-3 py-2 text-xs font-bold text-white shadow-lg">
                  Trust & Safety
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STORE INFO */}
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e4e9f3] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
              >
                <path d="M3 10h18l-2-6H5l-2 6Z" />
                <path d="M4 10v10h16V10" />
                <path d="M9 20v-6h6v6" />
              </svg>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium text-[#8992a7]">
                Profil toko
              </p>
              <p className="truncate text-sm font-bold text-[#162350] sm:text-base">
                {namaToko}
              </p>
            </div>
          </div>

          <Link
            href="/seller/profil"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#e3e7f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#53617d] transition hover:border-[#cbd4ed] hover:bg-[#f5f7ff] hover:text-[#4f6bd8]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-4 w-4"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M5 21a7 7 0 0 1 14 0" />
            </svg>
            Kelola Profil
          </Link>
        </section>

        {/* REPUTATION CHECK */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-[#e5eaf3] bg-white shadow-sm">
          <div className="border-b border-[#edf0f6] px-5 py-5 sm:px-7">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f6bd8]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#162350] sm:text-xl">
                  Cek Reputasi Akun
                </h2>
                <p className="mt-1 text-sm text-[#8490a5]">
                  Periksa akun sebelum melakukan transaksi.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {/* SEARCH MODE */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f4f6fa] p-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode("wa");
                  setQuery("");
                  setPesan("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition-all ${
                  mode === "wa"
                    ? "bg-white text-[#162350] shadow-sm"
                    : "text-[#8992a7] hover:text-[#162350]"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path d="M20 11.5a8.2 8.2 0 0 1-12.3 7L4 20l1.5-3.7A8.2 8.2 0 1 1 20 11.5Z" />
                  <path d="M8.5 8.5c.5 2.5 2.5 4.5 5 5l1-1.5 2 1c-.5 1.5-1.5 2-2.5 2C10.5 14.5 7.5 11.5 7 9c0-1 .5-2 2-2.5l1 2-1.5 1Z" />
                </svg>
                Nomor WhatsApp
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("x");
                  setQuery("");
                  setPesan("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition-all ${
                  mode === "x"
                    ? "bg-white text-[#162350] shadow-sm"
                    : "text-[#8992a7] hover:text-[#162350]"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-6.3L6.6 22H3.5l7.3-8.4L3 2h6.3l4.3 5.8L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" />
                </svg>
                Username X
              </button>
            </div>

            {/* SEARCH FORM */}
            <form onSubmit={handleSearch} className="mt-5">
              <label
                htmlFor="reputation-query"
                className="mb-2 block text-sm font-bold text-[#34415f]"
              >
                {mode === "wa" ? "Nomor WhatsApp" : "Username X"}
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#98a1b4]">
                    {mode === "wa" ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-5 w-5"
                      >
                        <path d="M20 11.5a8.2 8.2 0 0 1-12.3 7L4 20l1.5-3.7A8.2 8.2 0 1 1 20 11.5Z" />
                        <path d="M8.5 8.5c.5 2.5 2.5 4.5 5 5l1-1.5 2 1c-.5 1.5-1.5 2-2.5 2C10.5 14.5 7.5 11.5 7 9c0-1 .5-2 2-2.5l1 2-1.5 1Z" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                      >
                        <path d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-6.3L6.6 22H3.5l7.3-8.4L3 2h6.3l4.3 5.8L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" />
                      </svg>
                    )}
                  </span>

                  <input
                    id="reputation-query"
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
                    className="w-full rounded-xl border border-[#e3e7f0] bg-[#fbfcfe] py-3.5 pl-12 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#a3adbf] focus:border-[#4f6bd8] focus:bg-white focus:ring-4 focus:ring-[#4f6bd8]/10"
                  />
                </div>

                <button
                  type="submit"
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#4f6bd8] px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-[#4f6bd8]/15 transition hover:bg-[#405ec7] active:scale-[0.98] sm:w-auto"
                >
                  Cek Reputasi
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </button>
              </div>

              {pesan && (
                <p
                  role="status"
                  className="mt-3 rounded-xl border border-[#f1d5d8] bg-[#fff5f5] px-4 py-3 text-sm text-[#b42332]"
                >
                  {pesan}
                </p>
              )}

              <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-[#98a1b4]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="mt-0.5 h-4 w-4 shrink-0"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5" />
                  <path d="M12 8h.01" />
                </svg>
                Gunakan informasi akun yang benar untuk membantu proses pengecekan.
              </p>
            </form>
          </div>
        </section>

        {/* ACTION CARDS */}
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* APPEAL CARD */}
          <article className="group relative overflow-hidden rounded-[22px] border border-[#e4e9f3] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#162350]/5 sm:p-6">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#eef2ff] transition group-hover:scale-110" />

            <div className="relative z-10 flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f6bd8]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                  >
                    <path d="M4 4h16v13H4z" />
                    <path d="M8 8h8M8 11h5M9 17l3 3 3-3" />
                  </svg>
                </div>

                <h3 className="mt-4 text-base font-extrabold text-[#162350]">
                  Akun toko kamu dituduh keliru?
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#7b879d]">
                  Gunakan hak jawab resmi untuk memberikan klarifikasi dan
                  memulihkan reputasi tokomu.
                </p>
              </div>

              <Link
                href="/seller/laporan"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e3e7f0] bg-white px-4 py-3 text-sm font-bold text-[#263861] transition hover:border-[#4f6bd8]/40 hover:bg-[#f5f7ff] hover:text-[#4f6bd8]"
              >
                Ajukan Sanggahan
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            </div>
          </article>

          {/* COMMUNITY REPORT CARD */}
          <article className="group relative overflow-hidden rounded-[22px] bg-linear-to-br from-[#162350] to-[#2d427f] p-5 text-white shadow-md shadow-[#162350]/10 transition hover:-translate-y-1 hover:shadow-lg sm:p-6">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-[#4f6bd8]/20 blur-2xl" />

            <div className="relative z-10 flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#c1ceff]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                  >
                    <path d="M21 11.5a8.2 8.2 0 0 1-12.3 7L4 20l1.5-3.7A8.2 8.2 0 1 1 21 11.5Z" />
                    <path d="M8 10h8M8 13h5" />
                  </svg>
                </div>

                <h3 className="mt-4 text-base font-extrabold text-white">
                  Kena tipu atau transaksi sukses?
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/65">
                  Bagikan pengalaman transaksi untuk membantu komunitas
                  pembeli dan penjual lebih aman.
                </p>
              </div>

              <Link
                href="/seller/lapor"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#162350] shadow-sm transition hover:bg-[#eef2ff]"
              >
                <span className="text-lg leading-none">+</span>
                Buat Laporan
              </Link>
            </div>
          </article>
        </section>

        {/* COMMUNITY FEED */}
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#162350]">
                Feed Laporan Komunitas
              </h2>
              <p className="mt-1 text-sm text-[#8a95a9]">
                Pantau informasi dan aktivitas komunitas.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-[#dcefe4] bg-[#f0faf4] px-3 py-1.5 text-xs font-bold text-[#328454]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Live Monitor
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-[22px] border border-[#e4e9f3] bg-white shadow-sm">
            <div className="flex flex-col items-center px-5 py-12 text-center sm:py-14">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f6bd8]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-7 w-7"
                >
                  <path d="M4 5h16v14H4z" />
                  <path d="M8 9h8M8 12h8M8 15h5" />
                </svg>
              </div>

              <h3 className="mt-4 text-base font-bold text-[#263657]">
                Feed komunitas segera hadir
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#8a95a9]">
                Feed laporan akan ditampilkan di sini setelah dihubungkan
                dengan database Supabase.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-10 border-t border-[#e3e7f0] pt-6">
          <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <p className="text-xs text-[#98a1b4]">
              © 2026 TrustX. Cek Dulu Sebelum Transaksi.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
