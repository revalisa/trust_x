
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Report = {
  id: string;
  judul_laporan: string;
  status_laporan: string;
  tanggal_dibuat: string;
};

type Store = {
  id: string;
  nama_toko: string;
};

function HasilContent() {
  const params = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const storeId = params.get("storeId");
  const searchType = params.get("type") || "";
  const searchValue = params.get("value") || "";

  const [store, setStore] = useState<Store | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResult() {
      setLoading(true);
      setError("");

      try {
        let foundStore: Store | null = null;

        // Jika halaman dibuka dari hasil pengecekan langsung
        if (storeId) {
          const { data, error } = await supabase
            .from("profil_toko")
            .select("id, nama_toko")
            .eq("id", storeId)
            .maybeSingle();

          if (error) throw error;
          foundStore = data;
        } else if (searchValue) {
          // Jika halaman dibuka dari riwayat pengecekan
          if (searchType === "whatsapp") {
            const nomor = searchValue.replace(/\D/g, "");
            const nomor62 = nomor.startsWith("0")
              ? "62" + nomor.slice(1)
              : nomor.startsWith("62")
                ? nomor
                : "62" + nomor;

            const nomor0 = nomor.startsWith("62")
              ? "0" + nomor.slice(2)
              : nomor.startsWith("0")
                ? nomor
                : "0" + nomor;

            const candidates = Array.from(
              new Set([searchValue, nomor, nomor62, nomor0])
            );

            for (const candidate of candidates) {
              const { data, error } = await supabase
                .from("profil_toko")
                .select("id, nama_toko")
                .eq("nomor_telepon", candidate)
                .maybeSingle();

              if (error) throw error;

              if (data) {
                foundStore = data;
                break;
              }
            }
          } else {
            const username = searchValue
              .replace(/^@/, "")
              .toLowerCase();

            const { data, error } = await supabase
              .from("profil_toko")
              .select("id, nama_toko")
              .ilike("username_x", username)
              .maybeSingle();

            if (error) throw error;
            foundStore = data;
          }
        }

        if (!foundStore) {
          setError("Akun toko tidak ditemukan.");
          setStore(null);
          setReports([]);
          return;
        }

        setStore(foundStore);

        const { data, error: rpcError } = await supabase.rpc(
          "cek_reputasi_laporan",
          { p_penjual_id: foundStore.id }
        );

        if (rpcError) throw rpcError;

        setReports((data || []) as Report[]);
      } catch (err) {
        console.error("Gagal memuat hasil reputasi:", err);
        setError("Gagal mengambil data reputasi. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [supabase, storeId, searchType, searchValue]);

  const total = reports.length;

  const statusCount = {
    menunggu: reports.filter(
      (r) => r.status_laporan === "menunggu"
    ).length,
    ditinjau: reports.filter(
      (r) => r.status_laporan === "ditinjau"
    ).length,
    selesai: reports.filter(
      (r) => r.status_laporan === "selesai"
    ).length,
    ditolak: reports.filter(
      (r) => r.status_laporan === "ditolak"
    ).length,
  };

  function statusLabel(status: string) {
    switch (status) {
      case "menunggu":
        return "Menunggu";
      case "ditinjau":
        return "Sedang Ditinjau";
      case "selesai":
        return "Selesai Ditinjau";
      case "ditolak":
        return "Ditolak";
      default:
        return status;
    }
  }

  function statusStyle(status: string) {
    switch (status) {
      case "menunggu":
        return "bg-amber-50 text-amber-700";
      case "ditinjau":
        return "bg-blue-50 text-blue-700";
      case "selesai":
        return "bg-emerald-50 text-emerald-700";
      case "ditolak":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fc] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#53617e] hover:text-[#162350]"
        >
          ← Kembali ke Beranda
        </Link>

        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4f6bd8]">
            TrustX · Hasil Pemeriksaan
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#162350] sm:text-3xl">
            Hasil Cek Reputasi
          </h1>
          <p className="mt-2 text-sm text-[#647089]">
            Informasi laporan komunitas terkait akun toko.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#e3e8f2] bg-white p-10 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#e4e9f3] border-t-[#4f6bd8]" />
            <p className="text-sm text-[#647089]">
              Memuat hasil pengecekan...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-white p-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-xl bg-[#162350] px-5 py-3 text-sm font-bold text-white"
            >
              Kembali
            </Link>
          </div>
        ) : store ? (
          <>
            {/* PROFIL AKUN */}
            <section className="rounded-2xl border border-[#e3e8f2] bg-white p-5 sm:p-6">
              <p className="text-xs font-semibold text-[#7a8499]">
                Akun yang diperiksa
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-[#162350]">
                {store.nama_toko}
              </h2>
              <p className="mt-2 break-all text-sm text-[#647089]">
                {searchType === "whatsapp"
                  ? "WhatsApp: "
                  : "Username X: "}
                {searchValue}
              </p>
            </section>

            {/* TOTAL */}
            <section className="mt-4 rounded-2xl border border-[#e3e8f2] bg-white p-5 sm:p-6">
              <p className="text-sm font-medium text-[#647089]">
                Total laporan komunitas
              </p>
              <p className="mt-2 text-4xl font-extrabold text-[#162350]">
                {total}
              </p>
              <p className="mt-1 text-xs text-[#8490a5]">
                laporan ditemukan terkait akun ini
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "Menunggu",
                    value: statusCount.menunggu,
                    color: "text-amber-700 bg-amber-50",
                  },
                  {
                    label: "Ditinjau",
                    value: statusCount.ditinjau,
                    color: "text-blue-700 bg-blue-50",
                  },
                  {
                    label: "Selesai",
                    value: statusCount.selesai,
                    color: "text-emerald-700 bg-emerald-50",
                  },
                  {
                    label: "Ditolak",
                    value: statusCount.ditolak,
                    color: "text-red-700 bg-red-50",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl p-3 ${item.color}`}
                  >
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className="mt-1 text-xl font-extrabold">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* DAFTAR LAPORAN */}
            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-[#162350]">
                  Daftar Laporan
                </h3>
                <span className="text-sm text-[#647089]">
                  {total} laporan
                </span>
              </div>

              {reports.length === 0 ? (
                <div className="rounded-2xl border border-[#e3e8f2] bg-white p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl">
                    ✓
                  </div>
                  <p className="font-bold text-[#162350]">
                    Belum ada laporan
                  </p>
                  <p className="mt-1 text-sm text-[#647089]">
                    Tidak ditemukan laporan komunitas untuk akun ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <article
                      key={report.id}
                      className="rounded-2xl border border-[#e3e8f2] bg-white p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h4 className="font-bold text-[#162350]">
                          {report.judul_laporan}
                        </h4>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle(
                            report.status_laporan
                          )}`}
                        >
                          {statusLabel(report.status_laporan)}
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-[#8490a5]">
                        {new Date(
                          report.tanggal_dibuat
                        ).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* DISCLAIMER */}
            <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs leading-relaxed text-amber-800">
                <strong>Perhatian:</strong> Laporan merupakan informasi
                dari komunitas yang dapat menjadi bahan pertimbangan.
                Laporan bukan bukti mutlak bahwa suatu akun melakukan
                penipuan. Selalu lakukan verifikasi dan pertimbangan
                sebelum bertransaksi.
              </p>
            </div>

            <Link
              href="/"
              className="mt-6 flex w-full justify-center rounded-xl bg-[#162350] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#2a3c75]"
            >
              Cek Akun Lain
            </Link>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function HasilCekReputasiPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f7fc] p-10 text-center text-[#647089]">
          Memuat halaman...
        </div>
      }
    >
      <HasilContent />
    </Suspense>
  );
}
