"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SearchType = "wa" | "x";

export default function LandingPage() {
  const router = useRouter();

  const [searchType, setSearchType] = useState<SearchType>("wa");
  const [query, setQuery] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleTabChange = (type: SearchType): void => {
    setSearchType(type);
    setQuery("");
    setError("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      setError(
        searchType === "wa"
          ? "Nomor WhatsApp tidak boleh kosong."
          : "Username X tidak boleh kosong."
      );
      return;
    }

    if (searchType === "wa" && !/^\+?[0-9\s-]{8,20}$/.test(trimmed)) {
      setError("Masukkan nomor WhatsApp yang valid.");
      return;
    }

    if (searchType === "x" && !/^@?[A-Za-z0-9_]{1,15}$/.test(trimmed)) {
      setError("Masukkan username X yang valid (maksimal 15 karakter).");
      return;
    }

    setError("");

    const cleanQuery = trimmed.replace(/^@/, "");
    router.push(
      `/cek?type=${searchType}&q=${encodeURIComponent(cleanQuery)}`
    );
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f6fa] text-[#172033]">
      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-[#e3e7f0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <Image
              src="/assets/images/logo-trustx.svg"
              alt="Logo TrustX"
              width={42}
              height={42}
              priority
            />
            <span className="flex flex-col">
              <strong className="text-xl font-extrabold tracking-tight text-[#162350]">
                TrustX
              </strong>
              <small className="text-[11px] text-[#667089]">
                Cek Dulu Sebelum Transaksi
              </small>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-8 text-sm font-semibold text-[#667089] md:flex"
            aria-label="Navigasi utama"
          >
            <a href="#beranda" aria-current="page" className="transition hover:text-[#4f6bd8]">
              Beranda
            </a>
            <a href="#fitur" className="transition hover:text-[#4f6bd8]">
              Fitur
            </a>
            <a href="#cara-kerja" className="transition hover:text-[#4f6bd8]">
              Cara Kerja
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-3 py-2 text-sm font-bold text-[#162350] transition hover:bg-[#eef1f8]"
            >
              Masuk
            </Link>
            <Link
              href="/daftar"
              className="rounded-xl bg-[#4f6bd8] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#3d58c3]"
            >
              Daftar
            </Link>
          </div>
        </div>

        <nav
          className="flex justify-center gap-7 border-t border-[#eef1f8] px-4 py-3 text-xs font-semibold text-[#667089] md:hidden"
          aria-label="Navigasi mobile"
        >
          <a href="#beranda" className="hover:text-[#4f6bd8]">Beranda</a>
          <a href="#fitur" className="hover:text-[#4f6bd8]">Fitur</a>
          <a href="#cara-kerja" className="hover:text-[#4f6bd8]">Cara Kerja</a>
        </nav>
      </header>

      {/* HERO */}
      <section
        id="beranda"
        className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 md:py-20 lg:grid-cols-2 lg:px-8 lg:py-24"
      >
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dce4ff] bg-white px-4 py-2 text-xs font-bold text-[#4f6bd8] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Platform informasi reputasi akun
          </p>

          <h1 className="max-w-2xl text-4xl leading-[1.12] font-extrabold tracking-tight text-[#162350] sm:text-5xl lg:text-6xl">
            Cek Dulu,
            <br />
            <span className="text-[#4f6bd8]">Baru Transaksi.</span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-8 text-[#667089] sm:text-base">
            Lebih waspada sebelum bertransaksi online. TrustX membantu kamu
            memeriksa informasi reputasi akun dan membaca laporan komunitas
            agar dapat mengambil keputusan dengan lebih bijak.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#cek-reputasi"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4f6bd8] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-[#3d58c3]"
            >
              Mulai Periksa <span aria-hidden="true">→</span>
            </a>
            <a
              href="#cara-kerja"
              className="inline-flex items-center justify-center rounded-xl border border-[#dce1ec] bg-white px-6 py-3.5 text-sm font-bold text-[#162350] transition hover:border-[#4f6bd8] hover:text-[#4f6bd8]"
            >
              Pelajari Cara Kerja
            </a>
          </div>

          <p className="mt-6 flex max-w-lg items-start gap-2 text-xs leading-6 text-[#667089]">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
              ✓
            </span>
            Periksa informasi terlebih dahulu dan tetap gunakan pertimbangan
            pribadi sebelum bertransaksi.
          </p>
        </div>

        {/* ILUSTRASI DASHBOARD */}
        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -left-8 top-8 h-40 w-40 rounded-full bg-[#dce4ff] blur-3xl" />
          <div className="absolute -right-5 bottom-5 h-48 w-48 rounded-full bg-[#e5eaff] blur-3xl" />

          <div className="relative rounded-[2rem] border border-white bg-white p-3 shadow-2xl shadow-[#162350]/10">
            <div className="flex items-center gap-3 rounded-2xl bg-[#f4f6fa] p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-xl font-bold text-emerald-700">
                ✓
              </span>
              <span>
                <strong className="block text-sm text-[#162350]">
                  Pemeriksaan Akun
                </strong>
                <small className="text-xs text-[#667089]">
                  Informasi tersedia
                </small>
              </span>
            </div>

            <div className="relative my-3 flex min-h-64 items-center justify-center overflow-hidden rounded-2xl bg-[#eef1f8] p-5">
              <Image
                src="/assets/images/hero-reputasi.svg"
                alt="Ilustrasi dashboard pemeriksaan akun"
                width={520}
                height={380}
                className="h-auto w-full max-w-md object-contain"
                priority
              />
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[#e3e7f0] bg-white p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-lg font-extrabold text-amber-700">
                !
              </span>
              <span>
                <strong className="block text-sm text-[#162350]">
                  Lebih Waspada
                </strong>
                <small className="text-xs text-[#667089]">
                  Kenali risiko transaksi
                </small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FORM CEK REPUTASI */}
      <section id="cek-reputasi" className="scroll-mt-28 px-5 pb-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#e3e7f0] bg-white p-6 shadow-xl shadow-[#162350]/5 sm:p-9">
          <div className="text-center">
            <span className="text-xs font-extrabold tracking-[0.2em] text-[#4f6bd8]">
              MULAI PEMERIKSAAN
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-[#162350] sm:text-3xl">
              Cek Reputasi Akun
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#667089]">
              Masukkan nomor WhatsApp atau username X yang ingin kamu periksa.
            </p>
          </div>

          <div className="mx-auto mt-7 grid max-w-md grid-cols-2 rounded-xl bg-[#eef1f8] p-1">
            <button
              type="button"
              aria-pressed={searchType === "wa"}
              onClick={() => handleTabChange("wa")}
              className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                searchType === "wa"
                  ? "bg-white text-[#162350] shadow-sm"
                  : "text-[#667089] hover:text-[#162350]"
              }`}
            >
              Nomor WA
            </button>
            <button
              type="button"
              aria-pressed={searchType === "x"}
              onClick={() => handleTabChange("x")}
              className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                searchType === "x"
                  ? "bg-white text-[#162350] shadow-sm"
                  : "text-[#667089] hover:text-[#162350]"
              }`}
            >
              Username X
            </button>
          </div>

          <form className="mx-auto mt-5 max-w-xl" onSubmit={handleSubmit} noValidate>
            <label htmlFor="account-query" className="sr-only">
              {searchType === "wa" ? "Nomor WhatsApp" : "Username X"}
            </label>
            <input
              id="account-query"
              name="account"
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (error) setError("");
              }}
              placeholder={
                searchType === "wa"
                  ? "Masukkan nomor WhatsApp"
                  : "Masukkan username X (contoh: @username)"
              }
              autoComplete="off"
              aria-describedby={error ? "search-error" : undefined}
              className="w-full rounded-xl border border-[#dce1ec] bg-white px-4 py-4 text-sm text-[#172033] outline-none transition placeholder:text-[#9aa3b5] focus:border-[#4f6bd8] focus:ring-4 focus:ring-[#4f6bd8]/10"
            />

            {error && (
              <p id="search-error" role="alert" className="mt-2 text-xs font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-[#4f6bd8] px-6 py-4 text-sm font-extrabold tracking-wide text-white transition hover:bg-[#3d58c3] focus:outline-none focus:ring-4 focus:ring-[#4f6bd8]/20"
            >
              CEK REPUTASI
            </button>
          </form>
        </div>
      </section>

      {/* RINGKASAN MANFAAT */}
      <section
        aria-label="Manfaat menggunakan TrustX"
        className="mx-auto grid max-w-7xl gap-4 px-5 pb-16 sm:grid-cols-3 lg:px-8"
      >
        {[
          ["01", "Periksa informasi akun"],
          ["02", "Baca laporan komunitas"],
          ["03", "Ambil keputusan lebih bijak"],
        ].map(([number, label]) => (
          <div
            key={number}
            className="flex items-center gap-4 rounded-2xl border border-[#e3e7f0] bg-white p-5"
          >
            <span className="text-2xl font-extrabold text-[#4f6bd8]">
              {number}
            </span>
            <p className="text-sm font-bold text-[#162350]">{label}</p>
          </div>
        ))}
      </section>

      {/* FITUR UTAMA */}
      <section id="fitur" className="scroll-mt-24 bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="mb-4 inline-block rounded-full bg-blue-50 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-blue-600">
              Fitur Utama
            </span>
            <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-[#162350] sm:text-3xl md:text-4xl">
              Lebih Kenal Sebelum Percaya
            </h2>
            <p className="text-sm leading-7 text-[#667089]">
              TrustX menyediakan fitur untuk membantu pengguna mendapatkan
              informasi sebelum melakukan transaksi dengan akun yang belum dikenal.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "⌕",
                number: "FITUR 01",
                title: "Cek Reputasi Akun",
                description:
                  "Periksa informasi akun untuk mengetahui apakah terdapat data atau laporan komunitas yang relevan.",
              },
              {
                icon: "≡",
                number: "FITUR 02",
                title: "Laporan Komunitas",
                description:
                  "Baca laporan yang dibagikan pengguna sebagai bahan pertimbangan sebelum melakukan transaksi.",
              },
              {
                icon: "⚖",
                number: "FITUR 03",
                title: "Klarifikasi Penjual",
                description:
                  "Penjual dapat mengajukan klarifikasi dan menyertakan bukti untuk membantu proses peninjauan laporan terhadap akunnya.",
              },
            ].map((feature) => (
              <article
                key={feature.number}
                className="group rounded-2xl border border-[#e3e7f0] bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl font-bold text-[#4f6bd8] transition group-hover:bg-[#4f6bd8] group-hover:text-white">
                  {feature.icon}
                </div>
                <span className="mb-3 block text-[10px] font-extrabold tracking-widest text-[#4f6bd8]">
                  {feature.number}
                </span>
                <h3 className="mb-3 text-lg font-extrabold text-[#162350]">
                  {feature.title}
                </h3>
                <p className="text-xs leading-7 text-[#667089]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-8 flex max-w-4xl items-start gap-3 rounded-xl border border-[#e3e7f0] bg-[#eef1f8] p-5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-[#4f6bd8]">
              !
            </span>
            <p className="text-[11px] leading-6 text-[#667089]">
              Informasi dan laporan komunitas merupakan bahan pertimbangan,
              bukan jaminan bahwa suatu akun aman atau terbukti melakukan
              pelanggaran. Periksa bukti dan konteks sebelum mengambil keputusan.
            </p>
          </div>
        </div>
      </section>

      {/* CARA KERJA */}
      <section id="cara-kerja" className="scroll-mt-24 bg-[#f4f6fa] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="mb-4 inline-block rounded-full bg-blue-50 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-blue-600">
              Cara Kerja
            </span>
            <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-[#162350] sm:text-3xl md:text-4xl">
              Tiga Langkah Menggunakan TrustX
            </h2>
            <p className="text-sm leading-7 text-[#667089]">
              Mulai dengan memeriksa informasi, meninjau hasil, lalu menentukan
              langkah berikutnya secara bijak.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                number: "1",
                title: "Masukkan Informasi Akun",
                description:
                  "Cari akun atau username yang ingin kamu periksa melalui fitur yang tersedia.",
              },
              {
                number: "2",
                title: "Tinjau Hasil Pemeriksaan",
                description:
                  "Baca informasi akun dan laporan komunitas yang tersedia dengan memperhatikan konteksnya.",
              },
              {
                number: "3",
                title: "Ambil Keputusan",
                description:
                  "Pertimbangkan informasi yang ditemukan sebelum melanjutkan transaksi online.",
              },
            ].map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-[#e3e7f0] bg-white p-7 transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#162350] text-lg font-extrabold text-white shadow-lg">
                  {step.number}
                </div>
                <h3 className="mb-3 text-base font-extrabold text-[#162350]">
                  {step.title}
                </h3>
                <p className="text-xs leading-7 text-[#667089]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#162350] px-5 py-8 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <div>
            <strong className="text-lg font-extrabold">TrustX</strong>
            <p className="mt-1 text-xs text-white/65">
              Cek Dulu Sebelum Transaksi.
            </p>
          </div>
          <p className="text-xs text-white/65">
            © 2026 TrustX. Informasi untuk membantu keputusan transaksi yang lebih bijak.
          </p>
        </div>
      </footer>
    </main>
  );
}
