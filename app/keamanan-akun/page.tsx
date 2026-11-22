
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ChecklistItem = "password" | "otp" | "transaksi" | "tautan";

const CHECKLIST = [
  {
    id: "password" as ChecklistItem,
    title: "Kata sandi kuat",
    description: "Saya menggunakan kata sandi yang kuat dan unik.",
  },
  {
    id: "otp" as ChecklistItem,
    title: "Perlindungan OTP",
    description: "Saya tidak membagikan kode OTP kepada siapa pun.",
  },
  {
    id: "transaksi" as ChecklistItem,
    title: "Verifikasi transaksi",
    description: "Saya memeriksa informasi sebelum melakukan transaksi.",
  },
  {
    id: "tautan" as ChecklistItem,
    title: "Waspada tautan",
    description: "Saya berhati-hati terhadap tautan mencurigakan.",
  },
];


const TIPS = [
  {
    number: "01",
    title: "Gunakan kata sandi yang kuat",
    description:
      "Gunakan kata sandi yang panjang dan unik. Hindari menggunakan kata sandi yang sama di berbagai layanan.",
    icon: "🔐",
  },
  {
    number: "02",
    title: "Jangan bagikan kode OTP",
    description:
      "Jangan memberikan kode OTP, kata sandi, atau kode pemulihan kepada orang lain, termasuk pihak yang mengaku sebagai CS.",
    icon: "🛡️",
  },
  {
    number: "03",
    title: "Periksa reputasi sebelum bertransaksi",
    description:
      "Periksa informasi akun media sosial dan nomor WhatsApp jika tersedia. Lakukan verifikasi tambahan sebelum mengirim uang.",
    icon: "🔎",
  },
  {
    number: "04",
    title: "Waspadai bukti transaksi palsu",
    description:
      "Periksa mutasi rekening atau saldo secara langsung. Jangan hanya mengandalkan tangkapan layar bukti transfer.",
    icon: "💳",
  },
  {
    number: "05",
    title: "Hindari tautan mencurigakan",
    description:
      "Jangan membuka tautan atau mengunduh berkas yang tidak dikenal. Pastikan alamat layanan yang kamu akses benar.",
    icon: "🔗",
  },
];

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "back":
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      );
    case "help":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.5 9a2.5 2.5 0 0 1 4.8 1c0 2-2.3 2-2.3 4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="M10.3 3.9 2.5 17.4a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "reset":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6" />
        </svg>
      );
    default:
      return null;
  }
}

