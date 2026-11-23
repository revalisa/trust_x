
"use client";

import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProfilToko = {
  id: string;
  nama_lengkap: string;
  nama_toko: string;
  deskripsi_toko: string | null;
  nomor_telepon: string | null;
  email: string | null;
  tanggal_dibuat: string | null;
};

type FormProfil = {
  nama_lengkap: string;
  nama_toko: string;
  deskripsi_toko: string;
  nomor_telepon: string;
  email: string;
};

const FORM_KOSONG: FormProfil = {
  nama_lengkap: "",
  nama_toko: "",
  deskripsi_toko: "",
  nomor_telepon: "",
  email: "",
};

export default function ProfilPage() {
  const router = useRouter();

  const [profil, setProfil] = useState<ProfilToko | null>(null);
  const [jumlahLaporan, setJumlahLaporan] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<FormProfil>(FORM_KOSONG);

  // LOAD PROFILE
  useEffect(() => {
    let aktif = true;

    async function loadProfil() {
      const supabase = createClient();

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          if (aktif) router.replace("/");
          return;
        }

        const userId = authData.user.id;

        const [profilResult, laporanResult] = await Promise.all([
          supabase
            .from("profil_toko")
            .select(
              "id, nama_lengkap, nama_toko, deskripsi_toko, nomor_telepon, email, tanggal_dibuat"
            )
            .eq("id", userId)
            .maybeSingle(),

          supabase
            .from("laporan")
            .select("id", { count: "exact", head: true })
            .eq("penjual_id", userId),
        ]);

        if (!aktif) return;

        if (profilResult.error) {
          console.error("Error Supabase profil:", profilResult.error);
          setError(`Gagal mengambil profil toko: ${profilResult.error.message}`);
          setLoading(false);
          return;
        }

        if (!profilResult.data) {
          setError("Data profil toko belum ditemukan untuk akun ini.");
          setLoading(false);
          return;
        }

        const data = profilResult.data as ProfilToko;

        setProfil(data);
        setForm({
          nama_lengkap: data.nama_lengkap || "",
          nama_toko: data.nama_toko || "",
          deskripsi_toko: data.deskripsi_toko || "",
          nomor_telepon: data.nomor_telepon || "",
          email: data.email || "",
        });

        if (laporanResult.error) {
          console.error("Gagal mengambil laporan:", laporanResult.error);
        } else {
          setJumlahLaporan(laporanResult.count ?? 0);
        }

        setLoading(false);
      } catch (err) {
        console.error("Load profil error:", err);

        if (aktif) {
          setError("Terjadi kesalahan saat memuat profil toko.");
          setLoading(false);
        }
      }
    }

    loadProfil();

    return () => {
      aktif = false;
    };
  }, [router]);

  // FORMAT DATE
  function formatTanggal(tanggal: string | null) {
    if (!tanggal) return "-";

    const date = new Date(tanggal);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // AVATAR INITIAL
  const initial =
    profil?.nama_lengkap?.trim().charAt(0).toUpperCase() || "T";

  // INPUT HANDLER
  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // EDIT PROFILE
  function handleEdit() {
    if (!profil) return;

    setForm({
      nama_lengkap: profil.nama_lengkap || "",
      nama_toko: profil.nama_toko || "",
      deskripsi_toko: profil.deskripsi_toko || "",
      nomor_telepon: profil.nomor_telepon || "",
      email: profil.email || "",
    });

    setError("");
    setSuccess("");
    setEditing(true);
  }

  // CANCEL EDIT
  function handleCancel() {
    if (!profil) return;

    setForm({
      nama_lengkap: profil.nama_lengkap || "",
      nama_toko: profil.nama_toko || "",
      deskripsi_toko: profil.deskripsi_toko || "",
      nomor_telepon: profil.nomor_telepon || "",
      email: profil.email || "",
    });

    setEditing(false);
    setError("");
    setSuccess("");
  }

    // SAVE PROFILE
async function handleSave(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();

  if (saving || !profil) return;

  if (!form.nama_lengkap.trim()) {
    setError("Nama pemilik wajib diisi.");
    return;
  }

  if (!form.nama_toko.trim()) {
    setError("Nama toko wajib diisi.");
    return;
  }

  setSaving(true);
  setError("");
  setSuccess("");

  const supabase = createClient();

  try {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError("Sesi login berakhir. Silakan masuk kembali.");
      router.replace("/");
      return;
    }

    const userId = authData.user.id;

    if (userId !== profil.id) {
      setError("Kamu tidak memiliki akses mengubah profil ini.");
      return;
    }

    const updateData = {
      nama_lengkap: form.nama_lengkap.trim(),
      nama_toko: form.nama_toko.trim(),
      deskripsi_toko: form.deskripsi_toko.trim() || null,
      nomor_telepon: form.nomor_telepon.trim() || null,
      email: form.email.trim() || null,
    };

    const { error: updateError } = await supabase
      .from("profil_toko")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      console.error("Update profil gagal:", {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });

      setError(`Profil gagal disimpan: ${updateError.message}`);
      return;
    }

    // Update tampilan lokal setelah update database berhasil
    setProfil((prev) =>
      prev
        ? {
            ...prev,
            nama_lengkap: updateData.nama_lengkap,
            nama_toko: updateData.nama_toko,
            deskripsi_toko: updateData.deskripsi_toko,
            nomor_telepon: updateData.nomor_telepon,
            email: updateData.email,
          }
        : prev
    );

    setForm((prev) => ({
      ...prev,
      nama_lengkap: updateData.nama_lengkap,
      nama_toko: updateData.nama_toko,
      deskripsi_toko: updateData.deskripsi_toko ?? "",
      nomor_telepon: updateData.nomor_telepon ?? "",
      email: updateData.email ?? "",
    }));

    setEditing(false);
    setSuccess("Profil toko berhasil diperbarui.");
  } catch (err) {
    console.error("Save profil error:", err);
    setError("Terjadi kesalahan saat menyimpan profil.");
  } finally {
    setSaving(false);
  }
}

  // SHARE PROFILE
  async function handleShare() {
    if (!profil) return;

    setError("");
    setSuccess("");

    const profileUrl = `${window.location.origin}/seller/profile/detail-profil?id=${profil.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: profil.nama_toko,
          text: `Lihat profil toko ${profil.nama_toko} di TrustX`,
          url: profileUrl,
        });
      } else {
        await navigator.clipboard.writeText(profileUrl);
        setSuccess("Link profil toko berhasil disalin.");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      console.error("Share profil gagal:", err);
      setError("Link profil gagal dibagikan.");
    }
  }

  // LOGOUT
  async function handleLogout() {
    if (logoutLoading) return;

    setLogoutLoading(true);
    setError("");

    const supabase = createClient();

    try {
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

  // LOADING
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc] px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e1e7f5] border-t-[#4f6bd8]" />
          <p className="text-sm font-medium text-[#647089]">
            Memuat profil toko...
          </p>
        </div>
      </main>
    );
  }

  // PROFILE NOT FOUND
  if (!profil) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc] px-4">
        <section className="w-full max-w-md rounded-24px border border-[#e3e7f0] bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
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

          <h1 className="mt-4 text-lg font-extrabold text-[#162350]">
            Profil Toko Tidak Ditemukan
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#667089]">
            {error || "Profil toko gagal dimuat."}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-[#4f6bd8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#405ec7]"
          >
            Coba Lagi
          </button>

          <Link
            href="/seller"
            className="mt-3 block text-sm font-semibold text-[#4f6bd8] hover:text-[#162350]"
          >
            Kembali ke Beranda
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fc] text-[#172033]">
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
              className="inline-flex items-center gap-2 rounded-xl bg-[#eef2ff] px-4 py-2.5 text-sm font-bold text-[#4f6bd8]"
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
              {initial.slice(0, 1) || "S"}
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

      {/* PAGE CONTENT */}
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* PAGE TITLE */}
          <section className="mb-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#4f6bd8]" />
              <p className="text-xs font-bold tracking-[0.16em] text-[#4f6bd8]">
                PENGATURAN AKUN
              </p>
            </div>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#162350] sm:text-3xl">
              Profil Toko
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#667089]">
              Kelola identitas toko, informasi kontak, dan aktivitas akun
              penjualmu di TrustX.
            </p>
          </section>

          {/* ALERT */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5 shrink-0"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v6M12 16.5v.01" />
              </svg>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5 shrink-0"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
              <p>{success}</p>
            </div>
          )}

          {/* PROFILE CARD */}
          <section className="mb-6 overflow-hidden rounded-24px border border-[#e4e9f3] bg-white shadow-sm">
            {/* COVER */}
            <div className="relative h-28 overflow-hidden z-0 bg-linear-to-br from-[#162350] via-[#22346b] to-[#4f6bd8] sm:h-36">
              <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10" />
              <div className="absolute -right-5 -top-10 h-36 w-36 rounded-full border border-white/10" />
              <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-[#8ea6ff]/10 blur-2xl" />

              <div className="absolute left-5 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-wide text-white/90 backdrop-blur sm:left-7">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-3.5 w-3.5"
                >
                  <path d="M12 3 4.5 6v5c0 4.5 3 7.5 7.5 10 4.5-2.5 7.5-5.5 7.5-10V6L12 3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                SELLER WORKSPACE
              </div>
            </div>

            {/* PROFILE BODY */}
            <div className="px-5 pb-6 sm:px-7">
              <div className="-mt-10 flex flex-col gap-4 sm:-mt-11 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex min-w-0 items-end gap-3 sm:gap-4">
                  {/* AVATAR */}
                  <div className="flex h-20 w-20 shrink-0  z-20 items-center justify-center rounded-[22px] border-4 border-white bg-linear-to-br from-[#4f6bd8] to-[#162350] text-3xl font-extrabold uppercase text-white shadow-lg sm:h-24 sm:w-24 sm:rounded-[26px] sm:text-4xl">
                    {initial}
                  </div>

                  {/* STORE IDENTITY */}
                  <div className="min-w-0 pb-1">
                    <h1 className="wrap-break-word text-xl font-extrabold tracking-tight text-[#162350] sm:text-2xl">
                      {profil.nama_lengkap || "Pemilik Toko"}
                    </h1>
                    <h2 className="wrap-break-word text-xl font-extrabold tracking-tight text-[#162350] sm:text-2xl">
                      {profil.nama_toko || "Toko TrustX"}
                    </h2>
                    <p className="mt-1 break-all text-xs text-[#667089] sm:text-sm">
                      {profil.email || "Email belum ditambahkan"}
                    </p>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex flex-wrap gap-2 sm:pb-1">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e3e7f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#53617d] transition hover:border-[#cdd7f5] hover:bg-[#f5f7ff] hover:text-[#4f6bd8]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="m8.7 10.5 6.6-4M8.7 13.5l6.6 4" />
                    </svg>
                    Bagikan
                  </button>

                  {!editing && (
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4f6bd8] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#405ec7] active:scale-[0.98]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-4 w-4"
                      >
                        <path d="m15 5 4 4M4 20l4.5-1 10-10-3.5-3.5-10 10L4 20Z" />
                      </svg>
                      Edit Profil
                    </button>
                  )}
                </div>
              </div>

              {/* ACCOUNT BADGES */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dcefe4] bg-[#f0faf4] px-3 py-1.5 text-xs font-bold text-[#328454]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-3.5 w-3.5"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                  Akun Seller
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dce4ff] bg-[#f1f4ff] px-3 py-1.5 text-xs font-bold text-[#405ec7]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M3 10h18l-2-6H5l-2 6Z" />
                    <path d="M4 10v10h16V10" />
                  </svg>
                  Penjual TrustX
                </span>
              </div>
            </div>
          </section>

          {/* STORE SUMMARY */}
          <section className="mb-6 rounded-3xl border border-[#e4e9f3] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path d="M3 10h18l-2-6H5l-2 6Z" />
                  <path d="M4 10v10h16V10" />
                  <path d="M9 20v-6h6v6" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#162350]">
                  Ringkasan Aktivitas Toko
                </h2>
                <p className="mt-0.5 text-xs text-[#8992a7]">
                  Informasi singkat akun penjualmu
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {/* REPORT COUNT */}
              <article className="group rounded-2xl border border-[#e5eaf3] bg-[#f8faff] p-4 transition hover:border-[#cdd7f5] hover:bg-[#f1f4ff]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#667089]">
                    Laporan Diterima
                  </p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <path d="M5 4h14v16H5z" />
                      <path d="M8 8h8M8 12h8M8 16h5" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#162350]">
                  {jumlahLaporan}
                </p>
                <p className="mt-1 text-xs text-[#8992a7]">
                  Total laporan komunitas terhadap toko
                </p>
              </article>

              {/* JOIN DATE */}
              <article className="group rounded-2xl border border-[#e5eaf3] bg-[#f8faff] p-4 transition hover:border-[#cdd7f5] hover:bg-[#f1f4ff]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#667089]">
                    Tanggal Bergabung
                  </p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <rect x="3" y="5" width="18" height="16" rx="3" />
                      <path d="M16 3v4M8 3v4M3 10h18" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-lg font-extrabold tracking-tight text-[#162350]">
                  {formatTanggal(profil.tanggal_dibuat)}
                </p>
                <p className="mt-1 text-xs text-[#8992a7]">
                  Terdaftar sebagai seller TrustX
                </p>
              </article>
            </div>
          </section>

          {/* STORE INFORMATION */}
          <section className="mb-6 rounded-3xl border border-[#e4e9f3] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                  >
                    <path d="M3 10h18l-2-6H5l-2 6Z" />
                    <path d="M4 10v10h16V10" />
                    <path d="M9 20v-6h6v6" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#162350]">
                    Informasi Toko
                  </h2>
                  <p className="text-xs text-[#8992a7]">
                    Data identitas dan kontak toko
                  </p>
                </div>
              </div>

              {!editing && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-[#4f6bd8] transition hover:bg-[#f1f4ff]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                  >
                    <path d="m15 5 4 4M4 20l4.5-1 10-10-3.5-3.5-10 10L4 20Z" />
                  </svg>
                  Edit Informasi
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="mt-5 space-y-4">
                {/* OWNER */}
                <div>
                  <label
                    htmlFor="nama_lengkap"
                    className="mb-2 block text-sm font-bold text-[#34415f]"
                  >
                    Nama Pemilik
                  </label>
                  <input
                    id="nama_lengkap"
                    name="nama_lengkap"
                    type="text"
                    value={form.nama_lengkap}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    placeholder="Masukkan nama pemilik"
                    className="w-full rounded-xl border border-[#e3e7f0] bg-[#fbfcfe] px-4 py-3 text-sm outline-none transition placeholder:text-[#a3adbf] focus:border-[#4f6bd8] focus:bg-white focus:ring-4 focus:ring-[#4f6bd8]/10"
                  />
                </div>

                {/* STORE NAME */}
                <div>
                  <label
                    htmlFor="nama_toko"
                    className="mb-2 block text-sm font-bold text-[#34415f]"
                  >
                    Nama Toko
                  </label>
                  <input
                    id="nama_toko"
                    name="nama_toko"
                    type="text"
                    value={form.nama_toko}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    placeholder="Masukkan nama toko"
                    className="w-full rounded-xl border border-[#e3e7f0] bg-[#fbfcfe] px-4 py-3 text-sm outline-none transition placeholder:text-[#a3adbf] focus:border-[#4f6bd8] focus:bg-white focus:ring-4 focus:ring-[#4f6bd8]/10"
                  />
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label
                    htmlFor="deskripsi_toko"
                    className="mb-2 block text-sm font-bold text-[#34415f]"
                  >
                    Deskripsi Toko
                  </label>
                  <textarea
                    id="deskripsi_toko"
                    name="deskripsi_toko"
                    value={form.deskripsi_toko}
                    onChange={handleChange}
                    rows={5}
                    maxLength={1000}
                    placeholder="Ceritakan tentang toko, produk, atau layanan yang kamu jual..."
                    className="w-full resize-y rounded-xl border border-[#e3e7f0] bg-[#fbfcfe] px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-[#a3adbf] focus:border-[#4f6bd8] focus:bg-white focus:ring-4 focus:ring-[#4f6bd8]/10"
                  />
                  <p className="mt-1 text-right text-xs text-[#8b94a8]">
                    {form.deskripsi_toko.length}/1000 karakter
                  </p>
                </div>

                {/* PHONE */}
                <div>
                  <label
                    htmlFor="nomor_telepon"
                    className="mb-2 block text-sm font-bold text-[#34415f]"
                  >
                    Nomor WhatsApp
                  </label>
                  <input
                    id="nomor_telepon"
                    name="nomor_telepon"
                    type="tel"
                    value={form.nomor_telepon}
                    onChange={handleChange}
                    maxLength={20}
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-xl border border-[#e3e7f0] bg-[#fbfcfe] px-4 py-3 text-sm outline-none transition placeholder:text-[#a3adbf] focus:border-[#4f6bd8] focus:bg-white focus:ring-4 focus:ring-[#4f6bd8]/10"
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-[#34415f]"
                  >
                    Email Kontak Toko
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    maxLength={254}
                    placeholder="email@contoh.com"
                    className="w-full rounded-xl border border-[#e3e7f0] bg-[#fbfcfe] px-4 py-3 text-sm outline-none transition placeholder:text-[#a3adbf] focus:border-[#4f6bd8] focus:bg-white focus:ring-4 focus:ring-[#4f6bd8]/10"
                  />
                  <p className="mt-1.5 text-xs leading-5 text-[#8992a7]">
                    Email kontak toko. Perubahan ini tidak mengubah email login.
                  </p>
                </div>

                {/* FORM ACTION */}
                <div className="flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="rounded-xl border border-[#e3e7f0] bg-white px-5 py-3 text-sm font-bold text-[#53617d] transition hover:bg-[#f5f7fc] disabled:opacity-50"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4f6bd8] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#405ec7] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="h-4 w-4"
                        >
                          <path d="m5 12 4 4L19 6" />
                        </svg>
                        Simpan Perubahan
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoCard label="Nama Pemilik" value={profil.nama_lengkap} />
                <InfoCard label="Nama Toko" value={profil.nama_toko} />
                <InfoCard
                  label="Deskripsi Toko"
                  value={
                    profil.deskripsi_toko?.trim() ||
                    "Kamu belum menambahkan deskripsi toko."
                  }
                  multiline
                />
                <InfoCard
                  label="Nomor WhatsApp"
                  value={profil.nomor_telepon || "Belum ditambahkan"}
                />
                <InfoCard
                  label="Email Kontak Toko"
                  value={profil.email || "Belum ditambahkan"}
                />
              </div>
            )}
          </section>

          {/* ACCOUNT INFORMATION */}
          <section className="mb-6 rounded-3xl border border-[#e4e9f3] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M5 21a7 7 0 0 1 14 0" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#162350]">
                  Informasi Akun
                </h2>
                <p className="text-xs text-[#8992a7]">
                  Detail identitas akun seller
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoCard label="ID Akun Seller" value={profil.id} />
              <InfoCard
                label="Tanggal Bergabung"
                value={formatTanggal(profil.tanggal_dibuat)}
              />
              <InfoCard label="Jenis Akun" value="Seller / Penjual" />
            </div>
          </section>

          {/* ACCOUNT SETTINGS */}
          <section className="mb-6 rounded-3xl border border-[#e4e9f3] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
                  <circle cx="12" cy="12" r="5" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#162350]">
                  Pengaturan Akun
                </h2>
                <p className="text-xs text-[#8992a7]">
                  Keamanan dan bantuan akun
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              <Link
                href="/keamanan-akun"
                className="group flex items-center justify-between rounded-xl border border-[#e4e9f3] px-4 py-3.5 transition hover:border-[#cdd7f5] hover:bg-[#f5f7ff]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef2ff] text-[#4f6bd8]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <path d="M12 3 4.5 6v5c0 4.5 3 7.5 7.5 10 4.5-2.5 7.5-5.5 7.5-10V6L12 3Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </span>
                  <span className="text-sm font-bold text-[#34415f]">
                    Keamanan Akun
                  </span>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4 text-[#98a1b4] transition group-hover:translate-x-0.5 group-hover:text-[#4f6bd8]"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>

              <Link
                href="/bantuan"
                className="group flex items-center justify-between rounded-xl border border-[#e4e9f3] px-4 py-3.5 transition hover:border-[#cdd7f5] hover:bg-[#f5f7ff]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef2ff] text-[#4f6bd8]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M9.5 9a2.5 2.5 0 1 1 4.5 1.5c-1.5 1-2 1.5-2 3M12 17h.01" />
                    </svg>
                  </span>
                  <span className="text-sm font-bold text-[#34415f]">
                    Pusat Bantuan
                  </span>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4 text-[#98a1b4] transition group-hover:translate-x-0.5 group-hover:text-[#4f6bd8]"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>

              {/* LOGOUT */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutLoading}
                className="group flex w-full items-center justify-between rounded-xl border border-red-100 px-4 py-3.5 text-left transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500 transition group-hover:bg-red-100">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <path d="M10 17l5-5-5-5M15 12H3M21 3v18" />
                    </svg>
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    {logoutLoading ? "Sedang keluar..." : "Keluar dari Akun"}
                  </span>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4 text-red-300 transition group-hover:translate-x-0.5 group-hover:text-red-500"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </section>

          {/* FOOTER NOTE */}
          <div className="flex items-start justify-center gap-2 rounded-2xl border border-[#e4e9f3] bg-white/70 px-4 py-4 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#4f6bd8]"
            >
              <path d="M12 3 4.5 6v5c0 4.5 3 7.5 7.5 10 4.5-2.5 7.5-5.5 7.5-10V6L12 3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <p className="text-xs leading-5 text-[#667089]">
              Pastikan informasi toko selalu benar dan terbaru agar pembeli
              dapat mengenali toko kamu.
            </p>
          </div>
        </div>

         {/* FOOTER */}
        <footer className="mt-10 border-t border-[#e3e7f0] pt-6">
          <p className="text-center text-xs text-[#98a1b4]">
            © 2026 TrustX. Cek Dulu Sebelum Transaksi.
          </p>
        </footer>

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
                  className="flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-[#667089] transition hover:bg-[#f4f6fa]"
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
                  className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#eef2ff] px-3 py-2 text-xs font-bold text-[#4f6bd8]"
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
      </div>
    </main>
  );
};

// INFORMATION CARD
function InfoCard({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[#e7ebf3] bg-[#f8faff] p-4 transition hover:border-[#d5def7]">
      <p className="text-xs font-semibold text-[#7b879d]">{label}</p>
      <p
        className={`mt-1.5 text-sm font-bold text-[#172033] ${
          multiline ? "whitespace-pre-wrap wrap-break-word leading-6" : "break-all"
        }`}
      >
        {value || "-"}
      </p>
    </article>
  );
}