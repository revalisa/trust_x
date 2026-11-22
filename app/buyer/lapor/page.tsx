"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type JenisLaporan = "scam" | "aman";

type ProfilToko = {
  id: string;
  nama_lengkap: string | null;
  nama_toko: string | null;
  nomor_telepon: string | null;
  email: string | null;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 3;
const MAX_WORDS = 500;
const STORAGE_BUCKET = "bukti-laporan";
const ALLOWED_TYPES = ["image/png", "image/jpeg"];

export default function BuyerLaporPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [target, setTarget] = useState<ProfilToko | null>(null);
  const [jenis, setJenis] = useState<JenisLaporan>("scam");
  const [kronologi, setKronologi] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [setuju, setSetuju] = useState(false);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [errorUsername, setErrorUsername] = useState("");
  const [errorKronologi, setErrorKronologi] = useState("");
  const [errorFiles, setErrorFiles] = useState("");
  const [errorSetuju, setErrorSetuju] = useState("");

  // =========================================
  // AUTH
  // =========================================
  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (!mounted) return;

        if (authError || !data.user) {
          router.replace("/login");
          return;
        }

        setUserId(data.user.id);
      } catch (err) {
        console.error("AUTH CHECK ERROR:", err);

        if (mounted) router.replace("/login");
      } finally {
        if (mounted) setLoadingUser(false);
      }
    };

    void checkUser();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  // =========================================
  // CARI TOKO
  // =========================================
  const cariTarget = async () => {
    setError("");
    setSuccess("");
    setErrorUsername("");
    setTarget(null);

    const namaToko = username.trim().replace(/^@+/, "");

    if (!namaToko) {
      setErrorUsername("Username toko wajib diisi.");
      return;
    }

    if (!userId) {
      setErrorUsername("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    setLoadingTarget(true);

    try {
      const { data, error: queryError } = await supabase
        .from("profil_toko")
        .select("id, nama_lengkap, nama_toko, nomor_telepon, email")
        .eq("nama_toko", namaToko)
        .maybeSingle();

      if (queryError) {
        setErrorUsername(`Gagal mencari toko: ${queryError.message}`);
        return;
      }

      if (!data) {
        setErrorUsername(`Username toko "@${namaToko}" tidak ditemukan.`);
        return;
      }

      if (data.id === userId) {
        setErrorUsername("Kamu tidak dapat melaporkan toko milik sendiri.");
        return;
      }

      setTarget(data as ProfilToko);
      setUsername(namaToko);
    } catch (err) {
      console.error("CARI TOKO ERROR:", err);
      setErrorUsername("Terjadi kesalahan saat mencari username toko.");
    } finally {
      setLoadingTarget(false);
    }
  };

  // =========================================
  // KRONOLOGI
  // =========================================
  const handleKronologi = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const words = value.trim() ? value.trim().split(/\s+/) : [];

    if (words.length > MAX_WORDS) {
      setKronologi(words.slice(0, MAX_WORDS).join(" "));
    } else {
      setKronologi(value);
    }

    setErrorKronologi("");
  };

  const jumlahKata = kronologi.trim()
    ? kronologi.trim().split(/\s+/).length
    : 0;

  // =========================================
  // VALIDASI FILE GAMBAR
  // =========================================
  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";

    setErrorFiles("");

    if (selected.length === 0) return;

    const gabungan = [...files, ...selected];

    if (gabungan.length > MAX_FILES) {
      setErrorFiles(`Maksimal hanya ${MAX_FILES} gambar bukti.`);
      return;
    }

    for (const file of selected) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErrorFiles(`${file.name}: file hanya boleh berupa PNG atau JPG.`);
        return;
      }

      if (file.size === 0) {
        setErrorFiles(`${file.name}: file kosong.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrorFiles(`${file.name} melebihi ukuran maksimal 5 MB.`);
        return;
      }
    }

    setFiles(gabungan);
  };

  const hapusFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setErrorFiles("");
  };

  // =========================================
  // SUBMIT LAPORAN
  // =========================================
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submitting) return;

    setError("");
    setSuccess("");
    setErrorUsername("");
    setErrorKronologi("");
    setErrorFiles("");
    setErrorSetuju("");

    let valid = true;

    if (!target) {
      setErrorUsername("Cari username toko terlebih dahulu.");
      valid = false;
    }

    if (!kronologi.trim()) {
      setErrorKronologi("Kronologi transaksi wajib diisi.");
      valid = false;
    } else if (jumlahKata > MAX_WORDS) {
      setErrorKronologi(`Kronologi maksimal ${MAX_WORDS} kata.`);
      valid = false;
    }

    if (files.length === 0) {
      setErrorFiles("Minimal unggah 1 gambar bukti pendukung.");
      valid = false;
    }

    if (files.length > MAX_FILES) {
      setErrorFiles(`Maksimal hanya ${MAX_FILES} gambar bukti.`);
      valid = false;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErrorFiles(`${file.name}: format gambar tidak valid.`);
        valid = false;
        break;
      }

      if (file.size === 0) {
        setErrorFiles(`${file.name}: file kosong.`);
        valid = false;
        break;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrorFiles(`${file.name} melebihi ukuran maksimal 5 MB.`);
        valid = false;
        break;
      }
    }

    if (!setuju) {
      setErrorSetuju("Kamu harus menyetujui pernyataan kebenaran data.");
      valid = false;
    }

    if (!valid || !target || !userId) return;

    setSubmitting(true);

    // ID laporan yang berhasil disimpan
    let laporanId = "";

    // File yang berhasil upload, untuk cleanup jika diperlukan
    const uploadedPaths: string[] = [];

    try {
      // =================================
      // 1. VALIDASI SESSION
      // =================================
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      const session = sessionData.session;
      const user = userData.user;

      if (sessionError || userError || !session || !user) {
        throw new Error("Session tidak valid. Silakan login ulang.");
      }

      if (!session.access_token) {
        throw new Error("Access token tidak ditemukan. Silakan login ulang.");
      }

      if (session.user.id !== user.id || user.id !== userId) {
        throw new Error("ID user tidak cocok dengan session login.");
      }

      // =================================
      // 2. VALIDASI ULANG TOKO
      // =================================
      const { data: tokoValid, error: tokoError } = await supabase
        .from("profil_toko")
        .select("id, nama_lengkap, nama_toko, nomor_telepon, email")
        .eq("id", target.id)
        .eq("nama_toko", target.nama_toko)
        .maybeSingle();

      if (tokoError) {
        throw new Error("Gagal memverifikasi akun toko. Silakan cari ulang.");
      }

      if (!tokoValid) {
        throw new Error("Akun toko tidak ditemukan. Silakan cari ulang.");
      }

      if (tokoValid.id === user.id) {
        throw new Error("Kamu tidak dapat melaporkan toko milik sendiri.");
      }

      // =================================
      // 3. INSERT LAPORAN
      // =================================
      const namaToko = tokoValid.nama_toko || "Toko";

      const judul =
        jenis === "scam"
          ? `Laporan dugaan penipuan - @${namaToko}`
          : `Rekomendasi transaksi aman - @${namaToko}`;

      const payloadLaporan = {
        pembeli_id: user.id,
        penjual_id: tokoValid.id,
        judul_laporan: judul,
        kronologi: kronologi.trim(),
        jenis_laporan: jenis,
        status_laporan: "menunggu",
      };

      const {
        data: laporanBaru,
        error: laporanError,
      } = await supabase
        .from("laporan")
        .insert(payloadLaporan)
        .select("id")
        .single();

      if (laporanError) {
        console.error("INSERT LAPORAN ERROR:", laporanError);

        if (laporanError.code === "42501") {
          throw new Error(
            "Database menolak laporan karena kebijakan keamanan RLS."
          );
        }

        throw new Error(`Gagal menyimpan laporan: ${laporanError.message}`);
      }

      if (!laporanBaru?.id) {
        throw new Error("Database tidak mengembalikan ID laporan.");
      }

      laporanId = laporanBaru.id;
      // =================================
      // 4. UPLOAD GAMBAR KE STORAGE
      // =================================
      const metadataBukti: {
        laporan_id: string;
        file_path: string;
        file_name: string;
      }[] = [];

      for (const file of files) {
        const extension = file.type === "image/png" ? "png" : "jpg";

        const filePath = `${user.id}/${laporanId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("UPLOAD BUKTI ERROR:", uploadError);
          throw new Error(
            `Laporan sudah tersimpan, tetapi gambar "${file.name}" gagal diunggah: ${uploadError.message}`
          );
        }

        uploadedPaths.push(filePath);

        metadataBukti.push({
          laporan_id: laporanId,
          file_path: filePath,
          file_name: file.name,
        });
      }

      // =================================
      // 5. INSERT METADATA BUKTI
      // Sesuai tabel bukti_laporan
      // =================================
      const { error: metadataError } = await supabase
        .from("bukti_laporan")
        .insert(metadataBukti);

      if (metadataError) {
        console.error("INSERT METADATA BUKTI ERROR:", metadataError);

        throw new Error(
          `Laporan berhasil tersimpan, tetapi data gambar gagal disimpan: ${metadataError.message}`
        );
      }

      // =================================
      // 6. SUKSES
      // =================================
      setSuccess("Laporan dan gambar bukti berhasil dikirim.");

      setUsername("");
      setTarget(null);
      setJenis("scam");
      setKronologi("");
      setFiles([]);
      setSetuju(false);

      // Arahkan ke halaman laporan setelah berhasil
      router.replace("/buyer/laporan");
      router.refresh();
    } catch (submitError) {
      console.error("SUBMIT LAPORAN ERROR:", submitError);

      const pesanError =
        submitError instanceof Error
          ? submitError.message
          : "Terjadi kesalahan saat mengirim laporan.";

      // =================================
      // LAPORAN SUDAH TERSIMPAN?
      // Jangan hapus laporan yang sudah berhasil dibuat.
      // Agar user tidak kehilangan laporan/terduplikasi.
      // =================================
      if (laporanId) {
        setSuccess(
          "Laporan telah tersimpan di database, tetapi proses bukti belum lengkap."
        );

        setError(pesanError);

        // Arahkan ke daftar laporan agar tidak submit ulang
        router.replace("/buyer/laporan");
        router.refresh();
      } else {
        setError(pesanError);
      }

      // =================================
      // CLEANUP FILE STORAGE (BEST EFFORT)
      // Hanya menghapus file yang berhasil upload
      // jika laporan belum berhasil dibuat.
      // =================================
      if (!laporanId && uploadedPaths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(uploadedPaths);

        if (removeError) {
          console.error("CLEANUP STORAGE ERROR:", removeError);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================
  // LOADING
  // =========================================
  if (loadingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc] px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#dbe3ff] border-t-[#4f6bd8]" />
          <p className="font-semibold text-[#667089]">
            Memeriksa sesi akun...
          </p>
        </div>
      </main>
    );
  }

  // =========================================
  // UI
  // =========================================
  return (
    <main className="min-h-screen bg-[#f5f7fc] pb-12 text-[#172033]">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#e3e7f0] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/buyer"
            className="flex items-center gap-3"
            aria-label="Kembali ke beranda Buyer"
          >
            <Image
              src="/assets/images/logo-trustx.svg"
              alt="Logo TrustX"
              width={42}
              height={42}
              className="h-10 w-10 object-contain"
            />

            <div>
              <p className="text-[16px] font-extrabold tracking-tight text-[#162350]">
                TrustX
              </p>
              <p className="text-[11px] font-semibold text-[#667089]">
                Buyer Workspace
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/bantuan"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e3e7f0] text-[#405ec7] transition hover:bg-blue-50"
              title="Bantuan"
              aria-label="Bantuan"
            >
              ?
            </Link>

            <Link
              href="/buyer/profil"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-[#4f6bd8] to-[#162350] text-sm font-extrabold text-white shadow-sm transition hover:scale-105"
              title="Profil"
              aria-label="Profil"
            >
              B
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* TITLE */}
        <div className="mb-7">
          <Link
            href="/buyer"
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[#4f6bd8] hover:text-[#162350]"
          >
            ← Kembali ke Beranda
          </Link>

          <div className="mb-3 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4f6bd8]" />
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#4f6bd8]">
              PUSAT LAPORAN TRUSTX
            </p>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-[#162350] sm:text-4xl">
            Formulir Laporan
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667089] sm:text-base">
            Laporkan transaksi atau berikan rekomendasi akun berdasarkan
            pengalaman transaksi nyata dan bukti yang valid.
          </p>
        </div>

        {/* WARNING */}
        <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <span className="mt-0.5 text-lg">⚠</span>
          <p>
            <strong>Ketentuan laporan:</strong> Laporan palsu atau fitnah
            dapat diproses hukum. Lampirkan bukti riil dan tuliskan
            kronologi berdasarkan fakta.
          </p>
        </div>

        {/* ALERT */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium leading-6 text-green-700"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1 - IDENTITAS */}
          <section className="rounded-3xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle number="1" title="Identitas Lawan Transaksi" />

            <div className="mt-5">
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-bold text-[#172033]"
              >
                Username Toko <span className="text-red-500">*</span>
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex min-w-0 flex-1 items-center rounded-xl border border-[#e3e7f0] bg-[#f8faff] px-4 transition focus-within:border-[#4f6bd8] focus-within:ring-4 focus-within:ring-blue-100">
                  <span className="text-sm font-bold text-[#667089]">@</span>

                  <input
                    id="username"
                    name="username_toko"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.replace(/^@+/, ""));
                      setTarget(null);
                      setErrorUsername("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void cariTarget();
                      }
                    }}
                    placeholder="username_toko"
                    autoComplete="off"
                    disabled={submitting}
                    className="h-12 min-w-0 flex-1 bg-transparent pl-2 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-[#9aa3b5] disabled:opacity-60"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void cariTarget()}
                  disabled={loadingTarget || submitting || !username.trim()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#162350] px-5 text-sm font-bold text-white transition hover:bg-[#22346b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingTarget ? "Mencari..." : "Cari Akun"}
                </button>
              </div>

              {errorUsername && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {errorUsername}
                </p>
              )}

              <p className="mt-2 text-xs text-[#667089]">
                Cari menggunakan username toko, bukan nama lengkap pemilik.
              </p>
            </div>

            {/* PROFILE TARGET */}
            {target && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#dbe3ff] bg-[#f8faff]">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#4f6bd8] to-[#162350] text-xl font-extrabold text-white">
                    {(target.nama_lengkap || target.nama_toko || "T")
                      .charAt(0)
                      .toUpperCase()}

                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#16a36a] text-xs text-white">
                      ✓
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="wrap-break-word text-lg font-extrabold text-[#162350]">
                      {target.nama_lengkap || "Nama pengguna"}
                    </h3>

                    <p className="wrap-break-word text-sm font-semibold text-[#4f6bd8]">
                      @{target.nama_toko || "username_toko"}
                    </p>

                    <p className="mt-1 text-xs text-[#667089]">
                      Identitas akun ditemukan di database TrustX
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTarget(null);
                      setUsername("");
                      setErrorUsername("");
                    }}
                    disabled={submitting}
                    className="rounded-xl border border-[#dbe3ff] bg-white px-3 py-2 text-xs font-bold text-[#405ec7] hover:bg-blue-50 disabled:opacity-50"
                  >
                    Ganti akun
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 border-t border-[#dbe3ff] p-4 sm:grid-cols-2">
                  <TargetInfo label="Nama Pengguna" value={target.nama_lengkap} />
                  <TargetInfo
                    label="Username Toko"
                    value={target.nama_toko ? `@${target.nama_toko}` : null}
                  />
                  <TargetInfo label="Nomor WhatsApp" value={target.nomor_telepon} />
                  <TargetInfo label="Email" value={target.email} />
                </div>

                <div className="flex gap-3 border-t border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
                  <span className="text-lg">ⓘ</span>
                  <p>
                    <strong>Identitas terkonfirmasi.</strong> Username toko
                    berhasil dicocokkan dengan data profil. Ini bukan
                    jaminan reputasi atau keamanan transaksi.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2 - STATUS */}
          <section className="rounded-3xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle number="2" title="Status Transaksi" />

            <p className="mt-2 text-sm text-[#667089]">
              Pilih jenis laporan berdasarkan pengalaman transaksi kamu.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatusOption
                active={jenis === "scam"}
                onClick={() => setJenis("scam")}
                title="Tertipu / Scam"
                description="Transaksi bermasalah atau dugaan penipuan."
                icon="⚠️"
                color="red"
              />

              <StatusOption
                active={jenis === "aman"}
                onClick={() => setJenis("aman")}
                title="Aman / Rekomendasi"
                description="Transaksi berhasil dan pengalaman positif."
                icon="✓"
                color="green"
              />
            </div>
          </section>

          {/* SECTION 3 - KRONOLOGI */}
          <section className="rounded-3xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle number="3" title="Cerita Singkat / Kronologi" />

            <div className="mt-5">
              <label
                htmlFor="kronologi"
                className="mb-2 block text-sm font-semibold leading-6 text-[#40506d]"
              >
                Jelaskan kronologi kejadian sebenarnya, konfirmasi nomor
                resi pengiriman resmi, atau status kesepakatan secara
                faktual dan transparan.
              </label>

              <textarea
                id="kronologi"
                name="kronologi"
                value={kronologi}
                onChange={handleKronologi}
                rows={7}
                disabled={submitting}
                placeholder="Tulis kronologi secara runtut (contoh: status paket, nomor resi pengiriman, kendala operasional, dan bukti komunikasi)..."
                className="w-full resize-y rounded-2xl border border-[#e3e7f0] bg-[#f8faff] p-4 text-sm leading-6 outline-none transition placeholder:text-[#9aa3b5] focus:border-[#4f6bd8] focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
              />

              <div className="mt-3 flex flex-col gap-2 text-xs text-[#667089] sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2">
                  <span>🛡️</span>
                  Ditinjau oleh Tim Mediasi TrustX
                </span>

                <span
                  className={
                    jumlahKata >= MAX_WORDS
                      ? "font-bold text-amber-600"
                      : "font-semibold"
                  }
                >
                  {jumlahKata} / {MAX_WORDS} kata
                </span>
              </div>

              {errorKronologi && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {errorKronologi}
                </p>
              )}
            </div>
          </section>

          {/* SECTION 4 - FILE */}
          <section className="rounded-3xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle number="4" title="Upload Bukti Pendukung" />

            <p className="mt-2 text-sm leading-6 text-[#667089]">
              Screenshot percakapan, resi pengiriman, mutasi rekening,
              atau bukti penyerahan barang.
            </p>

            <label
              htmlFor="bukti"
              className={`mt-5 flex flex-col items-center rounded-2xl border-2 border-dashed border-[#cbd5ee] bg-[#f8faff] px-5 py-8 text-center transition ${
                submitting
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:border-[#4f6bd8] hover:bg-blue-50"
              }`}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9efff] text-2xl">
                ↑
              </div>

              <h3 className="text-base font-extrabold text-[#162350]">
                Pilih Gambar Bukti
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-[#667089]">
                Klik untuk memilih gambar dari perangkat kamu.
              </p>

              <span className="mt-4 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#405ec7] ring-1 ring-[#dbe3ff]">
                Maks. 3 gambar · PNG/JPG · 5 MB per gambar
              </span>

              <input
                id="bukti"
                name="bukti"
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                multiple
                onChange={handleFiles}
                disabled={submitting}
                className="sr-only"
              />
            </label>

            {errorFiles && (
              <p className="mt-3 text-sm font-medium text-red-600">
                {errorFiles}
              </p>
            )}

            {files.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-bold text-[#162350]">
                  Gambar Terlampir ({files.length}/{MAX_FILES})
                </h3>

                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center gap-3 rounded-xl border border-[#e3e7f0] bg-white p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg">
                        ▧
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#172033]">
                          {file.name}
                        </p>
                        <p className="text-xs text-[#667089]">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => hapusFile(index)}
                        disabled={submitting}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* DECLARATION */}
          <section className="rounded-3xl border border-[#e3e7f0] bg-white p-5 shadow-sm sm:p-7">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={setuju}
                onChange={(e) => {
                  setSetuju(e.target.checked);
                  setErrorSetuju("");
                }}
                disabled={submitting}
                className="mt-1 h-4 w-4 shrink-0 accent-[#4f6bd8]"
              />

              <span>
                <span className="block text-sm font-extrabold text-[#162350]">
                  Pernyataan Kebenaran Data Transaksi
                </span>

                <span className="mt-1 block text-sm leading-6 text-[#667089]">
                  Saya menyatakan dengan sungguh-sungguh bahwa data,
                  kronologi, dan dokumen yang saya kirimkan adalah asli
                  berdasarkan transaksi nyata. Saya memahami penyalahgunaan
                  dokumen palsu dapat diproses hukum.
                </span>
              </span>
            </label>

            {errorSetuju && (
              <p className="mt-3 text-sm font-medium text-red-600">
                {errorSetuju}
              </p>
            )}
          </section>

          {/* SUBMIT */}
          <div className="pb-6">
            <button
              type="submit"
              disabled={submitting || loadingUser}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-[#162350] to-[#4f6bd8] px-6 py-4 text-sm font-extrabold text-white shadow-lg shadow-blue-900/10 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Mengirim Laporan dan Bukti...
                </>
              ) : (
                <>Kirim Laporan →</>
              )}
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-[#667089]">
              Laporan akan ditinjau oleh tim TrustX. Pastikan informasi
              dan bukti sudah benar sebelum dikirim.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

// ===================================
// COMPONENTS
// ===================================
function SectionTitle({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-3 text-base font-extrabold text-[#162350] sm:text-lg">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#162350] text-sm text-white">
        {number}
      </span>
      {title}
      <span className="text-red-500">*</span>
    </h2>
  );
}

function TargetInfo({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-semibold text-[#667089]">{label}</p>
      <p className="mt-1 wrap-break-word text-sm font-bold text-[#172033]">
        {value || "Tidak tersedia"}
      </p>
    </div>
  );
}

function StatusOption({
  active,
  onClick,
  title,
  description,
  icon,
  color,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: string;
  color: "red" | "green";
}) {
  const activeStyle =
    color === "red"
      ? "border-red-300 bg-red-50 ring-4 ring-red-100"
      : "border-green-300 bg-green-50 ring-4 ring-green-100";

  const inactiveStyle =
    "border-[#e3e7f0] bg-white hover:border-[#cbd5ee] hover:bg-[#f8faff]";

  const iconStyle =
    color === "red"
      ? "bg-red-100 text-red-600"
      : "bg-green-100 text-green-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
        active ? activeStyle : inactiveStyle
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold ${iconStyle}`}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-[#172033]">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[#667089]">
          {description}
        </span>
      </span>

      <span
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          active
            ? color === "red"
              ? "border-red-500 bg-red-500 text-white"
              : "border-green-500 bg-green-500 text-white"
            : "border-[#cbd5e1] bg-white"
        }`}
      >
        {active && <span className="text-xs">✓</span>}
      </span>
    </button>
  );
}