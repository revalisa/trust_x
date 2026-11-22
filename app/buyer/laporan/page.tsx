
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StatusLaporan = "menunggu" | "ditinjau" | "selesai" | "ditolak";

type Laporan = {
  id: string;
  pembeli_id: string;
  penjual_id: string;
  judul_laporan: string;
  kronologi: string;
  status_laporan: string;
  tanggal_dibuat: string;
  tanggal_diperbarui: string | null;
};

type BuktiLaporan = {
  id: string;
  laporan_id: string;
  file_name: string | null;
  file_path: string | null;
  tanggal_dibuat: string;
  signed_url: string | null;
};

type FilterLaporan = "all" | "menunggu" | "ditinjau" | "selesai";

const statusConfig: Record<
  StatusLaporan,
  { label: string; color: string; bg: string; dot: string }
> = {
  menunggu: {
    label: "Menunggu",
    color: "#b45309",
    bg: "#fef3c7",
    dot: "#f59e0b",
  },
  ditinjau: {
    label: "Sedang Ditinjau",
    color: "#1d4ed8",
    bg: "#dbeafe",
    dot: "#3b82f6",
  },
  selesai: {
    label: "Selesai Ditinjau",
    color: "#15803d",
    bg: "#dcfce7",
    dot: "#22c55e",
  },
  ditolak: {
    label: "Ditolak",
    color: "#b91c1c",
    bg: "#fee2e2",
    dot: "#ef4444",
  },
};

function getStatus(status: string): StatusLaporan {
  const normalized = status.toLowerCase().trim();

  if (normalized === "ditinjau") return "ditinjau";
  if (normalized === "selesai") return "selesai";
  if (normalized === "ditolak") return "ditolak";

  return "menunggu";
}

