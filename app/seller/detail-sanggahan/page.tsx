
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Sanggahan = {
  id: string;
  laporan_id: string;
  penjual_id: string;
  kronologi_sanggahan: string;
  status_sanggahan: string;
  catatan_peninjauan: string | null;
  tanggal_dibuat: string;
  tanggal_diperbarui: string;
};

type Laporan = {
  id: string;
  judul_laporan: string;
  kronologi: string;
  status_laporan: string;
  tanggal_dibuat: string;
};

type Bukti = {
  id: string;
  sanggahan_id: string;
  lokasi_file: string;
  nama_file: string;
  url?: string;
};

const supabase = createClient();

function formatTanggal(value: string | null) {
  if (!value) return "-";

  const tanggal = new Date(value);

  if (Number.isNaN(tanggal.getTime())) return "-";

  return tanggal.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusInfo(status: string) {
  switch (status) {
    case "diajukan":
      return {
        label: "Sanggahan Diajukan",
        style: "border-blue-200 bg-blue-50 text-blue-700",
      };
    case "ditinjau":
      return {
        label: "Sedang Ditinjau",
        style: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "selesai":
      return {
        label: "Peninjauan Selesai",
        style: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "ditolak":
      return {
        label: "Sanggahan Ditolak",
        style: "border-red-200 bg-red-50 text-red-700",
      };
    default:
      return {
        label: status || "Belum diketahui",
        style: "border-gray-200 bg-gray-50 text-gray-600",
      };
  }
}

function StatusBadge({ status }: { status: string }) {
  const info = statusInfo(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${info.style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {info.label}
    </span>
  );
}

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-[#e6eaf2] bg-white p-5">
      <div className="h-4 w-32 rounded bg-gray-100" />
      <div className="mt-4 h-6 w-2/3 rounded bg-gray-100" />
      <div className="mt-3 h-3 w-full rounded bg-gray-100" />
      <div className="mt-2 h-3 w-4/5 rounded bg-gray-100" />
    </div>
  );
}

export default function DetailSanggahanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sanggahanId = searchParams.get("id");

  const [sanggahan, setSanggahan] = useState<Sanggahan | null>(null);
  const [laporan, setLaporan] = useState<Laporan | null>(null);
  const [bukti, setBukti] = useState<Bukti[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      setError("");

      try {
        const { data: userData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        const user = userData.user;

        if (!user) {
          router.replace("/login");
          return;
        }

        if (!sanggahanId) {
          throw new Error("ID sanggahan tidak ditemukan.");
        }

        // Pastikan akun yang login adalah seller
        const { data: profil, error: profilError } = await supabase
          .from("profil_pengguna")
          .select("jenis_akun")
          .eq("id", user.id)
          .maybeSingle();

        if (profilError) throw profilError;

        if (!profil || profil.jenis_akun !== "seller") {
          router.replace("/login");
          return;
        }

        // Ambil sanggahan milik seller yang sedang login
        const { data: sanggahanData, error: sanggahanError } =
          await supabase
            .from("sanggahan")
            .select(
              "id, laporan_id, penjual_id, kronologi_sanggahan, status_sanggahan, catatan_peninjauan, tanggal_dibuat, tanggal_diperbarui"
            )
            .eq("id", sanggahanId)
            .eq("penjual_id", user.id)
            .maybeSingle();

        if (sanggahanError) throw sanggahanError;

        if (!sanggahanData) {
          throw new Error(
            "Sanggahan tidak ditemukan atau kamu tidak memiliki akses."
          );
        }

        // Ambil laporan terkait sanggahan
        const { data: laporanData, error: laporanError } = await supabase
          .from("laporan")
          .select("id, judul_laporan, kronologi, status_laporan, tanggal_dibuat")
          .eq("id", sanggahanData.laporan_id)
          .maybeSingle();

        if (laporanError) throw laporanError;

        // Ambil metadata bukti sanggahan
        const { data: buktiData, error: buktiError } = await supabase
          .from("bukti_sanggahan")
          .select("id, sanggahan_id, lokasi_file, nama_file")
          .eq("sanggahan_id", sanggahanData.id);

        if (buktiError) throw buktiError;

        // Buat signed URL untuk file di bucket bukti-sanggahan
        const buktiDenganUrl: Bukti[] = await Promise.all(
          (buktiData ?? []).map(async (file) => {
            const { data: signedData, error: signedError } =
              await supabase.storage
                .from("bukti-sanggahan")
                .createSignedUrl(file.lokasi_file, 3600);

            if (signedError) {
              console.error("Gagal membuat signed URL:", signedError);
            }

            return {
              ...file,
              url: signedData?.signedUrl ?? undefined,
            };
          })
        );

        if (cancelled) return;

        setSanggahan(sanggahanData as Sanggahan);
        setLaporan(laporanData as Laporan | null);
        setBukti(buktiDenganUrl);
      } catch (err) {
        console.error("Gagal memuat detail sanggahan:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Detail sanggahan gagal dimuat."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [router, sanggahanId]);

  return (
    <main className="min-h-screen bg-[#f5f7fc] px-4 pb-24 text-[#172033] sm:px-6 sm:pb-10">
      {/* HEADER */}
      <header className="sticky top-0 z-40 -mx-4 border-b border-[#e8ecf4] bg-white/95 backdrop-blur-xl sm:-mx-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/seller" className="flex items-center gap-3">
            <Image
              src="/assets/images/logo-trustx.svg"
              alt="Logo TrustX"
              width={40}
              height={40}
              priority
            />
            <div>
              <h1 className="font-extrabold text-[#162350]">TrustX</h1>
              <p className="text-[11px] text-[#8992a7]">Seller Workspace</p>
            </div>
          </Link>

          <Link
            href="/seller/laporan"
            className="rounded-xl border border-[#e3e7f0] bg-white px-4 py-2.5 text-sm font-bold text-[#647089] transition hover:bg-[#f4f6fa]"
          >
            Kembali ke Laporan
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl pt-6 sm:pt-9">
        {/* TITLE */}
        <section className="mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-[#162350] via-[#22346b] to-[#4f6bd8] p-6 text-white sm:p-8">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold tracking-widest text-white/80">
            DETAIL PENGAJUAN
          </span>

          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
            Detail Sanggahan
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Lihat kronologi klarifikasi, bukti pendukung, dan status sanggahan
            laporan yang telah kamu ajukan.
          </p>
        </section>

        {/* ERROR */}
        {error && !loading && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <p className="font-bold text-red-700">Gagal memuat sanggahan</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="space-y-4">
            <LoadingCard />
            <LoadingCard />
          </div>
        )}

        {!loading && !error && sanggahan && (
          <div className="space-y-5">
            {/* STATUS */}
            <section className="rounded-2xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-wide text-[#8792a8]">
                    STATUS SANGGAHAN
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={sanggahan.status_sanggahan} />
                  </div>
                </div>

                <div className="rounded-xl bg-[#f5f7fc] px-4 py-3">
                  <p className="text-xs text-[#8792a8]">Tanggal pengajuan</p>
                  <p className="mt-1 text-sm font-bold text-[#162350]">
                    {formatTanggal(sanggahan.tanggal_dibuat)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-bold text-blue-800">
                  {sanggahan.status_sanggahan === "diajukan"
                    ? "Sanggahan berhasil diajukan"
                    : sanggahan.status_sanggahan === "ditinjau"
                      ? "Sanggahan sedang ditinjau oleh tim TrustX"
                      : "Status peninjauan sanggahan telah diperbarui"}
                </p>
                <p className="mt-1 text-sm leading-6 text-blue-700">
                  {sanggahan.status_sanggahan === "diajukan"
                    ? "Pengajuan dan bukti kamu telah tersimpan. Silakan menunggu proses peninjauan tim TrustX."
                    : "Kamu dapat melihat informasi dan catatan peninjauan pada halaman ini."}
                </p>
              </div>
            </section>

            {/* REPORT DETAILS */}
            <section className="rounded-2xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-extrabold text-[#162350]">
                Laporan yang Disanggah
              </h2>

              {laporan ? (
                <>
                  <div className="mt-4 rounded-xl bg-[#f5f7fc] p-4">
                    <p className="text-xs font-bold text-[#8792a8]">
                      ID LAPORAN
                    </p>
                    <p className="mt-1 break-all text-sm font-bold text-[#162350]">
                      LP-{laporan.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-[#162350]">
                    {laporan.judul_laporan || "Laporan transaksi"}
                  </h3>

                  <div className="mt-3 rounded-xl border border-[#e6eaf2] p-4">
                    <p className="text-xs font-bold text-[#8792a8]">
                      Kronologi Laporan Pembeli
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#647089]">
                      {laporan.kronologi || "Tidak ada kronologi laporan."}
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-[#8792a8]">
                  Data laporan tidak ditemukan.
                </p>
              )}
            </section>

            {/* APPEAL */}
            <section className="rounded-2xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-extrabold text-[#162350]">
                Kronologi Sanggahan
              </h2>

              <p className="mt-1 text-sm text-[#8792a8]">
                Penjelasan yang kamu kirimkan kepada tim TrustX.
              </p>

              <div className="mt-4 rounded-xl bg-[#f8faff] p-4 sm:p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-[#53617b]">
                  {sanggahan.kronologi_sanggahan}
                </p>
              </div>
            </section>

            {/* EVIDENCE */}
            <section className="rounded-2xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-[#162350]">
                    Bukti Sanggahan
                  </h2>
                  <p className="mt-1 text-sm text-[#8792a8]">
                    File bukti yang kamu lampirkan saat mengajukan sanggahan.
                  </p>
                </div>

                <span className="rounded-full bg-[#eef2ff] px-3 py-1.5 text-xs font-bold text-[#4f6bd8]">
                  {bukti.length} File
                </span>
              </div>

              {bukti.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-[#dfe5ef] p-6 text-center">
                  <p className="text-sm text-[#8792a8]">
                    Tidak ada file bukti yang dilampirkan.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {bukti.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-col gap-3 rounded-xl border border-[#e6eaf2] bg-[#fafbfe] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-xl text-[#4f6bd8]">
                          ▤
                        </div>

                        <div className="min-w-0">
                          <p className="break-all text-sm font-bold text-[#162350]">
                            {file.nama_file}
                          </p>
                          <p className="mt-1 text-xs text-[#8792a8]">
                            File bukti sanggahan
                          </p>
                        </div>
                      </div>

                      {file.url ? (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#4f6bd8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#405ec7]"
                        >
                          Lihat / Unduh Bukti
                        </a>
                      ) : (
                        <span className="text-xs font-semibold text-red-500">
                          File tidak dapat diakses
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* REVIEW NOTE */}
            {sanggahan.catatan_peninjauan && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                <h2 className="font-extrabold text-emerald-800">
                  Catatan Tim TrustX
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-emerald-700">
                  {sanggahan.catatan_peninjauan}
                </p>
              </section>
            )}

            {/* FOOTER ACTION */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/seller/laporan"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#162350] px-5 py-3 text-sm font-bold text-[#f1f5f9] transition hover:bg-[#2a3c75]"
              >
                Kembali ke Daftar Laporan
              </Link>

              {laporan &&
                (laporan.status_laporan === "selesai" ||
                  laporan.status_laporan === "ditolak") && (
                  <Link
                    href={`/seller/hasil-peninjauan?laporan=${laporan.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#eef2ff] px-5 py-3 text-sm font-bold text-[#405ec7] transition hover:bg-[#e2e9ff]"
                  >
                    Lihat Hasil Peninjauan
                  </Link>
                )}
            </div>
          </div>
        )}

        <footer className="mt-8 border-t border-[#e3e7f0] pt-6">
          <p className="text-center text-xs text-[#98a1b4]">
            © 2026 TrustX. Cek Dulu Sebelum Transaksi.
          </p>
        </footer>
      </div>
    </main>
  );
}
