
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Kategori =
  | "akun"
  | "laporan"
  | "klarifikasi"
  | "teknis"
  | "lainnya";

type FormBantuan = {
  nama: string;
  email: string;
  kategori: Kategori | "";
  pesan: string;
};

const FORM_AWAL: FormBantuan = {
  nama: "",
  email: "",
  kategori: "",
  pesan: "",
};

const FAQ = [
  {
    question: "Apa itu TrustX?",
    answer:
      "TrustX adalah platform untuk membantu pengguna memeriksa informasi reputasi akun dan nomor WhatsApp dalam transaksi jual beli online.",
  },
  {
    question: "Bagaimana cara melaporkan akun mencurigakan?",
    answer:
      "Isi formulir laporan dengan informasi akun, nomor WhatsApp jika tersedia, dan kronologi kejadian yang kamu alami. Ikuti petunjuk pada halaman laporan TrustX.",
  },
  {
    question: "Apakah hasil pengecekan menjamin akun aman?",
    answer:
      "Tidak. Hasil pengecekan merupakan informasi pendukung dan tidak menjamin seseorang bebas dari risiko penipuan. Selalu lakukan verifikasi tambahan sebelum bertransaksi.",
  },
  {
    question: "Bagaimana jika saya dituduh melakukan penipuan?",
    answer:
      "Kamu dapat mengajukan klarifikasi dan memberikan bukti pendukung melalui fitur sanggahan yang tersedia di TrustX.",
  },
];

const TIPS = [
  "Jangan memberikan kata sandi kepada siapa pun.",
  "Jangan membagikan kode OTP.",
  "Sertakan kronologi yang jelas jika melaporkan penipuan.",
  "Hindari mengirimkan data pribadi yang tidak diperlukan.",
];

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const props = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "back":
      return (
        <svg {...props}>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      );
    case "help":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.5 9a2.5 2.5 0 0 1 4.8 1c0 2-2.3 2-2.3 4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "mail":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...props}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "alert":
      return (
        <svg {...props}>
          <path d="M10.3 3.9 2.5 17.4a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    default:
      return null;
  }
}

