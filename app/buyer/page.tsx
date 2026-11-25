"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type BuyerProfile = {
  nama_lengkap: string;
  jenis_akun: string;
};

type CheckItem = {
  id: string;
  search_type: "whatsapp" | "x";
  search_value: string;
  created_at: string;
};

type ReportItem = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

type ReputationResult = {
  toko: {
    id: string;
    nama_toko: string;
  };
  total: number;
  reports: {
    id: string;
    judul_laporan: string;
    status_laporan: string;
    tanggal_dibuat: string;
  }[];
};

export default function BuyerPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [nama, setNama] = useState("Pembeli");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"wa" | "x">("wa");
  const [query, setQuery] = useState("");
  const [pesan, setPesan] = useState("");
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [reputationResult, setReputationResult] =
    useState<ReputationResult | null>(null);

  // ==========================================
  // LOAD PROFIL DAN DATA BUYER
  // ==========================================
  useEffect(() => {
    let aktif = true;

    async function loadBuyer() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profil_pengguna")
          .select("nama_lengkap, jenis_akun")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile error:", profileError.message);
          if (aktif) setPesan("Gagal memuat profil pengguna.");
          return;
        }

        const buyerProfile = profile as BuyerProfile | null;

        if (!profile || buyerProfile?.jenis_akun !== "buyer") {
          router.replace(
            profile?.jenis_akun === "seller" ? "/seller" : "/login"
          );
          return;
        }

        if (!aktif) return;

        setNama(profile.nama_lengkap || "Pembeli");
        setEmail(user.email || "");

        // RIWAYAT PENGECEKAN
        const { data: history, error: historyError } = await supabase
          .from("reputation_checks")
          .select("id, search_type, search_value, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (historyError) {
          console.error("History error:", historyError.message);
        }

        if (aktif) setChecks((history || []) as CheckItem[]);

        // LAPORAN MILIK BUYER
        const { data: reportData, error: reportError } = await supabase
          .from("laporan")
          .select("id, judul_laporan, status_laporan, tanggal_dibuat")
          .eq("pembeli_id", user.id)
          .order("tanggal_dibuat", { ascending: false })
          .limit(5);

        if (reportError) {
          console.error("Reports error:", reportError.message);
        }

        if (aktif) {
          setReports(
            (reportData || []).map((item) => ({
              id: item.id,
              title: item.judul_laporan || "Laporan tanpa judul",
              status: item.status_laporan || "menunggu",
              created_at: item.tanggal_dibuat,
            }))
          );
        }
      } catch (error) {
        console.error("Gagal memuat dashboard buyer:", error);
        if (aktif) setPesan("Terjadi kesalahan saat memuat dashboard.");
      } finally {
        if (aktif) setLoading(false);
      }
    }

    loadBuyer();

    return () => {
      aktif = false;
    };
  }, [router, supabase]);

  // ==========================================
  // CEK REPUTASI
  // ==========================================
  async function handleSearch(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setPesan("");
  setReputationResult(null);

  const value = query.trim();

  // VALIDASI INPUT
  if (!value) {
    setPesan(
      mode === "wa"
        ? "Masukkan nomor WhatsApp terlebih dahulu."
        : "Masukkan username X terlebih dahulu."
    );
    return;
  }

  if (mode === "wa" && !/^\+?[0-9\s-]{8,20}$/.test(value)) {
    setPesan("Format nomor WhatsApp tidak valid.");
    return;
  }

  if (mode === "x" && !/^@?[a-zA-Z0-9_]{1,15}$/.test(value)) {
    setPesan("Format username X tidak valid.");
    return;
  }

  // USERNAME X BELUM TERSEDIA DI DATABASE
  if (mode === "x") {
    setPesan(
      "Pengecekan username X belum tersedia karena database TrustX belum menyimpan nama toko."
    );
    return;
  }

  setSearching(true);

  try {
    // CEK USER LOGIN
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setPesan("Sesi akun berakhir. Silakan login kembali.");
      router.replace("/login");
      return;
    }

    // NORMALISASI NOMOR TELEPON
    const nomor = value.replace(/\D/g, "");

    const nomorAlternatif = nomor.startsWith("62")
      ? "0" + nomor.slice(2)
      : nomor.startsWith("0")
        ? "62" + nomor.slice(1)
        : "62" + nomor;

    const kandidatNomor = Array.from(
      new Set([value.trim(), nomor, nomorAlternatif])
    );

    // CARI TOKO BERDASARKAN NOMOR TELEPON
    let toko: { id: string; nama_toko: string } | null = null;

    for (const nomorCari of kandidatNomor) {
      const { data: tokoData, error: tokoError } = await supabase
        .from("profil_toko")
        .select("id, nama_toko")
        .eq("nomor_telepon", nomorCari)
        .maybeSingle();

      if (tokoError) {
        console.error("Error pencarian toko:", {
          message: tokoError.message,
          code: tokoError.code,
          details: tokoError.details,
          hint: tokoError.hint,
        });

        throw tokoError;
      }

      if (tokoData) {
        toko = tokoData;
        break;
      }
    }

    // SIMPAN RIWAYAT PENCARIAN
    const { data: checkData, error: checkError } = await supabase
      .from("reputation_checks")
      .insert({
        user_id: user.id,
        search_type: "whatsapp",
        search_value: value,
      })
      .select("id, search_type, search_value, created_at")
      .single();

    if (checkError) {
      console.error("Error menyimpan cek reputasi:", checkError);
      throw checkError;
    }

    if (checkData) {
      setChecks((previous) =>
        [checkData as CheckItem, ...previous].slice(0, 5)
      );
    }

    // TOKO TIDAK DITEMUK
    if (!toko) {
      setPesan("Akun toko tidak ditemukan di TrustX.");
      setQuery("");
      return;
    }

    // AMBIL LAPORAN BERDASARKAN ID PENJUAL
    const { data: reportData, error: reportError } = await supabase
      .from("laporan")
      .select("id, judul_laporan, status_laporan, tanggal_dibuat")
      .eq("penjual_id", toko.id)
      .order("tanggal_dibuat", { ascending: false });

    if (reportError) {
      console.error("Error mengambil laporan reputasi:", {
        message: reportError.message,
        code: reportError.code,
        details: reportError.details,
        hint: reportError.hint,
      });

      throw reportError;
    }

    // TAMPILKAN HASIL
    setReputationResult({
      toko: {
        id: toko.id,
        nama_toko: toko.nama_toko,
      },
      total: reportData?.length ?? 0,
      reports: reportData ?? [],
    });

    setQuery("");
    setPesan("Pengecekan reputasi berhasil.");

  } catch (error) {
    console.error("Reputation check error:", error);

    setPesan("Gagal memeriksa reputasi. Silakan coba kembali.");
  } finally {
    setSearching(false);
  }
}

  // ==========================================
  // LOGOUT
  // ==========================================
  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error.message);
        setPesan("Gagal keluar dari akun.");
        setLoggingOut(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setPesan("Terjadi kesalahan saat keluar.");
      setLoggingOut(false);
    }
  }

  // ==========================================
  // LOADING
  // ==========================================
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e1e7f5] border-t-[#4f6bd8]" />
          <p className="text-sm font-medium text-[#647089]">
            Memuat halaman pembeli...
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
          <Link href="/buyer" className="flex shrink-0 items-center gap-3">
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
                Buyer Workspace
              </p>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/buyer/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#eef2ff] px-4 py-2.5 text-sm font-bold text-[#4f6bd8]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m3 10 9-7 9 7" />
                <path d="M5 9v11h14V9M9 20v-6h6v6" />
              </svg>
              Beranda
            </Link>

            <Link
              href="/buyer/laporan"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#647089] transition hover:bg-[#f1f4fa] hover:text-[#162350]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M8 13h8M8 17h6" />
              </svg>
              Laporan
            </Link>

            <Link
              href="/buyer/profil"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#647089] transition hover:bg-[#f1f4fa] hover:text-[#162350]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21a7 7 0 0 1 14 0" />
              </svg>
              Profil
            </Link>
          </nav>

          {/* HEADER ACTION */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Notifikasi"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e3e7f0] bg-white text-[#647089] transition hover:bg-[#f4f6fa]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </button>

            <Link
              href="/buyer/profil"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-[#4f6bd8] to-[#162350] text-sm font-extrabold uppercase text-white shadow-sm transition hover:scale-105"
              title="Profil"
              aria-label="Profil"
            >
              {nama.slice(0, 1) || "B"}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden rounded-lg px-3 py-2 text-xs font-bold text-[#647089] transition hover:bg-red-50 hover:text-red-600 sm:block"
            >
              {loggingOut ? "Keluar..." : "Keluar"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* HERO / WELCOME */}
        <section className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#162350] via-[#22346b] to-[#3c56ad] px-6 py-8 text-white shadow-xl shadow-[#162350]/10 sm:px-10 sm:py-11 lg:px-12">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 right-36 h-64 w-64 rounded-full bg-[#6c88f5]/15 blur-2xl" />
          <div className="pointer-events-none absolute bottom-10 right-10 h-24 w-24 rounded-full bg-[#8ea6ff]/10 blur-xl" />

          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path d="M12 3 4.5 6v5c0 4.5 3 7.5 7.5 10 4.5-2.5 7.5-5.5 7.5-10V6L12 3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Ruang aman transaksi digital
              </span>

              <p className="mt-6 text-sm font-semibold tracking-wide text-[#c5d2ff] sm:text-base">
                Selamat datang kembali 👋
              </p>

              <h1 className="mt-2 wrap-break-word text-3xl font-extrabold capitalize leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                {nama}
              </h1>

              <div className="mt-3 inline-flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0 text-[#a9bcff]">
                  <path d="M12 3 4.5 6v5c0 4.5 3 7.5 7.5 10 4.5-2.5 7.5-5.5 7.5-10V6L12 3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span className="text-sm font-bold text-[#c5d2ff] sm:text-base">
                  Belanja Aman bersama TrustX
                </span>
              </div>

              <p className="mt-4 max-w-lg text-sm leading-7 text-white/75 sm:text-base">
                Pastikan reputasi akun sebelum bertransaksi. Cari informasi,
                kenali riwayat laporan, dan jadilah bagian dari komunitas
                digital yang lebih aman.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {["Pengecekan akun", "Laporan komunitas", "Informasi transparan"].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-sm"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-[#a9bcff]">
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-16 w-16 text-white">
                    <path d="M12 3 4.5 6v5c0 4.5 3 7.5 7.5 10 4.5-2.5 7.5-5.5 7.5-10V6L12 3Z" />
                    <path d="m8.5 12 2.5 2.5 5-5" />
                  </svg>
                </div>
                <div className="absolute -right-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-[#162350] shadow-lg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-[#a9bcff]">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                </div>
                <div className="absolute -bottom-4 -left-5 rounded-xl border border-white/15 bg-[#25376e] px-3 py-2 text-xs font-bold text-white shadow-lg">
                  Buyer Protection
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BUYER INFO */}
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e4e9f3] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21a7 7 0 0 1 14 0" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#8992a7]">Profil akun</p>
              <p className="truncate text-sm font-bold capitalize text-[#162350] sm:text-base">
                {nama}
              </p>
              {email && <p className="truncate text-xs text-[#8992a7]">{email}</p>}
            </div>
          </div>

          <Link
            href="/buyer/profil"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#e3e7f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#53617d] transition hover:border-[#cbd4ed] hover:bg-[#f5f7ff] hover:text-[#4f6bd8]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#162350] sm:text-xl">
                  Cek Reputasi Akun
                </h2>
                <p className="mt-1 text-sm text-[#8490a5]">
                  Periksa akun penjual sebelum melakukan transaksi.
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
                  setReputationResult(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition-all ${
                  mode === "wa"
                    ? "bg-white text-[#162350] shadow-sm"
                    : "text-[#8992a7] hover:text-[#162350]"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
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
                  setReputationResult(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition-all ${
                mode === "x"
                    ? "bg-white text-[#162350] shadow-sm"
                    : "text-[#8992a7] hover:text-[#162350]"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
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
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
                        <path d="M20 11.5a8.2 8.2 0 0 1-12.3 7L4 20l1.5-3.7A8.2 8.2 0 1 1 20 11.5Z" />
                        <path d="M8.5 8.5c.5 2.5 2.5 4.5 5 5l1-1.5 2 1c-.5 1.5-1.5 2-2.5 2C10.5 14.5 7.5 11.5 7 9c0-1 .5-2 2-2.5l1 2-1.5 1Z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
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
                      setReputationResult(null);
                    }}
                    placeholder={
                      mode === "wa"
                        ? "Masukkan nomor WhatsApp..."
                        : "Masukkan username X..."
                    }
                    disabled={searching}
                    autoComplete="off"
                    className="w-full rounded-xl border border-[#e3e7f0] bg-[#fbfcfe] py-3.5 pl-12 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#a3adbf] focus:border-[#4f6bd8] focus:bg-white focus:ring-4 focus:ring-[#4f6bd8]/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={searching}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#4f6bd8] px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-[#4f6bd8]/15 transition hover:bg-[#405ec7] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {searching ? "Memeriksa..." : "Cek Reputasi"}
                  {!searching && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  )}
                </button>
              </div>

              {pesan && (
                <p
                  role="status"
                  className={`mt-3 rounded-xl px-4 py-3 text-sm ${
                    pesan.toLowerCase().includes("berhasil")
                      ? "border border-[#dce6ff] bg-[#f3f6ff] text-[#405ec7]"
                      : "border border-[#f1d5d8] bg-[#fff5f5] text-[#b42332]"
                  }`}
                >
                  {pesan}
                </p>
              )}

              <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-[#98a1b4]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="mt-0.5 h-4 w-4 shrink-0">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5" />
                  <path d="M12 8h.01" />
                </svg>
                Gunakan informasi akun yang benar untuk membantu proses pengecekan.
              </p>
            </form>

            {reputationResult && (
  <div className="mt-5 rounded-2xl border border-[#e3e7f0] bg-[#f8faff] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-[#8992a7]">
          Toko yang ditemukan
        </p>

        <h3 className="mt-1 wrap-break-word text-lg font-extrabold text-[#162350">
          {reputationResult.toko.nama_toko}
        </h3>
      </div>

      <div className="rounded-xl border border-[#dce4ff] bg-white px-4 py-3 text-center">
        <p className="text-xs font-semibold text-[#667089]">
          Total Laporan
        </p>
        <p className="mt-1 text-2xl font-extrabold text-[#162350]">
          {reputationResult.total}
        </p>
      </div>
    </div>

    <div className="mt-4 border-t border-[#e3e7f0] pt-4">
      <h4 className="text-sm font-bold text-[#162350]">
        Riwayat Laporan Komunitas
      </h4>

      {reputationResult.reports.length === 0 ? (
        <p className="mt-3 rounded-xl bg-white p-4 text-sm text-[#667089]">
          Belum ada laporan terkait akun ini.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {reputationResult.reports.map((report) => (
            <article
              key={report.id}
              className="rounded-xl border border-[#e3e7f0] bg-white p-4"
            >
              <h5 className="text-sm font-bold text-[#162350]">
                {report.judul_laporan}
              </h5>

              <p className="mt-2 text-xs text-[#667089]">
                Status: {report.status_laporan}
              </p>

              <p className="mt-1 text-xs text-[#8992a7]">
                {new Date(report.tanggal_dibuat).toLocaleDateString(
                  "id-ID",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  </div>
)}
</div></section>

        {/* BUYER ACTION CARDS */}
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* REPORT CARD */}
          <article className="group relative overflow-hidden rounded-[22px] border border-[#e4e9f3] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#162350]/5 sm:p-6">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#eef2ff] transition group-hover:scale-110" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f6bd8]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path d="M4 4h16v13H4z" />
                    <path d="M8 8h8M8 11h5M9 17l3 3 3-3" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-extrabold text-[#162350]">
                  Mengalami masalah transaksi?
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#7b879d]">
                  Laporkan pengalamanmu agar komunitas lebih waspada dan membantu pengguna lain.
                </p>
              </div>

              <Link
                href="/buyer/lapor"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e3e7f0] bg-white px-4 py-3 text-sm font-bold text-[#263861] transition hover:border-[#4f6bd8]/40 hover:bg-[#f5f7ff] hover:text-[#4f6bd8]"
              >
                Buat Laporan
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            </div>
          </article>

          {/* REPORT HISTORY CARD */}
          <article className="group relative overflow-hidden rounded-[22px] bg-linear-to-br from-[#162350] to-[#2d427f] p-5 text-white shadow-md shadow-[#162350]/10 transition hover:-translate-y-1 hover:shadow-lg sm:p-6">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-[#4f6bd8]/20 blur-2xl" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#c1ceff]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path d="M4 5h16v14H4z" />
                    <path d="M8 9h8M8 12h8M8 15h5" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-extrabold text-white">
                  Pantau laporanmu
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/65">
                  Lihat laporan yang kamu buat dan pantau status peninjauannya melalui dashboard TrustX.
                </p>
              </div>

              <Link
                href="/buyer/laporan"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] px-5 py-3 text-sm font-bold text-[#162350] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4f6bd8] hover:bg-[#b8c9ff] hover:shadow-lg active:translate-y-0"
              >
                Lihat Laporan
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            </div>
          </article>
        </section>

        {/* CHECK HISTORY */}
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#162350]">
                Riwayat Pengecekan
              </h2>
              <p className="mt-1 text-sm text-[#8a95a9]">
                Pantau pencarian reputasi akun yang terakhir kamu lakukan.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dce3f4] bg-[#f0f4ff] px-3 py-1.5 text-xs font-bold text-[#405ec7]">
              {checks.length} Riwayat
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-[22px] border border-[#e4e9f3] bg-white shadow-sm">
            {checks.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-12 text-center sm:py-14">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f6bd8]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold text-[#263657]">
                  Belum ada riwayat pengecekan
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#8a95a9]">
                  Pencarian reputasi yang kamu lakukan akan muncul di sini.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#edf0f6]">
                {checks.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#fafbfe] sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
                        {item.search_type === "whatsapp" ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
                            <path d="M20 11.5a8.2 8.2 0 0 1-12.3 7L4 20l1.5-3.7A8.2 8.2 0 1 1 20 11.5Z" />
                            <path d="M8.5 8.5c.5 2.5 2.5 4.5 5 5l1-1.5 2 1c-.5 1.5-1.5 2-2.5 2C10.5 14.5 7.5 11.5 7 9c0-1 .5-2 2-2.5l1 2-1.5 1Z" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-6.3L6.6 22H3.5l7.3-8.4L3 2h6.3l4.3 5.8L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="break-all text-sm font-bold text-[#162350]">
                          {item.search_value}
                        </p>
                        <p className="mt-1 text-xs text-[#8992a7]">
                          {item.search_type === "whatsapp" ? "Nomor WhatsApp" : "Username X"}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-xs text-[#8a95a9]">
                      {new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* REPORT FEED */}
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#162350]">
                Laporan Komunitas
              </h2>
              <p className="mt-1 text-sm text-[#8a95a9]">
                Pantau laporan yang kamu kirimkan ke TrustX.
              </p>
            </div>

            <Link
              href="/buyer/laporan"
              className="inline-flex items-center gap-2 rounded-xl border border-[#e3e7f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#53617d] transition hover:border-[#cbd4ed] hover:bg-[#f5f7ff] hover:text-[#4f6bd8]"
            >
              Semua Laporan
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </Link>
          </div>

          <div className="mt-4 overflow-hidden rounded-[22px] border border-[#e4e9f3] bg-white shadow-sm">
            {reports.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-12 text-center sm:py-14">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f6bd8]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7">
                    <path d="M4 5h16v14H4z" />
                    <path d="M8 9h8M8 12h8M8 15h5" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold text-[#263657]">
                  Belum ada laporan
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#8a95a9]">
                  Laporan yang kamu buat akan ditampilkan di bagian ini.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#edf0f6]">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="px-5 py-4 transition hover:bg-[#fafbfe] sm:px-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="wrap-break-word text-sm font-bold text-[#162350]">
                          {report.title}
                        </h3>
                        <p className="mt-1 text-xs text-[#8992a7]">
                          {new Date(report.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                          report.status.toLowerCase() === "selesai"
                            ? "bg-[#eaf8ef] text-[#328454]"
                            : report.status.toLowerCase() === "ditolak"
                              ? "bg-[#fff0f0] text-[#c24141]"
                              : report.status.toLowerCase() === "ditinjau"
                                ? "bg-[#eef2ff] text-[#405ec7]"
                                : "bg-[#fff7e8] text-[#b7791f]"
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* DISCLAIMER */}
        <p className="mt-8 text-center text-xs leading-relaxed text-[#8a95a9]">
          Informasi laporan komunitas merupakan bahan pertimbangan dan bukan jaminan keamanan transaksi.
        </p>

        {/* FOOTER */}
        <footer className="mt-10 border-t border-[#e3e7f0] pt-6">
          <p className="text-center text-xs text-[#98a1b4]">
            © 2026 TrustX. Cek Dulu Sebelum Transaksi.
          </p>
        </footer>

        {/* MOBILE NAV */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 border-t border-[#e3e7f0] bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-lg md:hidden">
          <Link
            href="/buyer"
            className="flex flex-col items-center gap-1 py-2 text-[#8a94a8]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m3 10 9-7 9 7" />
              <path d="M5 9v11h14V9M9 20v-6h6v6" />
            </svg>
            <span className="text-[10px] font-semibold">Beranda</span>
          </Link>

          <Link
            href="/buyer/laporan"
            className="flex flex-col items-center gap-1 py-2 text-[#4f6bd8]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M8 13h8M8 17h5" />
            </svg>
            <span className="text-[10px] font-bold">Laporan</span>
          </Link>

          <Link
            href="/buyer/profil"
            className="flex flex-col items-center gap-1 py-2 text-[#8a94a8]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M5 21a7 7 0 0 1 14 0" />
            </svg>
            <span className="text-[10px] font-semibold">Profil</span>
          </Link>
        </nav>
      </div>
    </main>
  );
}