function formatTanggal(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function shortId(id: string) {
  return id ? id.slice(0, 8).toUpperCase() : "-";
}

export default function BuyerLaporanPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buktiMap, setBuktiMap] = useState<Record<string, BuktiLaporan[]>>({});
  const [loadingBukti, setLoadingBukti] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterLaporan>("all");
  const [selectedReport, setSelectedReport] = useState<Laporan | null>(null);
  const [nama, setNama] = useState("");

  const loadLaporan = useCallback(async () => {
  setLoading(true);
  setError("");
  setBuktiMap({});

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profil_pengguna")
      .select("nama_lengkap, jenis_akun")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profile?.jenis_akun !== "buyer") {
      router.replace(
        profile?.jenis_akun === "seller" ? "/seller" : "/login"
      );
      return;
    }

    setNama(profile?.nama_lengkap || "Pembeli");

    // 1. Ambil seluruh laporan komunitas
    const { data: dataLaporan, error: laporanError } = await supabase
      .from("laporan")
      .select(
        "id, pembeli_id, penjual_id, judul_laporan, kronologi, status_laporan, tanggal_dibuat, tanggal_diperbarui"
      )
      .order("tanggal_dibuat", { ascending: false });

    if (laporanError) throw laporanError;

    const daftarLaporan = (dataLaporan || []) as Laporan[];

    setLaporan(daftarLaporan);

    // Jika belum ada laporan, tidak perlu mengambil bukti
    if (daftarLaporan.length === 0) {
      setBuktiMap({});
      return;
    }

    setLoadingBukti(true);

    // 2. Ambil bukti berdasarkan ID laporan
    const laporanIds = daftarLaporan.map((item) => item.id);

    const { data: dataBukti, error: buktiError } = await supabase
      .from("bukti_laporan")
      .select("id, laporan_id, file_name, file_path, tanggal_dibuat")
      .in("laporan_id", laporanIds)
      .order("tanggal_dibuat", { ascending: false });

    if (buktiError) {
      console.error("GAGAL MENGAMBIL METADATA BUKTI:", buktiError);
      // Laporan tetap ditampilkan meskipun bukti gagal diambil.
      setBuktiMap({});
      return;
    }

    const daftarBukti = dataBukti || [];

    // 3. Buat signed URL dari private bucket
    const buktiDenganUrl = await Promise.all(
      daftarBukti.map(async (bukti) => {
        if (!bukti.file_path) {
          return {
            ...bukti,
            signed_url: null,
          } as BuktiLaporan;
        }

        const { data: signedData, error: signedError } =
          await supabase.storage
            .from("bukti-laporan")
            .createSignedUrl(bukti.file_path, 3600);

        if (signedError) {
          console.error(
            `GAGAL MEMBUAT SIGNED URL ${bukti.file_name}:`,
            signedError
          );
        }

        return {
          ...bukti,
          signed_url: signedData?.signedUrl || null,
        } as BuktiLaporan;
      })
    );

    // 4. Kelompokkan bukti berdasarkan laporan_id
    const grouped: Record<string, BuktiLaporan[]> = {};

    for (const bukti of buktiDenganUrl) {
      if (!grouped[bukti.laporan_id]) {
        grouped[bukti.laporan_id] = [];
      }

      grouped[bukti.laporan_id].push(bukti);
    }

    setBuktiMap(grouped);
  } catch (err) {
    console.error("GAGAL MENGAMBIL LAPORAN:", err);
    setError("Data laporan gagal dimuat. Silakan coba kembali.");
  } finally {
    setLoadingBukti(false);
    setLoading(false);
  }
}, [supabase, router]);

  useEffect(() => {
  let cancelled = false;

  const initialize = async () => {
    await Promise.resolve();

    if (!cancelled) {
      await loadLaporan();
    }
  };

  initialize();

  return () => {
    cancelled = true;
  };
}, [loadLaporan]);

  const stats = useMemo(() => {
    return {
      total: laporan.length,
      menunggu: laporan.filter(
        (item) => getStatus(item.status_laporan) === "menunggu"
      ).length,
      ditinjau: laporan.filter(
        (item) => getStatus(item.status_laporan) === "ditinjau"
      ).length,
      selesai: laporan.filter((item) =>
        ["selesai", "ditolak"].includes(getStatus(item.status_laporan))
      ).length,
    };
  }, [laporan]);

  const filteredLaporan = useMemo(() => {
    if (filter === "all") return laporan;

    if (filter === "selesai") {
      return laporan.filter((item) =>
        ["selesai", "ditolak"].includes(getStatus(item.status_laporan))
      );
    }

    return laporan.filter(
      (item) => getStatus(item.status_laporan) === filter
    );
  }, [laporan, filter]);

  const filters: { id: FilterLaporan; label: string; count: number }[] = [
    { id: "all", label: "Semua", count: stats.total },
    { id: "menunggu", label: "Menunggu", count: stats.menunggu },
    { id: "ditinjau", label: "Ditinjau", count: stats.ditinjau },
    { id: "selesai", label: "Selesai", count: stats.selesai },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/"
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] pb-24 text-[#172033] md:pb-8">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#e3e7f0] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-19 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/buyer" className="flex shrink-0 items-center gap-3">
            <Image
              src="/assets/images/logo-trustx.svg"
              alt="Logo TrustX"
              width={42}
              height={42}
              className="h-10.5 w-10.5"
            />
            <div className="leading-tight">
              <p className="text-lg font-extrabold tracking-tight text-[#162350]">
                TrustX
              </p>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-[#64708a]">
                BUYER WORKSPACE
              </p>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/buyer"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#647089] transition hover:bg-[#f1f4fa] hover:text-[#162350]"
            >
              <svg
                className="h-4.5 w-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m3 10 9-7 9 7" />
                <path d="M5 9v11h14V9M9 20v-6h6v6" />
              </svg>
              Beranda
            </Link>

            <Link
              href="/buyer/laporan"
              className="inline-flex items-center gap-2 rounded-xl bg-[#eef2ff] px-4 py-2.5 text-sm font-bold text-[#4f6bd8]"
            >
              <svg
                className="h-4.5 w-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M8 13h8M8 17h6" />
              </svg>
              Laporan
            </Link>

            <Link
              href="/buyer/profil"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#647089] transition hover:bg-[#f1f4fa] hover:text-[#162350]"
            >
              <svg
                className="h-4.5 w-4.5"   
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
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
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </button>

            <Link
              href="/buyer/profil"
              aria-label="Profil pembeli"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-[#cbcfdf] to-[#758ad5] text-sm font-extrabold uppercase text-white shadow-md ring-2 ring-white"
            >
              {nama.slice(0, 1) || "B"}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-lg px-3 py-2 text-xs font-bold text-[#647089] transition hover:bg-red-50 hover:text-red-600 sm:block"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-7xl px-4 pt-7 sm:px-6 sm:pt-10 lg:px-8">
        {/* INTRO */}
        <section className="mb-7">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e9edff] px-3 py-1.5 text-[10px] font-extrabold tracking-[0.12em] text-[#4f6bd8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4f6bd8]" />
            PUSAT INFORMASI KOMUNITAS
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-[#162350] sm:text-3xl lg:text-[34px]">
            Pusat Laporan Komunitas
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667089] sm:text-base">
            Pantau laporan dugaan penipuan serta informasi yang dibagikan
            pengguna untuk membantu melindungi komunitas sebelum bertransaksi.
          </p>
        </section>

        {/* STAT CARDS */}
        <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* TOTAL */}
          <div className="rounded-2xl border border-[#e3e7f0] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#667089]">
                Total Laporan
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
                <svg
                  className="h-4.5 w-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M8 13h8M8 17h5" />
                </svg>
              </span>
            </div>
            <strong className="text-2xl font-extrabold text-[#162350]">
              {loading ? "—" : stats.total}
            </strong>
            <p className="mt-1 text-[11px] text-[#8a94a8]">
              Semua laporan komunitas
            </p>
          </div>

          {/* WAITING */}
          <div className="rounded-2xl border border-[#e3e7f0] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#667089]">
                Menunggu
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff7e6] text-[#d97706]">
                <svg
                  className="h-4.5 w-4.5 "
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
            </div>
            <strong className="text-2xl font-extrabold text-[#b45309]">
              {loading ? "—" : stats.menunggu}
            </strong>
            <p className="mt-1 text-[11px] text-[#8a94a8]">
              Belum ditinjau
            </p>
          </div>

          {/* REVIEW */}
          <div className="rounded-2xl border border-[#e3e7f0] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#667089]">
                Sedang Ditinjau
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#2563eb]">
                <svg
                  className="h-4.5 w-4.5 "
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4M8 11h6" />
                </svg>
              </span>
            </div>
            <strong className="text-2xl font-extrabold text-[#2563eb]">
              {loading ? "—" : stats.ditinjau}
            </strong>
            <p className="mt-1 text-[11px] text-[#8a94a8]">
              Dalam proses pemeriksaan
            </p>
          </div>

          {/* DONE */}
          <div className="rounded-2xl border border-[#e3e7f0] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#667089]">
                Selesai Ditinjau
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f8ee] text-[#16a34a]">
                <svg
                  className="h-4.5 w-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </span>
            </div>
            <strong className="text-2xl font-extrabold text-[#16a34a]">
              {loading ? "—" : stats.selesai}
            </strong>
            <p className="mt-1 text-[11px] text-[#8a94a8]">
              Laporan telah diproses
            </p>
          </div>
        </section>

        {/* REPORT PANEL */}
        <section className="overflow-hidden rounded-2xl border border-[#e3e7f0] bg-white shadow-sm">
          {/* PANEL HEADER */}
          <div className="flex flex-col gap-4 border-b border-[#edf0f6] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-extrabold text-[#162350] sm:text-xl">
                Daftar Laporan
              </h2>
              <p className="mt-1 text-xs text-[#667089] sm:text-sm">
                Tinjau informasi laporan komunitas sebelum melakukan transaksi.
              </p>
            </div>

            <Link
              href="/buyer/lapor"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-[#afbef4] px-5 py-3  shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#708ee8] hover:shadow-md active:translate-y-0"
            >
              <span className="text-lg leading-none">+</span>
              Buat Laporan
            </Link>
          </div>

          {/* FILTER */}
          <div className="flex gap-2 overflow-x-auto border-b border-[#edf0f6] px-4 py-3 sm:px-6">
            {filters.map((item) => {
              const active = filter === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={active}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition sm:px-4 ${
                    active
                      ? "bg-[#162350] text-white shadow-sm"
                      : "bg-[#f4f6fa] text-[#647089] hover:bg-[#e9edf5] hover:text-[#162350]"
                  }`}
                >
                  {item.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      active
                        ? "bg-white/15 text-white"
                        : "bg-white text-[#667089]"
                    }`}
                  >
                    {loading ? "—" : item.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* REPORT LIST */}
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-2xl border border-[#e8ecf3] p-5"
                  >
                    <div className="mb-4 flex gap-3">
                      <div className="h-6 w-24 rounded-full bg-[#e8ecf3]" />
                      <div className="h-6 w-20 rounded-lg bg-[#e8ecf3]" />
                    </div>
                    <div className="mb-3 h-5 w-2/3 rounded bg-[#e8ecf3]" />
                    <div className="mb-2 h-3 w-full rounded bg-[#e8ecf3]" />
                    <div className="h-3 w-4/5 rounded bg-[#e8ecf3]" />
                  </div>
                ))}
              </div>
            ) : error ? (
              /* ERROR */
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <svg
                    className="h-7 w-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M12 9v4m0 4h.01" />
                    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-extrabold text-[#162350]">
                  Gagal Memuat Data Laporan
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667089]">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={loadLaporan}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#162350] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#263b78]"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 7v5h-5M4 17v-5h5" />
                    <path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2" />
                  </svg>
                  Coba Lagi
                </button>
              </div>
            ) : filteredLaporan.length === 0 ? (
              /* EMPTY STATE */
              <div className="py-12 text-center sm:py-16">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f6bd8]">
                  <svg
                    className="h-8 w-8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <h3 className="text-base font-extrabold text-[#162350]">
                  Tidak Ada Laporan Ditemukan
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667089]">
                  Belum ada laporan pada kategori ini atau filter yang dipilih
                  tidak memiliki hasil.
                </p>
                {filter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-bold text-[#162350] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4f6bd8] hover:bg-[#eef2ff] hover:shadow-lg active:translate-y-0"
                  >
                    Reset Filter (Tampilkan Semua)
                  </button>
                )}
              </div>
            ) : (
              /* CARDS */
              <div className="space-y-4">
                {filteredLaporan.map((item) => {
                  const status = getStatus(item.status_laporan);
                  const config = statusConfig[status];

                  return (
                    <article
                      key={item.id}
                      className="group rounded-2xl border border-[#e3e7f0] bg-white p-4 transition-all duration-200 hover:border-[#cbd5e1] hover:shadow-md sm:p-5"
                    >
                      {/* CARD TOP */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
                          style={{
                            color: config.color,
                            backgroundColor: config.bg,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: config.dot }}
                          />
                          {config.label}
                        </span>

                        <span className="rounded-lg bg-[#f4f6fa] px-2.5 py-1.5 text-[10px] font-bold text-[#667089]">
                          LP-{shortId(item.id)}
                        </span>
                      </div>

                      {/* TITLE */}
                      <h3 className="mt-4 text-base font-extrabold leading-snug text-[#162350] sm:text-lg">
                        {item.judul_laporan || "Laporan Komunitas"}
                      </h3>

                      {/* META */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#8a94a8]">
                        <span className="inline-flex items-center gap-1.5">
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                          </svg>
                          {formatTanggal(item.tanggal_dibuat)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <circle cx="12" cy="8" r="4" />
                            <path d="M5 21a7 7 0 0 1 14 0" />
                          </svg>
                          ID akun dilaporkan: {shortId(item.penjual_id)}
                        </span>
                      </div>

                      {/* DESCRIPTION */}
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#667089]">
                        {item.kronologi || "Tidak ada kronologi yang tersedia."}
                      </p>

                      {/* CARD BOTTOM */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f6] pt-4">
                        <span className="text-[11px] font-medium text-[#8a94a8]">
                          Informasi laporan komunitas
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedReport(item)}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-bold text-[#162350] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4f6bd8] hover:bg-[#eef2ff] hover:shadow-lg active:translate-y-0"
                        >
                          Lihat Detail
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* NOTICE */}
        <aside className="mt-6 flex gap-3 rounded-2xl border border-[#dce5fa] bg-[#edf3ff] p-4 sm:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#4f6bd8] shadow-sm">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M12 3 3 7v5c0 5 4 8 9 9 5-1 9-4 9-9V7z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-[#162350]">
              Gunakan Informasi Secara Bijak
            </h3>
            <p className="mt-1 text-xs leading-6 text-[#526484] sm:text-sm">
              Laporan komunitas merupakan bahan pertimbangan dan peringatan dini,
              bukan keputusan mutlak. Tetap verifikasi identitas akun dan gunakan
              rekening bersama (rekber) resmi sebelum bertransaksi.
            </p>
          </div>
        </aside>

        {/* FOOTER */}
        <footer className="mt-8 border-t border-[#e3e7f0] py-6 text-center text-[11px] text-[#8a94a8]">
          © 2026 TrustX. Cek Dulu Sebelum Transaksi.
        </footer>
      </main>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 border-t border-[#e3e7f0] bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-lg md:hidden">
        <Link
          href="/buyer"
          className="flex flex-col items-center gap-1 py-2 text-[#8a94a8]"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="m3 10 9-7 9 7" />
            <path d="M5 9v11h14V9M9 20v-6h6v6" />
          </svg>
          <span className="text-[10px] font-semibold">Beranda</span>
        </Link>

        <Link
          href="/buyer/laporan"
          className="flex flex-col items-center gap-1 py-2 text-[#4f6bd8]"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M8 13h8M8 17h5" />
          </svg>
          <span className="text-[10px] font-bold">Laporan</span>
        </Link>

        <Link
          href="/buyer/profil"
          className="flex flex-col items-center gap-1 py-2 text-[#8a94a8]"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M5 21a7 7 0 0 1 14 0" />
          </svg>
          <span className="text-[10px] font-semibold">Profil</span>
        </Link>
      </nav>

      {/* DETAIL MODAL */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-[#0b1430]/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedReport(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CLOSE */}
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              aria-label="Tutup detail"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f6fa] text-xl text-[#647089] transition hover:bg-[#e8ecf3] hover:text-[#162350]"
            >
              ×
            </button>

            <span className="inline-flex rounded-lg bg-[#f4f6fa] px-3 py-1.5 text-[10px] font-extrabold text-[#667089]">
              LP-{shortId(selectedReport.id)}
            </span>

            <h2
              id="report-modal-title"
              className="mt-3 pr-10 text-xl font-extrabold text-[#162350] sm:text-2xl"
            >
              {selectedReport.judul_laporan || "Detail Laporan Akun"}
            </h2>

            <span
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
              style={{
                color: statusConfig[getStatus(selectedReport.status_laporan)].color,
                backgroundColor:
                  statusConfig[getStatus(selectedReport.status_laporan)].bg,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor:
                    statusConfig[getStatus(selectedReport.status_laporan)].dot,
                }}
              />
              {statusConfig[getStatus(selectedReport.status_laporan)].label}
            </span>

            {/* INFO GRID */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e3e7f0] bg-[#f8f9fc] p-4">
                <span className="text-[11px] font-semibold text-[#8a94a8]">
                  ID Akun Penjual
                </span>
                <p className="mt-1 break-all text-sm font-bold text-[#162350]">
                  {selectedReport.penjual_id}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e3e7f0] bg-[#f8f9fc] p-4">
                <span className="text-[11px] font-semibold text-[#8a94a8]">
                  Tanggal Laporan
                </span>
                <p className="mt-1 text-sm font-bold text-[#162350]">
                  {formatTanggal(selectedReport.tanggal_dibuat)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e3e7f0] bg-[#f8f9fc] p-4">
                <span className="text-[11px] font-semibold text-[#8a94a8]">
                  Status Laporan
                </span>
                <p className="mt-1 text-sm font-bold text-[#162350]">
                  {statusConfig[getStatus(selectedReport.status_laporan)].label}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e3e7f0] bg-[#f8f9fc] p-4">
                <span className="text-[11px] font-semibold text-[#8a94a8]">
                  Bukti Terlampir
                </span>

                <p className="mt-1 text-sm font-bold text-[#162350]">
                  {loadingBukti
                    ? "Memuat bukti..."
                    : `${(buktiMap[selectedReport.id] || []).length} gambar bukti`}
                </p>
              </div>
            </div>

            {/* EVIDENCE IMAGES */}
<div className="mt-4 rounded-2xl border border-[#e3e7f0] p-4 sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-2">
    <h3 className="text-sm font-extrabold text-[#162350]">
      Bukti Transaksi
    </h3>

    <span className="rounded-lg bg-[#eef2ff] px-2.5 py-1 text-xs font-bold text-[#4f6bd8]">
      {buktiMap[selectedReport.id]?.length || 0} File
    </span>
  </div>

  {loadingBukti ? (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-xl bg-[#e8ecf3]"
        />
      ))}
    </div>
  ) : (buktiMap[selectedReport.id] || []).length > 0 ? (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {buktiMap[selectedReport.id].map((bukti) => (
        <div key={bukti.id} className="min-w-0">
          {bukti.signed_url ? (
            <a
              href={bukti.signed_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka gambar ukuran penuh"
              className="group block overflow-hidden rounded-xl border border-[#e3e7f0] bg-[#f8f9fc]"
            >
              <Image
                  src={bukti.signed_url}
                  alt={bukti.file_name || "Bukti transaksi"}
                  width={600}
                  height={400}
                  unoptimized
                  className="h-36 w-full object-cover transition duration-200 group-hover:scale-105 sm:h-44"
                />
            </a>
          ) : (
            <div className="flex h-36 items-center justify-center rounded-xl border border-red-100 bg-red-50 px-3 text-center text-xs font-semibold text-red-500">
              Gambar gagal dimuat
            </div>
          )}

          <p className="mt-2 truncate text-xs font-bold text-[#162350]">
            {bukti.file_name || "Bukti transaksi"}
          </p>

          <p className="mt-1 text-[10px] text-[#8a94a8]">
            {formatTanggal(bukti.tanggal_dibuat)}
          </p>
        </div>
      ))}
    </div>
  ) : (
    <div className="mt-4 rounded-xl bg-[#f8f9fc] px-4 py-6 text-center">
      <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>

      <p className="text-sm font-bold text-[#162350]">
        Tidak ada bukti terlampir
      </p>

      <p className="mt-1 text-xs leading-5 text-[#667089]">
        Belum ada gambar bukti yang tersimpan pada laporan ini.
      </p>
    </div>
  )}
</div>

            {/* CHRONOLOGY */}
            <div className="mt-4 rounded-2xl border border-[#e3e7f0] p-4 sm:p-5">
              <h3 className="text-sm font-extrabold text-[#162350]">
                Kronologi Transaksi
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#667089]">
                {selectedReport.kronologi || "Tidak ada kronologi tersedia."}
              </p>
            </div>

            {/* MODAL ACTION */}
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#162350] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#263b78]"
            >
              Tutup Detail Laporan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
