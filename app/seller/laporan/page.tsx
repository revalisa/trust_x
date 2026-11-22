
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

function getStatusClass(status: StatusLaporan) {
  switch (status) {
    case "menunggu":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "ditinjau":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "selesai":
      return "border-green-200 bg-green-50 text-green-700";
    case "ditolak":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

export default function LaporanSellerPage() {
  const router = useRouter();

  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [namaPemilik, setNamaPemilik] = useState("");
  const [filter, setFilter] = useState<FilterLaporan>("all");
  const [selected, setSelected] = useState<Laporan | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [loggingOut, setLoggingOut] = useState(false);
  const [pesanLogout, setPesanLogout] = useState("");

  // ==========================================
  // MEMUAT PROFIL DAN LAPORAN SELLER
  // ==========================================
  const loadLaporan = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Cek sesi login
      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const user = userData.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const userId = user.id;

      // ==========================================
      // CEK ROLE PENGGUNA
      // ==========================================
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

      // ==========================================
      // MEMUAT PROFIL TOKO
      // ==========================================
      const { data: profilToko, error: tokoError } = await supabase
        .from("profil_toko")
        .select("nama_lengkap, nama_toko")
        .eq("id", userId)
        .maybeSingle();

      if (tokoError) {
        console.error("Gagal mengambil profil toko:", tokoError);
      }

      const nama =
        profilToko?.nama_toko?.trim() ||
        profilToko?.nama_lengkap?.trim() ||
        profil.nama_lengkap?.trim() ||
        "";

      setNamaPemilik(nama);

      // ==========================================
      // MEMUAT LAPORAN UNTUK SELLER LOGIN
      // ==========================================
      const { data, error: laporanError } = await supabase
        .from("laporan")
        .select(
          "id, pembeli_id, penjual_id, judul_laporan, kronologi, status_laporan, tanggal_dibuat, tanggal_diperbarui"
        )
        .eq("penjual_id", userId)
        .order("tanggal_dibuat", { ascending: false });

      if (laporanError) throw laporanError;

      setLaporan((data ?? []) as Laporan[]);
      setError("");
    } catch (err) {
      console.error("Gagal memuat laporan seller:", err);

      setLaporan([]);
      setError(
        "Laporan gagal dimuat. Periksa koneksi atau izin akses database."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  // ==========================================
  // PEMANGGILAN AWAL DAN RETRY
  // ==========================================
  useEffect(() => {
  const timer = window.setTimeout(() => {
    void loadLaporan();
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [loadLaporan, reloadKey]);

  const retryLoad = () => {
    setError("");
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  // ==========================================
  // LOGOUT
  // ==========================================
  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setPesanLogout("");

    try {
      const supabase = createClient();

      const { error: logoutError } = await supabase.auth.signOut();

      if (logoutError) {
        throw logoutError;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);

      setPesanLogout("Gagal keluar dari akun. Silakan coba lagi.");
      setLoggingOut(false);
    }
  };

  // ==========================================
  // STATISTIK LAPORAN
  // ==========================================
  const statistik = useMemo(() => {
    return {
      total: laporan.length,

      response: laporan.filter(
        (item) => item.status_laporan === "menunggu"
      ).length,

      review: laporan.filter(
        (item) => item.status_laporan === "ditinjau"
      ).length,

      done: laporan.filter(
        (item) =>
          item.status_laporan === "selesai" ||
          item.status_laporan === "ditolak"
      ).length,
    };
  }, [laporan]);

  // ==========================================
  // FILTER LAPORAN
  // ==========================================
  const filteredReports = useMemo(() => {
    switch (filter) {
      case "response":
        return laporan.filter(
          (item) => item.status_laporan === "menunggu"
        );

      case "review":
        return laporan.filter(
          (item) => item.status_laporan === "ditinjau"
        );

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

  const filters: { id: FilterLaporan; label: string }[] = [
    { id: "all", label: "Semua" },
    { id: "response", label: "Perlu Tanggapan" },
    { id: "review", label: "Ditinjau" },
    { id: "done", label: "Selesai" },
  ];

  // ==========================================
  // INITIAL PROFIL
  // ==========================================
  const initialProfil = namaPemilik.trim().charAt(0).toUpperCase() || "S";

  // ==========================================
  // MODAL ESCAPE
  // ==========================================
  useEffect(() => {
    if (!selected) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selected]);

  return (
    <main className="min-h-screen bg-[#f4f6fa] px-4 pb-28 pt-6 text-[#172033] sm:px-6 lg:pb-10">
      <div className="mx-auto max-w-6xl">

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
                <h1 className="text-lg font-extrabold tracking-tight text-[#162350">
                </h1>
                <p className="text-[11px] font-medium text-[#8992a7]">
                  Seller Workspace
                </p>
              </div>
            </Link>

            {/* NAVIGATION */}
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
                disabled={loggingOut}
                className="hidden rounded-lg px-3 py-2 text-xs font-bold text-[#647089] transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:block"
              >
                {loggingOut ? "Keluar..." : "Keluar"}
              </button>
            </div>
          </div>

          {/* LOGOUT MESSAGE */}
          {pesanLogout && (
            <p className="px-4 pb-2 text-right text-xs text-red-600 sm:px-6 lg:px-8">
              {pesanLogout}
            </p>
          )}
        </header>

        {/* HEADING */}
        <section className="mb-8">
          <span className="text-xs font-extrabold tracking-[0.16em] text-[#4f6bd8]">
            PUSAT LAPORAN TRUSTX
          </span>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#162350] sm:text-3xl">
            Laporan Terkait Toko
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Pantau laporan komunitas, pelajari hasil peninjauan, dan sampaikan
            klarifikasi dengan bukti yang relevan.
          </p>
        </section>

        {/* STATISTICS */}
        <section
          className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4"
          aria-label="Ringkasan laporan"
        >
          {[
            {
              label: "Total Laporan",
              value: statistik.total,
              desc: "Seluruh laporan toko",
            },
            {
              label: "Perlu Tanggapan",
              value: statistik.response,
              desc: "Perlu ditindaklanjuti",
            },
            {
              label: "Sedang Ditinjau",
              value: statistik.review,
              desc: "Dalam pemeriksaan",
            },
            {
              label: "Selesai Ditinjau",
              value: statistik.done,
              desc: "Hasil sudah tersedia",
            },
          ].map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-[#e3e7f0] bg-white p-4 shadow-sm sm:p-5"
            >
              <span className="text-xs font-semibold text-gray-500">
                {stat.label}
              </span>

              <strong className="mt-2 block text-3xl font-extrabold text-[#162350]">
                {loading ? "—" : stat.value}
              </strong>

              <p className="mt-2 text-xs text-gray-400">{stat.desc}</p>
            </article>
          ))}
        </section>

        {/* REPORT LIST */}
        <section className="rounded-2xl border border-[#e3e7f0] bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#162350">
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Pilih laporan untuk membaca detail atau mengajukan sanggahan.
            </p>
          </div>

          {/* FILTERS */}
          <div
            className="mb-6 flex gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label="Filter status laporan"
          >
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${
                  filter === item.id
                    ? "border-[#162350] bg-[#162350] text-white"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* ERROR */}
          {error && !loading && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <h3 className="font-bold text-red-700">
                Gagal Memuat Laporan Toko
              </h3>

              <p className="mt-2 text-sm text-red-600">{error}</p>

              <button
                type="button"
                onClick={retryLoad}
                className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="py-12 text-center text-sm text-gray-400">
              Memuat laporan...
            </div>
          )}

          {/* EMPTY */}
          {!loading && !error && filteredReports.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef1f8] text-gray-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-7 w-7"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>

              <h3 className="mt-4 font-bold text-[#162350">
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Belum ada laporan toko pada kategori ini atau filter tidak cocok.
              </p>

              {filter !== "all" && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="mt-4 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-[#4f6bd8] hover:bg-gray-50"
                >
                  Reset Filter (Tampilkan Semua)
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
                  className="rounded-2xl border border-[#e8ebf2] p-4 transition hover:border-[#cbd4ed] hover:shadow-sm sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-gray-400">
                        LP-{item.id.slice(0, 8).toUpperCase()}
                      </span>

                      <h3 className="mt-2 font-bold text-[#162350]">
                        {item.judul_laporan || "Laporan transaksi"}
                      </h3>

                      <p className="mt-2 text-xs text-gray-500">
                        Tanggal laporan: {formatTanggal(item.tanggal_dibuat)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusClass(item.status_laporan)}`}
                    >
                      {STATUS_LABEL[item.status_laporan] ??
                        item.status_laporan}
                    </span>
                  </div>

                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-500">
                    {item.kronologi || "Tidak ada kronologi yang tersedia."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-[#162350] hover:bg-gray-50"
                    >
                      Detail Laporan
                    </button>

                    {item.status_laporan === "menunggu" && (
                      <Link
                        href={`/seller/sanggahan?laporan=${item.id}`}
                        className="rounded-xl bg-[#162350] px-4 py-2 text-sm font-bold text-white hover:bg-[#22346b]"
                      >
                        Ajukan Sanggahan
                      </Link>
                    )}

                    {item.status_laporan === "ditinjau" && (
                      <span className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                        Laporan sedang diperiksa
                      </span>
                    )}

                    {(item.status_laporan === "selesai" ||
                      item.status_laporan === "ditolak") && (
                      <Link
                        href={`/seller/hasil-peninjauan?laporan=${item.id}`}
                        className="rounded-xl bg-[#eef1f8] px-4 py-2 text-sm font-bold text-[#162350] hover:bg-[#e1e7f5]"
                      >
                        Lihat Hasil
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* NOTICE */}
        <aside className="mt-6 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <span className="mt-0.5 shrink-0 text-[#4f6bd8]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6"
            >
              <path d="M12 3 4 6v5c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>

          <div>
            <strong className="text-sm font-bold text-[#162350">
            </strong>
            <p className="mt-1 text-xs leading-5 text-gray-600">
              Sampaikan kronologi yang jelas dan bukti yang relevan. Hindari
              mengunggah data pribadi yang tidak diperlukan.
            </p>
          </div>
        </aside>
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalDetailTitle"
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Tutup Detail"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500 hover:bg-gray-200"
            >
              &times;
            </button>

            <span className="text-xs font-bold text-gray-400">
              LP-{selected.id.slice(0, 8).toUpperCase()}
            </span>

            <h2
              id="modalDetailTitle"
              className="mt-2 pr-10 text-xl font-extrabold text-[#162350]"
            >
              {selected.judul_laporan || "Detail Laporan Akun"}
            </h2>

            <span
              className={`mt-4 inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusClass(selected.status_laporan)}`}
            >
              {STATUS_LABEL[selected.status_laporan] ??
                selected.status_laporan}
            </span>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#f4f6fa] p-4">
                <span className="text-xs text-gray-500">ID Laporan</span>
                <strong className="mt-1 block break-all text-sm text-[#162350]">
                  {selected.id}
                </strong>
              </div>

              <div className="rounded-xl bg-[#f4f6fa] p-4">
                <span className="text-xs text-gray-500">Tanggal Terbit</span>
                <strong className="mt-1 block text-sm text-[#162350]">
                  {formatTanggal(selected.tanggal_dibuat)}
                </strong>
              </div>

              <div className="rounded-xl bg-[#f4f6fa] p-4 sm:col-span-2">
                <span className="text-xs text-gray-500">Kategori Status</span>
                <strong className="mt-1 block text-sm text-[#162350]">
                  {STATUS_LABEL[selected.status_laporan] ??
                    selected.status_laporan}
                </strong>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-[#162350">
              </h3>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                {selected.kronologi || "Tidak ada kronologi tersedia."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-5 w-full rounded-xl bg-[#162350] py-3 text-sm font-bold text-white hover:bg-[#22346b]"
            >
              Tutup Detail Laporan
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