export default function KeamananPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const checkedCount = checkedItems.length;
  const totalItems = CHECKLIST.length;
  const progress = Math.round((checkedCount / totalItems) * 100);

  const updateMessage = useCallback((count: number) => {
    if (count === CHECKLIST.length) {
      setMessage("Hebat! Semua langkah keamanan sudah kamu periksa.");
    } else if (count > 0) {
      setMessage("Bagus! Lanjutkan memeriksa langkah keamanan lainnya.");
    } else {
      setMessage("Centang setiap langkah yang sudah kamu lakukan.");
    }
  }, []);

  // Ambil akun login dan checklist milik akun tersebut
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          router.replace("/login");
          return;
        }

        const id = authData.user.id;

        const { data, error: dbError } = await supabase
          .from("checklist_keamanan")
          .select("item_selesai")
          .eq("user_id", id)
          .maybeSingle();

        if (dbError) throw dbError;

        if (!mounted) return;

        setUserId(id);

        const validItems = (data?.item_selesai ?? []).filter(
          (item: string): item is ChecklistItem =>
            CHECKLIST.some((check) => check.id === item),
        );

        setCheckedItems(validItems);
        updateMessage(validItems.length);
      } catch (err) {
        console.error("Gagal memuat checklist:", err);
        if (mounted) {
          setError("Checklist keamanan gagal dimuat. Silakan coba kembali.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [router, supabase, updateMessage]);

  // Simpan checklist ke Supabase
  async function saveChecklist(nextItems: ChecklistItem[]) {
    if (!userId) return;

    setSaving(true);
    setError("");

    const { error: saveError } = await supabase
      .from("checklist_keamanan")
      .upsert(
        {
          user_id: userId,
          item_selesai: nextItems,
          tanggal_diperbarui: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    setSaving(false);

    if (saveError) {
      console.error("Gagal menyimpan checklist:", saveError);
      setError("Checklist gagal disimpan. Silakan coba kembali.");
    }
  }

  function handleToggle(id: ChecklistItem, isChecked: boolean) {
    const nextItems = isChecked
      ? [...checkedItems.filter((item) => item !== id), id]
      : checkedItems.filter((item) => item !== id);

    setCheckedItems(nextItems);
    updateMessage(nextItems.length);
    void saveChecklist(nextItems);
  }

  function handleReset() {
    setCheckedItems([]);
    updateMessage(0);
    void saveChecklist([]);
  }

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-[#172033]">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#e8ecf4] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/buyer"
              aria-label="Kembali ke beranda"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5eaf3] text-[#162350] transition hover:bg-[#f4f6fa]"
            >
              <Icon name="back" />
            </Link>

            <Link href="/buyer" className="flex items-center gap-2.5">
              <Image
                src="/assets/images/logo-trustx.svg"
                alt="Logo TrustX"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <div className="leading-tight">
                <span className="block text-[17px] font-extrabold tracking-tight text-[#162350]">
                  TrustX
                </span>
                <span className="text-xs font-medium text-[#667089]">
                  Cek Dulu
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-semibold text-[#162350] sm:block">
              Keamanan Akun
            </span>
            <Link
              href="/bantuan"
              title="Pusat bantuan"
              aria-label="Pusat bantuan"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5eaf3] bg-white text-[#7f8fc8] transition hover:bg-[#f4f6fa]"
            >
              <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#162350] via-[#22346b] to-[#4f6bd8] px-6 py-8 text-white shadow-lg shadow-[#162350]/10 sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-10 -top-20 h-52 w-52 rounded-full border border-white/10" />

          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-100">
              <Icon name="shield" className="h-4 w-4" />
              Tips Keamanan Digital
            </span>

            <h1 className="mt-5 text-2xl font-extrabold leading-tight sm:text-4xl">
              Lindungi akun dan transaksi online kamu
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">
              Kenali risiko penipuan, jaga informasi pribadi, dan lakukan
              pemeriksaan sebelum bertransaksi.
            </p>

            <a
              href="#securityChecklist"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#4f6bd8] px-5 py-3 text-sm font-extrabold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3d59c5] hover:shadow-lg active:translate-y-0">
              Periksa Keamanan Saya
              <Icon name="arrow" className="h-4 w-4" />
            </a>
          </div>

          <div className="absolute bottom-5 right-7 hidden opacity-20 sm:block">
            <Image
              src="/assets/images/icon-gembok.svg"
              alt=""
              width={170}
              height={170}
              className="object-contain"
            />
          </div>
        </section>

        {/* TIPS KEAMANAN */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-extrabold tracking-tight text-[#162350] sm:text-2xl">
              Tips Melindungi Akun
            </h2>
            <p className="mt-1.5 text-sm text-[#667089]">
              Biasakan melakukan langkah-langkah berikut.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {TIPS.map((tip) => (
              <article
                key={tip.number}
                className="group rounded-[22px] border border-[#e5eaf3] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef2ff] text-xl">
                    {tip.icon}
                  </div>
                  <span className="rounded-lg bg-[#f4f6fa] px-2.5 py-1 text-xs font-extrabold text-[#4f6bd8]">
                    {tip.number}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-bold text-[#162350]">
                  {tip.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#667089]">
                  {tip.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* PERINGATAN */}
        <section className="rounded-[22px] border border-amber-200 bg-amber-50 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Icon name="alert" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#854d0e]">
                Tanda Aktivitas Mencurigakan
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Segera periksa akun jika kamu menemukan hal berikut.
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {[
              "Ada percobaan masuk yang tidak kamu kenali.",
              "Kamu menerima kode OTP tanpa memintanya.",
              "Ada perubahan data akun tanpa persetujuanmu.",
              "Seseorang meminta uang atau data rahasia dengan mengaku sebagai petugas TrustX.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-amber-900">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* CHECKLIST */}
        <section
          id="securityChecklist"
          className="scroll-mt-24 rounded-[26px] border border-[#e5eaf3] bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
                  <Icon name="shield" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#4f6bd8]">
                  Personal Security
                </span>
              </div>
              <h2 className="mt-3 text-xl font-extrabold text-[#162350] sm:text-2xl">
                Checklist Keamanan Akun
              </h2>
              <p className="mt-1 text-sm text-[#667089]">
                Centang kebiasaan keamanan yang sudah kamu lakukan.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-[#e3e9f8] bg-[#f6f8ff] px-3 py-1.5 text-xs font-bold text-[#4f6bd8]">
              <Icon name="shield" className="h-4 w-4" />
              Checklist pribadi
            </div>
          </div>

          {/* PROGRESS */}
          <div className="mt-7 rounded-2xl bg-[#f5f7fc] p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#162350]">
                  Progres keamanan
                </p>
                <p className="mt-1 text-xs text-[#667089]">
                  {loading
                    ? "Memuat checklist..."
                    : `${checkedCount} dari ${totalItems} langkah selesai`}
                </p>
              </div>
              <span className="text-2xl font-extrabold text-[#4f6bd8]">
                {loading ? "—" : `${progress}%`}
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e1e7f3]">
              <div
                className="h-full rounded-full bg-linear-to-r from-[#4f6bd8] to-[#22346b] transition-all duration-500"
                style={{ width: `${loading ? 0 : progress}%` }}
              />
            </div>
          </div>

          {/* CHECKBOXES */}
          <div className="mt-5 space-y-3">
            {CHECKLIST.map((item) => {
              const isChecked = checkedItems.includes(item.id);

              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition sm:p-5 ${
                    isChecked
                      ? "border-[#b9c9ff] bg-[#f5f7ff]"
                      : "border-[#e5eaf3] bg-white hover:border-[#cbd5ee] hover:bg-[#fafbfe]"
                  } ${loading || saving ? "pointer-events-none opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={loading || saving}
                    onChange={(e) => handleToggle(item.id, e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#4f6bd8]"
                  />

                  <div className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-bold ${
                        isChecked ? "text-[#4f6bd8]" : "text-[#162350]"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[#667089]">
                      {item.description}
                    </span>
                  </div>

                  {isChecked && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e0eaff] text-[#4f6bd8]">
                      <Icon name="check" className="h-4 w-4" />
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {/* STATUS */}
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
              checkedCount === totalItems
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-[#e5eaf3] bg-[#f8f9fc] text-[#667089]"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              {checkedCount === totalItems && (
                <Icon name="check" className="h-5 w-5" />
              )}
              <span>{message}</span>
            </div>
          </div>

          {/* SAVE STATUS */}
          <div className="mt-3 min-h-5 text-xs">
            {saving && (
              <p className="text-[#667089]">Menyimpan checklist...</p>
            )}
            {!saving && !error && !loading && (
              <p className="text-emerald-600">
                ✓ Checklist tersimpan pada akun kamu.
              </p>
            )}
            {error && <p className="text-red-600">{error}</p>}
          </div>

          {/* ACTION */}
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || saving || checkedCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce2ed] bg-white px-4 py-3 text-sm font-bold text-[#667089] transition hover:bg-[#f4f6fa] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="reset" className="h-4 w-4" />
              Ulangi Checklist
            </button>

            <span className="text-center text-xs text-[#8b94a8] sm:text-right">
              Checklist otomatis tersimpan
            </span>
          </div>
        </section>

        {/* CUSTOMER SERVICE */}
        <section className="flex flex-col gap-5 rounded-24px bg-linear-to-br from-[#162350] to-[#22346b] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-extrabold">
              Menemukan aktivitas mencurigakan?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              Hubungi tim bantuan jika mengalami masalah keamanan atau membutuhkan
              arahan.
            </p>
          </div>

          <Link
            href="/bantuan"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#4f6bd8] px-5 py-3 text-sm font-extrabold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3d59c5] hover:shadow-lg active:translate-y-0">
            Hubungi Customer Service
            <Icon name="help" className="h-4 w-4" />
          </Link>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-[#e5eaf3] pt-5 text-center text-xs text-[#8b94a8]">
          © 2026 TrustX. Cek Dulu Sebelum Transaksi.
        </footer>
      </main>
    </div>
  );
}
