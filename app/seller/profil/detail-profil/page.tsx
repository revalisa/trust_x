
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProfilToko = {
  id: string;
  nama_lengkap: string;
  nama_toko: string;
  deskripsi_toko: string | null;
  tanggal_dibuat: string | null;
};

export default function DetailProfileSellerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sellerId = searchParams.get("id");

  const [toko, setToko] = useState<ProfilToko | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let aktif = true;

    async function fetchProfilToko() {
      if (!sellerId) {
        setError("ID akun penjual tidak ditemukan.");
        setLoading(false);
        return;
      }

      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from("profil_toko")
        .select("id, nama_lengkap, nama_toko, deskripsi_toko, tanggal_dibuat")
        .eq("id", sellerId)
        .maybeSingle();

      if (!aktif) return;

      if (fetchError) {
        console.error("Gagal mengambil profil toko:", fetchError);
        setError("Profil toko gagal dimuat. Silakan coba kembali.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Profil toko tidak ditemukan.");
        setLoading(false);
        return;
      }

      setToko(data as ProfilToko);
      setLoading(false);
    }

    fetchProfilToko();

    return () => {
      aktif = false;
    };
  }, [sellerId]);

  const formatTanggal = (tanggal: string | null) => {
    if (!tanggal) return "-";

    return new Date(tanggal).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-[#f4f6fa] pb-8 text-[#172033]">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#e3e7f0] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Kembali"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e3e7f0] transition hover:bg-[#f4f6fa]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <h1 className="text-sm font-bold sm:text-base">
            Detail Profil Seller
          </h1>

          <div className="flex items-center gap-2">
            <Link
              href="/bantuan"
              aria-label="Bantuan"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#667089] transition hover:bg-[#f4f6fa]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M9.6 9a2.4 2.4 0 1 1 4.1 1.7c-1.1 1-1.7 1.3-1.7 2.8" />
                <path d="M12 17.2h.01" />
              </svg>
            </Link>

            <Link
              href="/seller/profil"
              aria-label="Profil saya"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#162350] text-white transition hover:bg-[#22346b]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-3.8 3.1-6 7-6s7 2.2 7 6" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        {/* TARGET INVESTIGASI */}
        <section className="mb-6 flex items-center gap-3 rounded-2xl border border-[#e3e7f0] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eef1f8] text-[#4f6bd8]">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 5 5M8.5 10.8h4.6M10.8 8.5v4.6" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[0.16em] text-[#8b94a8] sm:text-xs">
              TARGET INVESTIGASI
            </p>

            <p className="mt-1 truncate text-sm font-extrabold sm:text-base">
              {loading
                ? "Memuat profil..."
                : toko?.nama_toko || "Profil Seller"}
            </p>
          </div>

          <Link
            href="/"
            className="flex shrink-0 items-center gap-1 rounded-xl border border-[#e3e7f0] px-3 py-2 text-xs font-bold text-[#4f6bd8] transition hover:bg-[#f4f6fa] sm:text-sm"
          >
            Ganti
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="m14 5 5 5M4 20l4.2-.8L19 8.4 15.6 5 4.8 15.8z" />
            </svg>
          </Link>
        </section>

        {/* CONTENT */}
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse rounded-2xl border border-[#e3e7f0] bg-white p-6">
              <div className="h-5 w-40 rounded bg-[#e9edf5]" />
              <div className="mt-4 h-10 w-64 rounded bg-[#e9edf5]" />
              <div className="mt-3 h-4 w-full rounded bg-[#e9edf5]" />
              <div className="mt-2 h-4 w-3/4 rounded bg-[#e9edf5]" />
            </div>
            <div className="animate-pulse rounded-2xl border border-[#e3e7f0] bg-white p-6">
              <div className="h-5 w-40 rounded bg-[#e9edf5]" />
              <div className="mt-4 h-20 rounded bg-[#e9edf5]" />
            </div>
          </div>
        ) : error ? (
          <section className="rounded-2xl border border-[#e3e7f0] bg-white px-5 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f0] text-[#dc5454]">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v6M12 16.5v.01" />
              </svg>
            </div>

            <h2 className="mt-4 text-base font-extrabold">{error}</h2>

            <p className="mt-2 text-sm text-[#667089]">
              Pastikan tautan profil benar dan data seller tersedia.
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-[#162350] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#22346b]"
            >
              Coba Lagi
            </button>
          </section>
        ) : toko ? (
          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
            {/* PROFIL TOKO */}
            <section className="overflow-hidden rounded-2xl border border-[#e3e7f0] bg-white shadow-sm">
              <div className=" from-[#162350] to-[#344d91] px-5 py-7 text-white sm:px-7">
                <div className="flex items-center gap-4">
                  <div className="flex hw-[68px]-[68px]  shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-extrabold ring-1 ring-white/20">
                    {toko.nama_toko?.charAt(0)?.toUpperCase() || "S"}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/65">
                      PROFIL TOKO
                    </p>
                    <h2 className="mt-1 sbreak-word text-xl font-extrabold sm:text-2xl">
                      {toko.nama_toko}
                    </h2>
                    <p className="mt-1 text-sm text-white/70">
                      Penjual TrustX
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <h3 className="text-sm font-extrabold">
                  Informasi Toko
                </h3>

                <div className="mt-4 space-y-4">
                  <div className="rounded-xl bg-[#f4f6fa] p-4">
                    <p className="text-xs font-semibold text-[#667089]">
                      Nama Pemilik
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {toko.nama_lengkap || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#f4f6fa] p-4">
                    <p className="text-xs font-semibold text-[#667089]">
                      Nama Toko
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {toko.nama_toko || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#f4f6fa] p-4">
                    <p className="text-xs font-semibold text-[#667089]">
                      Deskripsi Toko
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#364159]">
                      {toko.deskripsi_toko?.trim() ||
                        "Penjual belum menambahkan deskripsi toko."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* INFORMASI AKUN */}
            <aside className="space-y-5">
              <section className="rounded-2xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-sm font-extrabold">
                  Informasi Akun
                </h3>

                <div className="mt-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef1f8] text-[#4f6bd8]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M4 5h16v14H4zM8 9h8M8 13h5" />
                    </svg>
                  </div>

                  <div>
                    <p className="text-xs text-[#667089]">
                      Bergabung dengan TrustX
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {formatTanggal(toko.tanggal_dibuat)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#e3e7f0] pt-4">
                  <div className="flex items-center gap-2 text-xs text-[#667089]">
                    <span className="h-2 w-2 rounded-full bg-[#4f6bd8]" />
                    <span>Jenis Akun</span>
                  </div>
                  <p className="mt-1 pl-4 text-sm font-bold">
                    Seller / Penjual
                  </p>
                </div>
              </section>

              {/* INFO TRUSTX */}
              <section className="rounded-2xl border border-[#dce5ff] bg-[#edf2ff] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#4f6bd8]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-[#233c7b]">
                      Periksa Sebelum Transaksi
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-[#53658f]">
                      Informasi profil merupakan salah satu referensi untuk
                      mengenali akun penjual. Tetap periksa bukti transaksi
                      dan pertimbangkan laporan komunitas sebelum melakukan
                      transaksi.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>

      {/* ACTION BAR */}
      <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/seller"
            className="flex items-center justify-center rounded-xl border border-[#dce1ec] bg-white px-5 py-3 text-sm font-bold text-[#344159] transition hover:bg-[#f4f6fa]"
          >
            Kembali ke Beranda
          </Link>

          {toko && !loading && !error && (
            <Link
              href={`/buyer/lapor?penjual=${toko.id}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#162350] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#22346b]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 3 21 20H3z" />
                <path d="M12 9v4M12 16.5v.01" />
              </svg>
              Laporkan Akun
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
