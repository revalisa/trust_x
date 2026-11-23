
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Suspense } from "react";

type ProfilToko = {
  nama_toko: string | null;
};

type Laporan = {
  id: string;
  judul_laporan: string;
  status_laporan: string;
};

const BUCKET_NAME = "bukti-sanggahan";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 3;

const alasanOptions = [
  { value: "informasi-tidak-sesuai", label: "Informasi laporan tidak sesuai" },
  { value: "bukti-tambahan", label: "Memiliki bukti tambahan" },
  { value: "masalah-sudah-selesai", label: "Masalah telah diselesaikan" },
  { value: "kesalahan-identitas", label: "Kesalahan identitas akun" },
  { value: "lainnya", label: "Alasan lainnya" },
];

export default function SanggahanSellerPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const laporanParam = searchParams.get("laporan") || "";

  const [userId, setUserId] = useState("");
  const [namaToko, setNamaToko] = useState("");
  const [laporanId, setLaporanId] = useState(laporanParam);
  const [laporan, setLaporan] = useState<Laporan | null>(null);
  const [alasan, setAlasan] = useState("");
  const [kronologi, setKronologi] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          router.replace("/login");
          return;
        }

        const currentUserId = authData.user.id;

        const { data: profil, error: profilError } = await supabase
          .from("profil_pengguna")
          .select("id, jenis_akun")
          .eq("id", currentUserId)
          .maybeSingle();

        if (profilError) throw profilError;

        if (!profil || profil.jenis_akun !== "seller") {
          router.replace("/login");
          return;
        }

        const { data: toko, error: tokoError } = await supabase
          .from("profil_toko")
          .select("nama_toko")
          .eq("id", currentUserId)
          .maybeSingle();

        if (tokoError) throw tokoError;

        if (cancelled) return;

        setUserId(currentUserId);
        setNamaToko((toko as ProfilToko | null)?.nama_toko || "");

        // Ambil detail laporan jika ID laporan tersedia di URL
        if (laporanParam) {
          const { data: dataLaporan, error: laporanError } = await supabase
            .from("laporan")
              .select("id, judul_laporan, status_laporan")
              .eq("id", laporanParam)
              .eq("penjual_id", currentUserId)
              .maybeSingle();

          if (laporanError) throw laporanError;

          if (!dataLaporan) {
            setError("Laporan tidak ditemukan atau bukan laporan toko kamu.");
          } else if (!cancelled) {
            setLaporan(dataLaporan as Laporan);
            setLaporanId(dataLaporan.id);
          }
        }
      } catch (err) {
        console.error("GAGAL MEMUAT FORM SANGGAHAN:", err);
        if (!cancelled) {
          setError("Gagal memuat data. Silakan refresh halaman.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
 }, [supabase, router, laporanParam]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError("");
    const selected = Array.from(e.target.files || []);

    if (selected.length > MAX_FILES) {
      setError("Maksimal 3 file bukti.");
      e.target.value = "";
      setFiles([]);
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg"];

    for (const file of selected) {
      if (!allowedTypes.includes(file.type)) {
        setError(`File "${file.name}" harus berupa PNG atau JPG.`);
        e.target.value = "";
        setFiles([]);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" melebihi batas 5 MB.`);
        e.target.value = "";
        setFiles([]);
        return;
      }
    }

    setFiles(selected);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      setError("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }

    if (!laporanId.trim()) {
      setError("ID laporan wajib diisi.");
      return;
    }

    if (!alasan) {
      setError("Silakan pilih alasan sanggahan.");
      return;
    }

    if (!kronologi.trim()) {
      setError("Kronologi sanggahan wajib diisi.");
      return;
    }

    if (kronologi.trim().split(/\s+/).length > 500) {
      setError("Kronologi maksimal 500 kata.");
      return;
    }

    if (files.length < 1 || files.length > MAX_FILES) {
      setError("Unggah minimal 1 dan maksimal 3 file bukti.");
      return;
    }

    setSubmitting(true);

    try {
      // Pastikan laporan benar-benar milik seller yang sedang login
      const { data: validLaporan, error: validasiError } = await supabase
        .from("laporan")
        .select("id, penjual_id")
        .eq("id", laporanId)
        .eq("penjual_id", userId)
        .maybeSingle();

      if (validasiError) throw validasiError;

      if (!validLaporan) {
        throw new Error("Laporan tidak ditemukan atau bukan laporan toko kamu.");
      }

      // Simpan sanggahan
      const kronologiLengkap = `Alasan sanggahan: ${
        alasanOptions.find((item) => item.value === alasan)?.label || alasan
      }\n\nKronologi:\n${kronologi.trim()}`;

      const { data: sanggahanData, error: sanggahanError } = await supabase
        .from("sanggahan")
        .insert({
          laporan_id: laporanId,
          penjual_id: userId,
          kronologi_sanggahan: kronologiLengkap,
          status_sanggahan: "diajukan",
        })
        .select("id")
        .single();

      if (sanggahanError) throw sanggahanError;

      const sanggahanId = sanggahanData.id;
      const uploadedPaths: string[] = [];
      const buktiRecords: {
        sanggahan_id: string;
        lokasi_file: string;
        nama_file: string;
      }[] = [];

      // Upload file bukti ke Storage
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${userId}/${sanggahanId}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        uploadedPaths.push(filePath);

        buktiRecords.push({
          sanggahan_id: sanggahanId,
          lokasi_file: filePath,
          nama_file: file.name,
        });
      }

      // Simpan metadata bukti ke tabel bukti_sanggahan
      const { error: buktiError } = await supabase
        .from("bukti_sanggahan")
      .insert(buktiRecords);

      if (buktiError) {
        // Hapus file yang sudah terunggah jika penyimpanan metadata gagal
        await supabase.storage.from(BUCKET_NAME).remove(uploadedPaths);
        throw buktiError;
      }

      setSuccess("Sanggahan berhasil dikirim. Terima kasih!");
      setAlasan("");
      setKronologi("");
      setFiles([]);

      const fileInput = document.getElementById(
        "appealFiles"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";

      window.setTimeout(() => {
        router.push("/seller/laporan");
      }, 1500);
    } catch (err: unknown) {
      console.error("GAGAL MENYIMPAN SANGGAHAN:", err);

      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui.";

      setError(
        message.includes("Bucket not found")
          ? `Bucket Storage "${BUCKET_NAME}" belum tersedia. Buat bucket tersebut di Supabase Storage.`
          : `Sanggahan gagal dikirim. ${message}`
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6fa] px-4 py-10">
        <div className="mx-auto max-w-3xl animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-gray-200" />
          <div className="h-5 w-72 rounded-lg bg-gray-200" />
          <div className="h-96 rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6fa] pb-10 text-[#172033]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#e3e7f0] bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/seller"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[#eef2ff]">
              <Image
                src="/assets/images/logo-trustx.svg"
                alt="Logo TrustX"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />
            </div>
            <div>
              <p className="text-base font-extrabold text-[#162350]">
                TrustX
              </p>
              <p className="text-xs text-[#667089]">Seller Workspace</p>
            </div>
          </Link>

          <Link
            href="/seller/laporan"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e3e7f0] bg-white px-4 py-2 text-sm font-semibold text-[#4f6bd8] transition hover:bg-[#eef2ff]"
          >
            <span aria-hidden="true">←</span>
            Kembali
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
        {/* Intro */}
        <div className="mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-[#162350] via-[#22346b] to-[#4f6bd8] p-6 text-white sm:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
            <span>🛡️</span>
            Hak Klarifikasi Penjual
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Form Klarifikasi Penjual
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Sampaikan penjelasan kamu terkait laporan yang diterima.
            Sertakan kronologi dan bukti pendukung agar proses peninjauan
            berjalan lebih jelas dan adil.
          </p>
        </div>

        {/* Info toko & laporan */}
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#e3e7f0] bg-white p-4">
            <p className="text-xs font-medium text-[#667089]">Nama Toko</p>
            <p className="mt-1 font-bold text-[#162350]">
              {namaToko || "Nama toko belum tersedia"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e7f0] bg-white p-4">
            <p className="text-xs font-medium text-[#667089]">ID Laporan</p>
            <p className="mt-1 break-all font-bold text-[#162350]">
              {laporanId || "Belum dipilih"}
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-8"
        >
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-[#162350]">
                Informasi Sanggahan
              </h2>
              <p className="mt-1 text-sm text-[#667089]">
                Lengkapi seluruh informasi yang dibutuhkan.
              </p>
            </div>

            {/* ID Laporan */}
            <label
              htmlFor="reportId"
              className="mb-2 block text-sm font-bold text-[#172033]"
            >
              ID Laporan <span className="text-red-500">*</span>
            </label>

            <input
              id="reportId"
              name="report_id"
              type="text"
              value={laporanId}
              onChange={(e) => {
                setLaporanId(e.target.value);
                setLaporan(null);
              }}
              maxLength={40}
              required
              readOnly={!!laporanParam}
              placeholder="Masukkan ID laporan"
              className="mb-2 w-full rounded-xl border border-[#e3e7f0] bg-[#f8faff] px-4 py-3 text-sm outline-none transition focus:border-[#4f6bd8] focus:ring-4 focus:ring-[#4f6bd8]/10 read-only:cursor-not-allowed read-only:bg-gray-100"
            />

            {laporan && (
              <div className="mb-5 rounded-xl bg-[#eef2ff] p-3 text-sm text-[#344779]">
                <p className="font-bold">{laporan.judul_laporan}</p>
                <p className="mt-1 text-xs">
                  Status laporan: {laporan.status_laporan}
                </p>
              </div>
            )}

            {!laporanParam && (
              <p className="mb-5 text-xs text-[#667089]">
                Masukkan ID laporan yang ingin kamu klarifikasi.
              </p>
            )}

            {/* Nama Toko */}
            <label
              htmlFor="storeName"
              className="mb-2 block text-sm font-bold text-[#172033]"
            >
              Nama Toko
            </label>

            <input
              id="storeName"
              name="store_name"
              type="text"
              value={namaToko}
              readOnly
              maxLength={150}
              className="mb-5 w-full rounded-xl border border-[#e3e7f0] bg-gray-100 px-4 py-3 text-sm text-[#667089] outline-none"
            />

            {/* Alasan */}
            <label
              htmlFor="appealReason"
              className="mb-2 block text-sm font-bold text-[#172033]"
            >
              Alasan Sanggahan <span className="text-red-500">*</span>
            </label>

            <select
              id="appealReason"
              name="reason"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              required
              className="mb-5 w-full rounded-xl border border-[#e3e7f0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#4f6bd8] focus:ring-4 focus:ring-[#4f6bd8]/10"
            >
              <option value="">Pilih alasan sanggahan</option>
              {alasanOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* Kronologi */}
            <label
              htmlFor="appealStory"
              className="mb-2 block text-sm font-bold text-[#172033]"
            >
              Kronologi Sanggahan <span className="text-red-500">*</span>
            </label>

            <textarea
              id="appealStory"
              name="story"
              rows={6}
              maxLength={3000}
              required
              value={kronologi}
              onChange={(e) => setKronologi(e.target.value)}
              placeholder="Jelaskan kronologi kejadian, alasan kamu mengajukan sanggahan, dan informasi yang dapat membantu proses peninjauan..."
              className="w-full resize-y rounded-xl border border-[#e3e7f0] px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#4f6bd8] focus:ring-4 focus:ring-[#4f6bd8]/10"
            />

            <div className="mt-2 flex justify-between text-xs text-[#667089]">
              <span>Maksimal 500 kata</span>
              <span>{kronologi.length}/3000 karakter</span>
            </div>
          </div>

          {/* Upload bukti */}
          <div className="border-t border-[#e3e7f0] pt-5">
            <label
              htmlFor="appealFiles"
              className="mb-2 block text-sm font-bold text-[#172033]"
            >
              Bukti Pendukung <span className="text-red-500">*</span>
            </label>

            <div className="rounded-2xl border-2 border-dashed border-[#cbd5ee] bg-[#f8faff] p-5 transition hover:border-[#4f6bd8] sm:p-6">
              <input
                id="appealFiles"
                name="evidence"
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                multiple
                required
                onChange={handleFileChange}
                className="block w-full text-sm text-[#667089] file:mr-3 file:rounded-xl file:border-0 file:bg-[#eef2ff] file:px-4 file:py-2.5 file:font-bold file:text-[#4f6bd8] hover:file:bg-[#dfe7ff]"
              />

              <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#667089]">
                <span>ℹ️</span>
                <span>
                  Unggah 1–3 file PNG/JPG/JPEG. Maksimal 5 MB
                  untuk setiap file.
                </span>
              </div>
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#e3e7f0] bg-white p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#162350]">
                        {file.name}
                      </p>
                      <p className="text-xs text-[#667089]">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = files.filter((_, i) => i !== index);
                        setFiles(newFiles);
                        const input = document.getElementById(
                          "appealFiles"
                        ) as HTMLInputElement | null;
                        if (input) input.value = "";
                      }}
                      className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Consent */}
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e3e7f0] bg-[#f8faff] p-4">
            <input
              id="appealConsent"
              name="consent"
              type="checkbox"
              value="yes"
              required
              className="mt-1 h-4 w-4 accent-[#4f6bd8]"
            />
            <span className="text-sm leading-6 text-[#46516a]">
              Saya menyatakan bahwa seluruh informasi dan bukti yang
              diberikan dalam pengajuan sanggahan ini benar dan dapat
              dipertanggungjawabkan.
            </span>
          </label>

          {/* Feedback */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="font-bold">Sanggahan gagal dikirim</p>
              <p className="mt-1 wrap-break-word">{error}</p>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700"
            >
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-[#e3e7f0] pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/seller/laporan"
              className="inline-flex items-center justify-center rounded-xl border border-[#e3e7f0] bg-white px-5 py-3 text-sm font-bold text-[#667089] transition hover:bg-gray-50"
            >
              Batal
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4f6bd8] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#4f6bd8]/20 transition hover:bg-[#3e58bc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Mengirim Sanggahan...
                </>
              ) : (
                "Kirim Sanggahan"
              )}
            </button>
          </div>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-[#667089]">
          Pengajuan sanggahan akan ditinjau oleh tim TrustX. Pastikan
          bukti yang dilampirkan relevan dengan laporan.
        </p>
      </div>
    </main>
  );
}