export default function BantuanPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [form, setForm] = useState<FormBantuan>(FORM_AWAL);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  // Mengambil data akun untuk mengisi form otomatis
  useEffect(() => {
    let active = true;

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        setUserId(null);
        setLoadingUser(false);
        return;
      }

      setUserId(data.user.id);

      const { data: profile } = await supabase
        .from("profil_pengguna")
        .select("nama_lengkap,email")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!active) return;

      setForm((prev) => ({
        ...prev,
        nama:
          profile?.nama_lengkap ||
          data.user.user_metadata?.nama_lengkap ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          "",
        email: profile?.email || data.user.email || "",
      }));

      setLoadingUser(false);
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [supabase]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
    setMessageType("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    if (!userId) {
      setMessage("Silakan login terlebih dahulu untuk mengirim pengaduan.");
      setMessageType("error");
      return;
    }

    if (!form.nama.trim() || !form.email.trim() || !form.kategori || !form.pesan.trim()) {
      setMessage("Mohon lengkapi seluruh kolom formulir.");
      setMessageType("error");
      return;
    }

    if (form.pesan.trim().length < 10) {
      setMessage("Pesan terlalu singkat. Jelaskan kendala minimal 10 karakter.");
      setMessageType("error");
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.from("pengaduan_bantuan").insert({
        user_id: userId,
        nama: form.nama.trim(),
        email: form.email.trim(),
        kategori: form.kategori,
        pesan: form.pesan.trim(),
      });

      if (error) throw error;

      setMessage(
        "Pengaduan berhasil dikirim! Tim TrustX akan meninjau pesan kamu.",
      );
      setMessageType("success");

      setForm((prev) => ({
        ...prev,
        kategori: "",
        pesan: "",
      }));
    } catch (err) {
      console.error("Gagal mengirim pengaduan:", err);

      setMessage("Pengaduan gagal dikirim. Silakan coba kembali.");
      setMessageType("error");
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    setForm((prev) => ({
      ...prev,
      kategori: "",
      pesan: "",
    }));
    setMessage("");
    setMessageType("");
  }

  function handleBack() {
  if (!userId) {
    router.push("/");
    return;
  }

  async function redirectByRole() {
    const { data, error } = await supabase
      .from("profil_pengguna")
      .select("jenis_akun")
      .eq("id", userId)
      .single();

    if (error || !data) {
      router.push("/");
      return;
    }

    if (data.jenis_akun === "seller") {
      router.push("/seller");
    } else if (data.jenis_akun === "buyer") {
      router.push("/buyer");
    } else {
      router.push("/");
    }
  }

  redirectByRole();
}

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-[#172033]">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#e3e8f1] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/buyer" className="flex items-center gap-3">
            <Image
              src="/assets/images/logo-trustx.svg"
              alt="Logo TrustX"
              width={42}
              height={42}
              className="h-10 w-10 object-contain"
            />
            <span className="leading-tight">
              <strong className="block text-[17px] font-extrabold tracking-tight text-[#162350]">
                TrustX
              </strong>
              <small className="text-xs font-medium text-[#667089]">
                Cek Dulu
              </small>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-bold text-[#162350] sm:block">
              Pusat Bantuan
            </span>
            <button
                type="button"
                onClick={handleBack}
                aria-label="Kembali ke beranda"
                title="Kembali ke beranda"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e3e8f1] bg-white text-[#162350] transition hover:bg-[#f4f6fa]"
                >
                <Icon name="back" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#162350] via-[#22346b] to-[#4f6bd8] px-6 py-8 text-white shadow-lg shadow-[#162350]/10 sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-10 -top-20 h-52 w-52 rounded-full border border-white/10" />

          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
              <Icon name="help" className="h-4 w-4" />
              Pusat Bantuan TrustX
            </span>

            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Ada yang bisa kami bantu?
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
              Temukan jawaban atas pertanyaan kamu atau kirimkan pesan kepada tim
              bantuan TrustX jika mengalami kendala.
            </p>

            <a
              href="#formBantuan"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#162350] px-5 py-3 text-sm font-extrabold text-white shadow-lg ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#22346b] hover:shadow-xl active:translate-y-0"
            >
              Hubungi Customer Service
              <Icon name="arrow" className="h-4 w-4" />
            </a>
          </div>

          <div className="absolute bottom-4 right-5 hidden opacity-20 sm:block">
            <Icon name="help" className="h-36 w-36" />
          </div>
        </section>

        {/* FAQ */}
        <section
          className="rounded-3xl border border-[#e3e8f1] bg-white p-5 shadow-sm sm:p-7"
          aria-labelledby="faqTitle"
        >
          <div className="mb-5">
            <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#4f6bd8]">
              FAQ
            </span>
            <h2
              id="faqTitle"
              className="mt-2 text-xl font-extrabold tracking-tight text-[#162350] sm:text-2xl"
            >
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="mt-1 text-sm text-[#667089]">
              Informasi yang mungkin kamu butuhkan sebelum menghubungi kami.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ.map((item, index) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-[#e5eaf3] bg-[#fbfcfe] transition open:border-[#cbd6f5] open:bg-[#f8faff]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden sm:p-5">
                  <span className="flex items-start gap-3 text-sm font-bold leading-6 text-[#162350]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-xs font-extrabold text-[#4f6bd8]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.question}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e3e8f1] bg-white text-[#4f6bd8] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>

                <div className="px-4 pb-4 pl-14 sm:px-5 sm:pb-5 sm:pl-16">
                  <p className="text-sm leading-7 text-[#667089]">
                    {item.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* FORM BANTUAN */}
        <section
          id="formBantuan"
          className="scroll-mt-24 rounded-3xl border border-[#e3e8f1] bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f6bd8]">
              <Icon name="mail" className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#4f6bd8]">
                Customer Support
              </span>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#162350] sm:text-2xl">
                Hubungi Customer Service
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#667089]">
                Sampaikan pertanyaan, kendala, atau pengaduan melalui formulir
                berikut.
              </p>
            </div>
          </div>

          {!userId && !loadingUser && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Kamu perlu login untuk mengirim pengaduan dan menyimpan pesan
                atas akunmu.
              </p>
              <Link
                href="/login"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#162350] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#22346b]"
              >
                Masuk ke akun
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset
              disabled={sending || loadingUser}
              className="min-w-0 space-y-5 disabled:opacity-70"
            >
              <legend className="mb-5 text-sm font-bold text-[#162350]">
                Formulir Bantuan
              </legend>

              {/* NAMA */}
              <div>
                <label
                  htmlFor="nama"
                  className="mb-2 block text-sm font-bold text-[#172033]"
                >
                  Nama lengkap
                </label>
                <input
                  type="text"
                  id="nama"
                  name="nama"
                  value={form.nama}
                  onChange={handleChange}
                  autoComplete="name"
                  maxLength={100}
                  required
                  placeholder="Masukkan nama lengkap"
                  className="w-full rounded-xl border border-[#e1e6ef] bg-[#fbfcfe] px-4 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a8b8] focus:border-[#4f6bd8] focus:bg-white focus:ring-4 focus:ring-[#4f6bd8]/10"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-bold text-[#172033]"
                >
                  Alamat email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  maxLength={254}
                  required
                  placeholder="nama@email.com"
                  className="w-full rounded-xl border border-[#e1e6ef] bg-[#fbfcfe] px-4 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a8b8] focus:border-[#4f6bd8] focus:bg-white focus:ring-4 focus:ring-[#4f6bd8]/10"
                />
              </div>

              {/* KATEGORI */}
              <div>
                <label
                  htmlFor="kategori"
                  className="mb-2 block text-sm font-bold text-[#172033]"
                >
                  Kategori bantuan
                </label>
                <select
                  id="kategori"
                  name="kategori"
                  value={form.kategori}
                  onChange={handleChange}
                  required
                  className="w-full appearance-none rounded-xl border border-[#e1e6ef] bg-[#fbfcfe] px-4 py-3 text-sm text-[#172033] outline-none transition focus:border-[#4f6bd8] focus:bg-white focus:ring-4 focus:ring-[#4f6bd8]/10"
                >
                  <option value="">Pilih kategori bantuan</option>
                  <option value="akun">Masalah akun</option>
                  <option value="laporan">Laporan penipuan</option>
                  <option value="klarifikasi">Klarifikasi laporan</option>
                  <option value="teknis">Kendala teknis</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              {/* PESAN */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label
                    htmlFor="pesan"
                    className="block text-sm font-bold text-[#172033]"
                  >
                    Pesan atau kronologi
                  </label>
                  <span className="text-xs text-[#8b94a8]">
                    {form.pesan.length}/3000
                  </span>
                </div>
                <textarea
                  id="pesan"
                  name="pesan"
                  value={form.pesan}
                  onChange={handleChange}
                  rows={6}
                  maxLength={3000}
                  required
                  placeholder="Jelaskan kendala yang kamu alami secara detail..."
                  className="w-full resize-y rounded-xl border border-[#e1e6ef] bg-[#fbfcfe] px-4 py-3 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#a0a8b8] focus:border-[#4f6bd8] focus:bg-white focus:ring-4 focus:ring-[#4f6bd8]/10"
                />
              </div>
            </fieldset>

            {/* STATUS */}
            {message && (
              <div
                role="status"
                aria-live="polite"
                className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${
                  messageType === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  <Icon
                    name={messageType === "success" ? "check" : "alert"}
                    className="h-5 w-5"
                  />
                </span>
                <p>{message}</p>
              </div>
            )}

            {/* BUTTON */}
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <button
                type="submit"
                disabled={sending || loadingUser || !userId}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#162350] px-5 py-3 text-sm font-extrabold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#22346b] hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Mengirim Pengaduan...
                  </>
                ) : (
                  <>
                    Kirim Pengaduan
                    <Icon name="arrow" className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={sending}
                className="inline-flex items-center justify-center rounded-xl border border-[#dce2ed] bg-white px-5 py-3 text-sm font-bold text-[#162350] transition hover:bg-[#f4f6fa] disabled:opacity-50"
              >
                Reset Formulir
              </button>
            </div>

            {loadingUser && (
              <p className="text-xs text-[#8b94a8]">
                Memeriksa sesi akun...
              </p>
            )}
          </form>
        </section>

        {/* TIPS KEAMANAN */}
        <section className="rounded-3xl border border-[#e3e8f1] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f6bd8]">
              <Icon name="shield" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#162350] sm:text-2xl">
                Tips Sebelum Menghubungi CS
              </h2>
              <p className="mt-1 text-sm text-[#667089]">
                Jaga keamanan data pribadi kamu saat meminta bantuan.
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {TIPS.map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-3 rounded-xl bg-[#f8f9fc] p-3.5 text-sm leading-6 text-[#44506b]"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e6edff] text-[#4f6bd8]">
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                {tip}
              </li>
            ))}
          </ul>

          <Link
            href="/keamanan-akun"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce2ed] bg-white px-4 py-3 text-sm font-extrabold text-[#162350] shadow-sm transition hover:bg-[#eef2ff] hover:shadow-md"
          >
            Pelajari Keamanan Akun
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-[#e3e8f1] pt-5 text-center text-xs text-[#8b94a8]">
          © 2026 TrustX. Cek Dulu Sebelum Transaksi.
        </footer>
      </main>
    </div>
  );
}
