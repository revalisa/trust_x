"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  return new Date(value).toLocaleDateString("id-ID", {
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

  // Memuat profil seller dan laporan
  const loadLaporan = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const userId = userData.user.id;

      // Cek role pengguna
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

      // Ambil nama pemilik toko
      const { data: profilToko, error: tokoError } = await supabase
        .from("profil_toko")
        .select("nama_lengkap, nama_toko")
        .eq("id", userId)
        .maybeSingle();

      if (tokoError) {
        console.error("Gagal mengambil profil toko:", tokoError);
      }

      // Gunakan nama dari profil toko, fallback ke profil pengguna
      const nama =
        profilToko?.nama_lengkap?.trim() ||
        profil.nama_lengkap?.trim() ||
        "";

      setNamaPemilik(nama);

      // Ambil laporan untuk seller yang sedang login
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
      setError(
        "Laporan gagal dimuat. Periksa koneksi atau izin akses database."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Pemanggilan awal dan saat tombol retry ditekan
  useEffect(() => {
    let aktif = true;

    const mulaiMemuat = async () => {
      if (aktif) {
        await loadLaporan();
      }
    };

    mulaiMemuat();

    return () => {
      aktif = false;
    };
  }, [loadLaporan, reloadKey]);

  // Memuat ulang laporan
  const retryLoad = () => {
    setError("");
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  // Statistik laporan
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

  // Filter laporan
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

  // Huruf awal nama pemilik untuk ikon profil
  const initialProfil = namaPemilik.trim().charAt(0).toUpperCase() || "S";

  // Tutup modal menggunakan tombol Escape
  useEffect(() => {
    if (!selected) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [selected]);

  return (
    <main className="min-h-screen bg-[#f4f6fa] px-4 pb-28 pt-6 text-[#172033] sm:px-6 lg:pb-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/seller" className="flex items-center gap-3">
            <Image
              src="/assets/images/logo-trustx.svg"
              alt="Logo TrustX"
              width={44}
              height={44}
              priority
            />
            <div>
              <strong className="block text-lg font-extrabold text-[#162350]">
                TrustX
              </strong>
              <span className="text-xs text-gray-500">Cek Dulu</span>
            </div>
          </Link>

          <nav
            className="flex flex-wrap items-center gap-2"
            aria-label="Navigasi utama"
          >
            <Link
              href="/seller"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white"
            >
              Beranda
            </Link>

            <Link
              href="/seller/laporan"
              aria-current="page"
              className="rounded-xl bg-[#eef1f8] px-4 py-2 text-sm font-semibold text-[#162350]"
            >
              Laporan
            </Link>

            <Link
              href="/seller/profil"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white"
            >
              Akun Toko
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {/* NOTIFIKASI */}
            <button
              type="button"
              aria-label="Notifikasi"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#162350] hover:bg-gray-50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </button>

            {/* PROFIL SELLER */}
            <Link
            href="/seller/profil"
            aria-label={`Profil ${namaPemilik || "Seller"}`}
            title={namaPemilik || "Profil Seller"}
            className="group flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-linier-to-br from-[#4f6bd8] to-[#162350] text-sm font-extrabold uppercase text-white shadow-md ring-1 ring-[#4f6bd8]/20 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:ring-[#4f6bd8]/50"
            >
            {initialProfil}
            </Link>
          </div>
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
            <h2 className="text-lg font-bold text-[#162350]">
              Daftar Laporan
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

              <h3 className="mt-4 font-bold text-[#162350]">
                Tidak Ada Laporan Ditemukan
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
                      {STATUS_LABEL[item.status_laporan] ?? item.status_laporan}
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
            <strong className="text-sm font-bold text-[#162350]">
              Hak klarifikasi penjual
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
              {STATUS_LABEL[selected.status_laporan]}
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
                  {STATUS_LABEL[selected.status_laporan]}
                </strong>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-[#162350]">
                Kronologi Transaksi
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