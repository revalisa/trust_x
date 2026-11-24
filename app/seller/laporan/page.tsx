"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type StatusLaporan = "menunggu" | "ditinjau" | "selesai" | "ditolak";
type FilterLaporan = "all" | "response" | "review" | "done";

type BuktiSanggahan = {
  id: string;
  lokasi_file: string;
  nama_file: string;
  url?: string | null;
};

type Sanggahan = {
  id: string;
  kronologi_sanggahan: string;
  status_sanggahan: string;
  catatan_peninjauan: string | null;
  tanggal_dibuat: string;
  bukti_sanggahan: BuktiSanggahan[];
};

type Laporan = {
  id: string;
  pembeli_id: string;
  penjual_id: string;
  judul_laporan: string;
  kronologi: string;
  status_laporan: StatusLaporan;
  tanggal_dibuat: string;
  tanggal_diperbarui: string | null;
  sanggahan: Sanggahan[];
};

const STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu Verifikasi",
  ditinjau: "Sedang Ditinjau",
  selesai: "Selesai Ditinjau",
  ditolak: "Ditolak",
};

function formatTanggal(tanggal?: string | null) {
  if (!tanggal) return "-";

  return new Date(tanggal).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusStyle(status: string) {
  switch (status) {
    case "menunggu":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "ditinjau":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "selesai":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "ditolak":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
        status
      )}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  color,
}: {
  title: string;
  value: number;
  description: string;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-[#e7eaf1] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#718096]">{title}</p>
      <p className={`mt-2 text-3xl font-extrabold ${color}`}>{value}</p>
      <p className="mt-3 text-xs text-[#929cb0]">{description}</p>
    </article>
  );
}

