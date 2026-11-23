"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type StatusLaporan = "menunggu" | "ditinjau" | "selesai" | "ditolak";
type FilterLaporan = "all" | "response" | "review" | "done";

type Laporan = {
  id: string;
  pembeli_id: string;
  penjual_id: string;
  judul_laporan: string;
  kronologi: string;
  status_laporan: StatusLaporan;
  tanggal_dibuat: string;
  tanggal_diperbarui: string | null;
  sanggahan?: {
    id: string;
    status_sanggahan: string;
  }[];
};

const STATUS_LABEL: Record<StatusLaporan, string> = {
  menunggu: "Perlu Tanggapan",
  ditinjau: "Sedang Ditinjau",
  selesai: "Selesai Ditinjau",
  ditolak: "Ditolak",
};

function formatTanggal(value: string) {
  if (!value) return "-";
  const tanggal = new Date(value);
  if (Number.isNaN(tanggal.getTime())) return "-";

  return tanggal.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusStyle(status: StatusLaporan) {
  switch (status) {
    case "menunggu":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "ditinjau":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "selesai":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ditolak":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

function StatusBadge({ status }: { status: StatusLaporan }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${statusStyle(status)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: string;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-[#e6eaf2] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#78849b]">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#162350]">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${color}`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-[#929cb0]">{description}</p>
    </article>
  );
}

export default function LaporanSellerPage() {
  const router = useRouter();

  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [namaPemilik, setNamaPemilik] = useState("");
  const [filter, setFilter] = useState<FilterLaporan>("all");
  const [selected, setSelected] = useState<Laporan | null>(null);

  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // LOAD REPORTS
  const loadLaporan = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      const user = userData.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const userId = user.id;

      const { data: profil, error: profilError } = await supabase
        .from("profil_pengguna")
        .select("nama_lengkap, jenis_akun")
        .eq("id", userId)
        .maybeSingle();

      if (profilError) throw profilError;

      if (!profil || profil.jenis_akun !== "seller") {
        router.replace("/login");
        return;
      }

      const { data: profilToko, error: tokoError } = await supabase
        .from("profil_toko")
      .select("nama_lengkap, nama_toko")
      .eq("id", userId)
      .maybeSingle();

      if (tokoError) {
        console.error("Gagal mengambil profil toko:", tokoError);
      }

      const nama =
        profil.nama_lengkap?.trim() ||
        profilToko?.nama_lengkap?.trim() ||
        profilToko?.nama_toko?.trim() ||
        "Seller";

      setNamaPemilik(nama);

      const { data, error: laporanError } = await supabase
        .from("laporan")
        .select(
          "id, pembeli_id, penjual_id, judul_laporan, kronologi, status_laporan, tanggal_dibuat, tanggal_diperbarui"
        )
        .eq("penjual_id", userId)
        .order("tanggal_dibuat", { ascending: false });

      if (laporanError) throw laporanError;

      setLaporan((data ?? []) as Laporan[]);
    } catch (err) {
      console.error("Gagal memuat laporan seller:", err);
      setLaporan([]);
      setError("Laporan gagal dimuat. Periksa koneksi atau izin akses database.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLaporan(), 0);
    return () => window.clearTimeout(timer);
  }, [loadLaporan, reloadKey]);

  function retryLoad() {
    setError("");
    setReloadKey((prev) => prev + 1);
  }

  // LOGOUT
  async function handleLogout() {
    if (logoutLoading) return;

    setLogoutLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: logoutError } = await supabase.auth.signOut();

      if (logoutError) {
        console.error("Logout gagal:", logoutError);
        setError("Gagal keluar dari akun. Silakan coba kembali.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      setError("Terjadi kesalahan saat keluar dari akun.");
    } finally {
      setLogoutLoading(false);
    }
  }

  // STATISTICS
  const statistik = useMemo(
    () => ({
      total: laporan.length,
      response: laporan.filter((item) => item.status_laporan === "menunggu").length,
      review: laporan.filter((item) => item.status_laporan === "ditinjau").length,
      done: laporan.filter(
        (item) =>
          item.status_laporan === "selesai" ||
          item.status_laporan === "ditolak"
      ).length,
    rejected: laporan.filter((item) => item.status_laporan === "ditolak").length,
  }),
  [laporan]
  );

  // FILTER REPORTS
  const filteredReports = useMemo(() => {
    switch (filter) {
      case "response":
        return laporan.filter((item) => item.status_laporan === "menunggu");
      case "review":
        return laporan.filter((item) => item.status_laporan === "ditinjau");
      case "done":
        return laporan.filter(
          (item) =>
            item.status_laporan === "selesai" ||
            item.status_laporan === "ditolak"
        );
      default:
        return laporan;
    }
  }, [laporan, filter]);

  const filters: { id: FilterLaporan; label: string; count?: number }[] = [
    { id: "all", label: "Semua", count: statistik.total },
    { id: "response", label: "Perlu Tanggapan", count: statistik.response },
    { id: "review", label: "Ditinjau", count: statistik.review },
    { id: "done", label: "Selesai", count: statistik.done },
  ];

  const initialProfil = namaPemilik.trim().charAt(0).toUpperCase() || "S";

  // MODAL ESCAPE
  useEffect(() => {
    if (!selected) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selected]);

  return (
    <main className="min-h-screen bg-[#f5f7fc] pb-24 text-[#172033] md:pb-10">
      {/* HEADER */}
      {/* HEADER */}
      {/* DESKTOP NAV */}
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
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/seller"
              className="inline-flex items-center gap-2 rounded-xl bg-[#eef2ff] px-4 py-2.5 text-sm font-bold text-[#4f6bd8]"
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
              href="/seller/laporan"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#647089] transition hover:bg-[#f1f4fa] hover:text-[#162350]"
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
              href="/seller/profil"
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
              href="/seller/profil"
              aria-label="Profil penjual"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-[#cbcfdf] to-[#758ad5] text-sm font-extrabold uppercase text-white shadow-md ring-2 ring-white"
            >
              {initialProfil.slice(0, 1) || "S"}
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

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-9 lg:px-8">
        {/* PAGE INTRO */}
        <section className="mb-7 overflow-hidden rounded-3xl bg-linear-to-br from-[#162350] via-[#22346b] to-[#4f6bd8] p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.15em] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-[#91aaff]" />
                PUSAT LAPORAN TRUSTX
              </span>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Laporan Terkait Toko
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                Pantau laporan komunitas, pelajari hasil peninjauan, dan sampaikan
                klarifikasi dengan bukti yang relevan.
              </p>
            </div>
            <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-5xl sm:flex">
              ▤
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && !loading && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-bold text-red-700">Terjadi masalah</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
            <button
              type="button"
              onClick={retryLoad}
              className="shrink-0 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* STATS */}
        <section
          className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4"
          aria-label="Ringkasan laporan"
        >
          <StatCard
            label="Total Laporan"
            value={loading ? "—" : statistik.total}
            description="Semua laporan toko"
            icon="▤"
            color="bg-[#eef2ff] text-[#4f6bd8]"
          />
          <StatCard
            label="Perlu Tanggapan"
            value={loading ? "—" : statistik.response}
            description="Perlu ditindaklanjuti"
            icon="◷"
            color="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Sedang Ditinjau"
            value={loading ? "—" : statistik.review}
            description="Dalam pemeriksaan"
            icon="⌕"
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Selesai Ditinjau"
            value={loading ? "—" : statistik.done}
            description="Hasil sudah tersedia"
            icon="✓"
            color="bg-emerald-50 text-emerald-600"
          />
        </section>

        {/* REPORT SECTION */}
        <section className="overflow-hidden rounded-3xl border border-[#e3e7f0] bg-white shadow-sm">
          <div className="border-b border-[#edf0f6] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#162350]">
                  Daftar Laporan
                </h2>
                <p className="mt-1 text-sm text-[#8792a8]">
                  Pilih laporan untuk membaca detail atau mengajukan sanggahan.
                </p>
              </div>
              <span className="rounded-full bg-[#f1f4fa] px-3 py-1.5 text-xs font-bold text-[#647089]">
                {loading ? "Memuat..." : `${filteredReports.length} laporan`}
              </span>
            </div>

            {/* FILTERS */}
            <div
              className="mt-5 flex gap-2 overflow-x-auto pb-1"
              role="group"
              aria-label="Filter status laporan"
            >
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={filter === item.id}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                    filter === item.id
                      ? "border-[#162350] bg-[#162350] text-white shadow-sm"
                      : "border-[#e5eaf2] bg-white text-[#68758d] hover:border-[#cbd5ee] hover:bg-[#f8faff]"
                  }`}
                >
                  {item.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      filter === item.id
                        ? "bg-white/15 text-white"
                        : "bg-[#f1f4fa] text-[#7e8aa2]"
                    }`}
                  >
                    {loading ? "—" : item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* LOADING */}
            {loading && (
              <div className="space-y-3 py-5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl border border-[#edf0f6] p-5"
                  >
                    <div className="h-3 w-24 rounded bg-gray-100" />
                    <div className="mt-4 h-4 w-2/3 rounded bg-gray-100" />
                    <div className="mt-3 h-3 w-full rounded bg-gray-100" />
                    <div className="mt-2 h-3 w-4/5 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            )}

            {/* EMPTY */}
            {!loading && !error && filteredReports.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#dfe5ef] bg-[#fafbfe] px-5 py-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef2ff] text-2xl text-[#4f6bd8]">
                  ⌕
                </div>
                <h3 className="mt-4 text-base font-extrabold text-[#162350]">
                  {filter === "all"
                    ? "Belum Ada Laporan"
                    : "Laporan Tidak Ditemukan"}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8792a8]">
                  Belum ada laporan toko pada kategori ini atau filter tidak cocok.
                </p>
                {filter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="mt-4 rounded-xl border border-[#dfe5ef] bg-white px-4 py-2.5 text-sm font-bold text-[#4f6bd8] hover:bg-[#f5f7ff]"
                  >
                    Tampilkan Semua Laporan
                  </button>
                )}
              </div>
            )}

            {/* REPORT CARDS */}
            {!loading && !error && filteredReports.length > 0 && (
              <div className="space-y-4">
                {filteredReports.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[#e7ebf3] bg-white p-4 transition hover:border-[#cdd7f5] hover:shadow-sm sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold tracking-widest text-[#99a3b6]">
                          LP-{item.id.slice(0, 8).toUpperCase()}
                        </span>
                        <h3 className="mt-1.5 wrap-break-word text-base font-extrabold text-[#162350]">
                          {item.judul_laporan || "Laporan transaksi"}
                        </h3>
                        <p className="mt-2 text-xs text-[#8792a8]">
                          Dilaporkan pada {formatTanggal(item.tanggal_dibuat)}
                        </p>
                      </div>
                      <StatusBadge status={item.status_laporan} />
                    </div>

                    <div className="mt-4 rounded-xl bg-[#f8faff] p-3.5">
                      <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[#647089]">
                        {item.kronologi || "Tidak ada kronologi yang tersedia."}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="inline-flex items-center justify-center rounded-xl border border-[#e2e7f0] bg-white px-4 py-2.5 text-sm font-bold text-[#43516f] transition hover:bg-[#f5f7fc]"
                      >
                        Detail Laporan
                      </button>

                        {/* AJUKAN SANGGAHAN */}
{item.status_laporan === "menunggu" && (
  <button
    type="button"
    disabled
    className="cursor-not-allowed rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-400"
  >
    Menunggu Verifikasi Tim
  </button>
)}

{item.status_laporan === "ditinjau" && (
  <Link
    href={`/seller/sanggahan?laporan=${item.id}`}
    className="inline-flex items-center justify-center rounded-xl bg-[#d4daf0] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#aebbed]"
  >
    Ajukan Sanggahan
  </Link>
)}

{/* STATUS PEMERIKSAAN */}
{item.status_laporan === "ditinjau" && (
  <span className="inline-flex items-center rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700">
    Sedang dalam pemeriksaan
  </span>
)}

{/* LIHAT HASIL — hanya jika sudah ada sanggahan */}
{(item.status_laporan === "selesai" ||
  item.status_laporan === "ditolak") &&
  item.sanggahan &&
  item.sanggahan.length > 0 && (
    <Link
      href={`/seller/hasil-peninjauan?laporan=${item.id}`}
      className="inline-flex items-center justify-center rounded-xl bg-[#eef2ff] px-4 py-2.5 text-sm font-bold text-[#405ec7] transition hover:bg-[#e2e9ff]"
    >
      Lihat Hasil
    </Link>
  )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* NOTICE */}
        <aside className="mt-6 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 p-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#4f6bd8]">
            <span className="text-xl">ⓘ</span>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#162350]">
              Hak Klarifikasi Penjual
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#647089]">
              Sampaikan kronologi yang jelas dan bukti yang relevan. Hindari
              mengunggah data pribadi yang tidak diperlukan.
            </p>
          </div>
        </aside>

        {/* FOOTER */}
        <footer className="mt-8 border-t border-[#e3e7f0] pt-6">
          <p className="text-center text-xs text-[#98a1b4]">
            © 2026 TrustX. Cek Dulu Sebelum Transaksi.
          </p>
        </footer>
      </div>

      {/* DETAIL MODAL - OUTSIDE MAIN CONTENT CARD */}
      {selected && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-[#101a36]/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalDetailTitle"
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/30 bg-white p-5 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Tutup detail"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1f4fa] text-xl text-[#647089] transition hover:bg-[#e5eaf2]"
            >
              ×
            </button>

            <span className="text-[10px] font-extrabold tracking-[0.12em] text-[#8994a9]">
              LP-{selected.id.slice(0, 8).toUpperCase()}
            </span>

            <h2
              id="modalDetailTitle"
              className="mt-2 pr-10 text-xl font-extrabold leading-snug text-[#162350]"
            >
              {selected.judul_laporan || "Detail Laporan Akun"}
            </h2>

            <div className="mt-4">
              <StatusBadge status={selected.status_laporan} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f5f7fc] p-4">
                <span className="text-xs font-semibold text-[#8792a8]">
                  ID Laporan
                </span>
                <p className="mt-1 break-all text-sm font-bold text-[#162350]">
                  {selected.id}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f5f7fc] p-4">
                <span className="text-xs font-semibold text-[#8792a8]">
                  Tanggal Laporan
                </span>
                <p className="mt-1 text-sm font-bold text-[#162350]">
                  {formatTanggal(selected.tanggal_dibuat)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#e6eaf2] p-4">
              <h3 className="text-sm font-extrabold text-[#162350]">
                Kronologi Laporan
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#647089]">
                {selected.kronologi || "Tidak ada kronologi tersedia."}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {selected.status_laporan === "menunggu" && (
                <Link
                  href={`/seller/sanggahan?laporan=${selected.id}`}
                  className="flex flex-1 items-center justify-center rounded-xl bg-[#162350] px-4 py-3 text-sm font-bold text-white hover:bg-[#2a3c75]"
                >
                  Ajukan Sanggahan
                </Link>
              )}

              {(selected.status_laporan === "selesai" ||
                selected.status_laporan === "ditolak") && (
                <Link
                  href={`/seller/hasil-peninjauan?laporan=${selected.id}`}
                  className="flex flex-1 items-center justify-center rounded-xl bg-[#eef2ff] px-4 py-3 text-sm font-bold text-[#405ec7] hover:bg-[#e2e9ff]"
                >
                  Lihat Hasil Peninjauan
                </Link>
              )}

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex flex-1 items-center justify-center rounded-xl border border-[#e3e7f0] bg-white px-4 py-3 text-sm font-bold text-[#53617d] transition hover:bg-[#f5f7fc]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 border-t border-[#e3e7f0] bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-lg md:hidden">
        <Link
          href="/seller"
          className="flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-[#667089] transition hover:bg-[#f4f6fa]"
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
          href="/seller/laporan"
          className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#eef2ff] px-3 py-2 text-xs font-bold text-[#4f6bd8]"
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
          href="/seller/profil"
          className="flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-[#667089] transition hover:bg-[#f4f6fa]"
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
    </main>
  );
}