export default function LaporanSellerPage() {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<FilterLaporan>("all");

  // Popup detail laporan
  const [selectedLaporan, setSelectedLaporan] = useState<Laporan | null>(null);

  // Popup detail sanggahan
  const [selectedSanggahan, setSelectedSanggahan] =
    useState<Sanggahan | null>(null);

  const [loadingBukti, setLoadingBukti] = useState(false);

  const [namaToko, setNamaToko] = useState("Toko Saya");
  const [email, setEmail] = useState("");

  // =========================================================
  // LOAD DATA LAPORAN
  // =========================================================

 const loadLaporan = useCallback(async () => {
  try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");

      // Validasi role
      const { data: profil, error: profilError } = await supabase
        .from("profil_pengguna")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profilError) throw profilError;

      if (!profil || profil.role !== "seller") {
        router.replace("/");
        return;
      }

      // Ambil profil toko
      const { data: toko, error: tokoError } = await supabase
        .from("profil_toko")
        .select("nama_toko, username_toko")
        .eq("id", user.id)
        .maybeSingle();

      if (tokoError) {
        console.warn("Gagal mengambil profil toko:", tokoError.message);
      }

      if (toko?.nama_toko) {
        setNamaToko(toko.nama_toko);
      } else if (toko?.username_toko) {
        setNamaToko(toko.username_toko);
      }

      // Ambil laporan milik seller beserta data sanggahan dan bukti
      const { data, error: laporanError } = await supabase
        .from("laporan")
        .select(`
          id,
          pembeli_id,
          penjual_id,
          judul_laporan,
          kronologi,
          status_laporan,
          tanggal_dibuat,
          tanggal_diperbarui,
          sanggahan (
            id,
            kronologi_sanggahan,
            status_sanggahan,
            catatan_peninjauan,
            tanggal_dibuat,
            bukti_sanggahan (
              id,
              lokasi_file,
              nama_file
            )
          )
        `)
        .eq("penjual_id", user.id)
        .order("tanggal_dibuat", { ascending: false });

      if (laporanError) throw laporanError;

      setLaporan((data ?? []) as Laporan[]);
    } catch (err) {
      console.error("Gagal mengambil laporan:", err);
      setError("Gagal memuat data laporan. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

    useEffect(() => {
      const timer = setTimeout(() => {
        loadLaporan();
      }, 0);

      return () => clearTimeout(timer);
    }, [loadLaporan]);

  // =========================================================
  // ESCAPE UNTUK MENUTUP POPUP
  // =========================================================

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedLaporan(null);
        setSelectedSanggahan(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // =========================================================
  // STATISTIK
  // =========================================================

  const statistik = useMemo(
    () => ({
      total: laporan.length,

      response: laporan.filter((item) => item.status_laporan === "menunggu")
        .length,

      review: laporan.filter((item) => item.status_laporan === "ditinjau")
        .length,

      done: laporan.filter(
        (item) =>
          item.status_laporan === "selesai" ||
          item.status_laporan === "ditolak"
      ).length,
    }),
    [laporan]
  );

  // =========================================================
  // FILTER LAPORAN
  // =========================================================

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

  // =========================================================
  // BUKA POPUP SANGGAHAN + SIGNED URL BUKTI
  // =========================================================

  const bukaPopupSanggahan = async (item: Sanggahan) => {
    setSelectedSanggahan(item);
    setLoadingBukti(true);

    try {
      const buktiDenganUrl = await Promise.all(
        (item.bukti_sanggahan ?? []).map(async (bukti) => {
          const { data, error } = await supabase.storage
            .from("bukti-sanggahan")
            .createSignedUrl(bukti.lokasi_file, 3600);

          if (error) {
            console.warn("Gagal membuat URL bukti:", error.message);
            return { ...bukti, url: null };
          }

          return { ...bukti, url: data.signedUrl };
        })
      );

      setSelectedSanggahan({
        ...item,
        bukti_sanggahan: buktiDenganUrl,
      });
    } catch (err) {
      console.error("Gagal memuat bukti sanggahan:", err);
    } finally {
      setLoadingBukti(false);
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Gagal logout. Silakan coba kembali.");
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  // =========================================================
  // FILTER BUTTON
  // =========================================================

  const filterItems: { id: FilterLaporan; label: string }[] = [
    { id: "all", label: "Semua Laporan" },
    { id: "response", label: "Perlu Tanggapan" },
    { id: "review", label: "Sedang Ditinjau" },
    { id: "done", label: "Selesai" },
  ];

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="min-h-screen bg-[#f4f6fa] pb-28 text-[#172033] md:pb-10">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#e3e7f0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/seller" className="flex items-center gap-2">
            <Image
              src="/assets/images/logo-trustx.svg"
              alt="TrustX"
              width={112}
              height={36}
              className="h-auto w-26.25"
            />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <Link
              href="/seller"
              className="text-[#7a8498] transition hover:text-[#162350]"
            >
              Beranda
            </Link>

            <Link
              href="/seller/laporan"
              className="text-[#162350]"
            >
              Laporan
            </Link>

            <Link
              href="/seller/profil"
              className="text-[#7a8498] transition hover:text-[#162350]"
            >
              Profil
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-[#172033]">{namaToko}</p>
              <p className="text-xs text-[#8993a7]">{email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-[#e3e7f0] px-3 py-2 text-xs font-bold text-[#647089] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        {/* INTRO */}
        <section className="mb-8 overflow-hidden rounded-3xl bg-[#162350] p-6 text-white md:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#aebde9]">
            Pusat Laporan TrustX
          </p>

          <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">
            Laporan Terkait Toko
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d3dbef]">
            Pantau laporan komunitas, pelajari hasil peninjauan, dan sampaikan
            klarifikasi dengan bukti yang relevan.
          </p>
        </section>

        {/* STATS */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Laporan"
            value={statistik.total}
            description="Seluruh laporan yang terkait dengan toko"
            color="text-[#162350]"
          />

          <StatCard
            title="Perlu Tanggapan"
            value={statistik.response}
            description="Laporan yang masih menunggu verifikasi"
            color="text-amber-600"
          />

          <StatCard
            title="Sedang Ditinjau"
            value={statistik.review}
            description="Laporan dalam proses peninjauan"
            color="text-blue-600"
          />

          <StatCard
            title="Selesai Ditinjau"
            value={statistik.done}
            description="Laporan yang sudah memiliki hasil"
            color="text-emerald-600"
          />
        </section>

        {/* FILTER */}
        <section className="mb-6">
          <div className="flex flex-wrap gap-2">
            {filterItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  filter === item.id
                    ? "bg-[#162350] text-white shadow-sm"
                    : "border border-[#e3e7f0] bg-white text-[#69758b] hover:border-[#162350] hover:text-[#162350]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>

            <button
              onClick={() => {
                setLoading(true);
                setError("");
                void loadLaporan();
              }}
              className="mt-2 font-bold underline"
            >
              Coba muat ulang
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="rounded-2xl border border-[#e3e7f0] bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#e3e7f0] border-t-[#162350]" />
            <p className="mt-4 text-sm text-[#8993a7]">
              Memuat laporan...
            </p>
          </div>
        ) : filteredReports.length === 0 ? (
          /* EMPTY */
          <div className="rounded-2xl border border-[#e3e7f0] bg-white px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef1f8] text-2xl">
              📋
            </div>

            <h3 className="mt-4 text-base font-bold text-[#172033]">
              Tidak ada laporan
            </h3>

            <p className="mt-2 text-sm text-[#8993a7]">
              Belum ada laporan pada kategori ini.
            </p>
          </div>
        ) : (
          /* REPORT LIST */
          <section className="space-y-4">
            {filteredReports.map((item) => {
              const sanggahan = item.sanggahan?.[0] ?? null;

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#e3e7f0] bg-white p-5 shadow-sm md:p-6"
                >
                  {/* CARD HEADER */}
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-bold tracking-wide text-[#8993a7]">
                        LP-{item.id.slice(0, 8).toUpperCase()}
                      </p>

                      <h2 className="mt-2 text-lg font-extrabold text-[#172033]">
                        {item.judul_laporan}
                      </h2>

                      <p className="mt-1 text-xs text-[#8993a7]">
                        Dibuat {formatTanggal(item.tanggal_dibuat)}
                      </p>
                    </div>

                    <StatusBadge status={item.status_laporan} />
                  </div>

                  {/* REPORT DESCRIPTION */}
                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-[#647089]">
                    {item.kronologi}
                  </p>

                  {/* ACTIONS */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedLaporan(item)}
                      className="rounded-xl border border-[#e3e7f0] px-4 py-2.5 text-sm font-bold text-[#162350] transition hover:bg-[#f4f6fa]"
                    >
                      Detail Laporan
                    </button>

                    {/* Menunggu: belum boleh sanggahan */}
                    {item.status_laporan === "menunggu" && (
                      <button
                        disabled
                        className="cursor-not-allowed rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-400"
                      >
                        Menunggu Verifikasi Tim
                      </button>
                    )}

                    {/* Ditinjau: belum mengajukan sanggahan */}
                    {item.status_laporan === "ditinjau" && !sanggahan && (
                      <Link
                        href={`/seller/sanggahan?laporan=${item.id}`}
                        className="rounded-xl bg-[#162350] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#2a3c75]"
                      >
                        Ajukan Sanggahan
                      </Link>
                    )}

                    {/* Sanggahan sudah diajukan */}
                    {sanggahan && (
                      <>
                        <button
                          type="button"
                          onClick={() => bukaPopupSanggahan(sanggahan)}
                          className="rounded-xl border border-[#dbe3f4] bg-[#eef3ff] px-4 py-2.5 text-sm font-bold text-[#29447f] transition hover:bg-[#dfe9ff]"
                        >
                          Lihat Sanggahan
                        </button>

                        <span className="inline-flex items-center rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700">
                          Menunggu Peninjauan Sanggahan
                        </span>
                      </>
                    )}

                    {/* Hasil peninjauan */}
                    {(item.status_laporan === "selesai" ||
                      item.status_laporan === "ditolak") &&
                      sanggahan && (
                        <Link
                          href={`/seller/hasil-peninjauan?laporan=${item.id}`}
                          className="rounded-xl bg-[#162350] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#2a3c75]"
                        >
                          Lihat Hasil
                        </Link>
                      )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* HAK KLARIFIKASI */}
        <section className="mt-8 rounded-2xl border border-[#dce5f7] bg-[#eef3fb] p-5 md:p-6">
          <h3 className="font-bold text-[#162350]">
            Hak Klarifikasi Penjual
          </h3>

          <p className="mt-2 text-sm leading-7 text-[#647089]">
            Jika laporan telah masuk tahap peninjauan, penjual dapat mengajukan
            sanggahan dengan menyertakan kronologi dan bukti pendukung. Pastikan
            bukti yang dikirim relevan dengan laporan.
          </p>
        </section>
      </div>

      {/* =====================================================
          POPUP DETAIL LAPORAN
      ====================================================== */}

      {selectedLaporan && (
        <div
          onClick={() => setSelectedLaporan(null)}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8993a7]">
                  Detail Laporan
                </p>

                <h2 className="mt-2 text-xl font-extrabold text-[#172033]">
                  {selectedLaporan.judul_laporan}
                </h2>
              </div>

              <button
                onClick={() => setSelectedLaporan(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
                aria-label="Tutup popup"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">
              <StatusBadge status={selectedLaporan.status_laporan} />
            </div>

            <div className="mt-5 rounded-2xl bg-[#f4f6fa] p-4">
              <p className="text-xs font-bold text-[#8993a7]">
                Tanggal Laporan
              </p>

              <p className="mt-1 text-sm font-semibold text-[#172033]">
                {formatTanggal(selectedLaporan.tanggal_dibuat)}
              </p>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-bold text-[#172033]">
                Kronologi Laporan
              </h3>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#647089]">
                {selectedLaporan.kronologi}
              </p>
            </div>

            {selectedLaporan.sanggahan?.[0] && (
              <button
                onClick={() => {
                  const sanggahan = selectedLaporan.sanggahan[0];
                  setSelectedLaporan(null);
                  void bukaPopupSanggahan(sanggahan);
                }}
                className="mt-6 w-full rounded-xl border border-[#dbe3f4] bg-[#eef3ff] px-4 py-3 text-sm font-bold text-[#29447f] transition hover:bg-[#dfe9ff]"
              >
                Lihat Sanggahan yang Diajukan
              </button>
            )}

            <button
              onClick={() => setSelectedLaporan(null)}
              className="mt-3 w-full rounded-xl bg-[#162350] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2a3c75]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          POPUP DETAIL SANGGAHAN
      ====================================================== */}

      {selectedSanggahan && (
        <div
          onClick={() => setSelectedSanggahan(null)}
          className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* POPUP HEADER */}
            <div className="flex items-start justify-between bg-[#162350] p-6 text-white md:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#aebde9]">
                  Detail Pengajuan
                </p>

                <h2 className="mt-2 text-xl font-extrabold md:text-2xl">
                  Sanggahan Penjual
                </h2>

                <p className="mt-2 text-xs text-[#cbd5eb]">
                  ID: {selectedSanggahan.id.slice(0, 13)}
                </p>
              </div>

              <button
                onClick={() => setSelectedSanggahan(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Tutup popup sanggahan"
              >
                ✕
              </button>
            </div>

            {/* POPUP BODY */}
            <div className="max-h-[70vh] overflow-y-auto p-6 md:p-7">
              {/* STATUS */}
              <div className="rounded-2xl border border-[#e3e7f0] p-4">
                <p className="text-xs font-bold text-[#8993a7]">
                  Status Sanggahan
                </p>

                <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                  {selectedSanggahan.status_sanggahan}
                </span>

                <p className="mt-3 text-xs text-[#8993a7]">
                  Diajukan pada {formatTanggal(selectedSanggahan.tanggal_dibuat)}
                </p>
              </div>

              {/* KRONOLOGI SANGGAHAN */}
              <section className="mt-5">
                <h3 className="text-sm font-extrabold text-[#172033]">
                  Kronologi Sanggahan
                </h3>

                <div className="mt-3 rounded-2xl bg-[#f4f6fa] p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-[#647089]">
                    {selectedSanggahan.kronologi_sanggahan ||
                      "Kronologi sanggahan tidak tersedia."}
                  </p>
                </div>
              </section>

              {/* BUKTI SANGGAHAN */}
              <section className="mt-5">
                <h3 className="text-sm font-extrabold text-[#172033]">
                  Bukti Sanggahan
                </h3>

                {loadingBukti ? (
                  <p className="mt-3 text-sm text-[#8993a7]">
                    Memuat bukti...
                  </p>
                ) : !selectedSanggahan.bukti_sanggahan?.length ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-[#dce1ea] p-5 text-center">
                    <p className="text-sm text-[#8993a7]">
                      Tidak ada bukti yang dilampirkan.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {selectedSanggahan.bukti_sanggahan.map((bukti) => (
                      <div
                        key={bukti.id}
                        className="flex flex-col gap-3 rounded-2xl border border-[#e3e7f0] p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef1f8]">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-5 w-5 text-[#162350]"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <path d="M14 2v6h6M8 13h8M8 17h6" />
                            </svg>
                          </div>

                          <div className="min-w-0">
                            <p className="break-all text-sm font-bold text-[#172033]">
                              {bukti.nama_file}
                            </p>
                            <p className="mt-1 text-xs text-[#8993a7]">
                              File bukti sanggahan
                            </p>
                          </div>
                        </div>

                        {bukti.url && (
                          <a
                            href={bukti.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-xl bg-[#162350] px-4 py-2.5 text-center text-xs font-bold text-white transition hover:bg-[#2a3c75]"
                          >
                            Lihat Bukti
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* CATATAN REVIEW */}
              {selectedSanggahan.catatan_peninjauan && (
                <section className="mt-5">
                  <h3 className="text-sm font-extrabold text-[#172033]">
                    Catatan Peninjauan
                  </h3>

                  <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-blue-800">
                      {selectedSanggahan.catatan_peninjauan}
                    </p>
                  </div>
                </section>
              )}
            </div>

            {/* POPUP FOOTER */}
            <div className="border-t border-[#e3e7f0] bg-white p-5">
              <button
                onClick={() => setSelectedSanggahan(null)}
                className="w-full rounded-xl bg-[#162350] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2a3c75]"
              >
                Tutup Popup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#e3e7f0] bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around py-2">
          <Link
            href="/seller"
            className="flex flex-col items-center gap-1 px-4 py-1 text-[#8993a7]"
          >
            <span className="text-lg">⌂</span>
            <span className="text-[10px] font-semibold">Beranda</span>
          </Link>

          <Link
            href="/seller/laporan"
            className="flex flex-col items-center gap-1 px-4 py-1 text-[#162350]"
          >
            <span className="text-lg">▤</span>
            <span className="text-[10px] font-bold">Laporan</span>
          </Link>

          <Link
            href="/seller/profil"
            className="flex flex-col items-center gap-1 px-4 py-1 text-[#8993a7]"
          >
            <span className="text-lg">♙</span>
            <span className="text-[10px] font-semibold">Profil</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}