"use client";



import { useState, type FormEvent } from "react";

import Image from "next/image";

import Link from "next/link";

import { useRouter } from "next/navigation";

import CekReputasi from "@/components/CekReputasi";



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



    const normalizedPhone = trimmed.replace(/[\s-]/g, "");

    if (searchType === "wa" && !/^\+?\d{8,15}$/.test(normalizedPhone)) {

      setError("Masukkan nomor WhatsApp yang valid.");

      return;

    }



    if (searchType === "x" && !/^@?[A-Za-z0-9_]{1,15}$/.test(trimmed)) {

      setError("Masukkan username X yang valid (maksimal 15 karakter).");

      return;

    }



    setError("");



    const cleanQuery = searchType === "wa"
      ? normalizedPhone
      : trimmed.replace(/^@/, "");

    router.push(

      `/cek?type=${searchType}&q=${encodeURIComponent(cleanQuery)}`

    );

  };



  return (

    <main id="beranda" className="min-h-screen overflow-hidden bg-[#f4f6fa] text-[#172033]">

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



       <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8">

        {/* HERO */}

        <section className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#162350] via-[#22346b] to-[#3c56ad] px-6 py-8 text-white shadow-xl shadow-[#162350]/10 sm:px-10 sm:py-11 lg:px-12">

          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10" />

          <div className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 rounded-full border border-white/10" />

          <div className="pointer-events-none absolute -bottom-32 right-36 h-64 w-64 rounded-full bg-[#6c88f5]/15 blur-2xl" />

          <div className="pointer-events-none absolute bottom-10 right-10 h-24 w-24 rounded-full bg-[#8ea6ff]/10 blur-xl" />



          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">

            <div className="max-w-2xl">

              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">

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

                Ruang aman transaksi digital

              </span>



              <h2 className="mt-5 text-3xl font-extrabold leading-[1.2] tracking-tight sm:text-4xl lg:text-5xl">

                Cek Reputasi.

                <br />

                <span className="text-[#a9bcff]">Transaksi Lebih Aman.</span>

              </h2>



              <p className="mt-4 max-w-lg text-sm leading-7 text-white/75 sm:text-base">

                Pastikan reputasi akun sebelum bertransaksi. Cari informasi,

                kenali riwayat laporan, dan jadilah bagian dari komunitas

                digital yang lebih aman.

              </p>

              {/* FORM PENCARIAN REPUTASI */}
              <form
                onSubmit={handleSubmit}
                className="mt-7 max-w-xl rounded-2xl border border-white/15 bg-white/8 p-3 shadow-lg backdrop-blur-sm"
                noValidate
              >
                <div className="mb-3 flex gap-2" role="tablist" aria-label="Jenis pencarian">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={searchType === "wa"}
                    onClick={() => handleTabChange("wa")}
                    className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                      searchType === "wa"
                        ? "bg-white text-[#162350]"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={searchType === "x"}
                    onClick={() => handleTabChange("x")}
                    className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                      searchType === "x"
                        ? "bg-white text-[#162350]"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    Username X
                  </button>
                </div>

                <label htmlFor="reputation-query" className="sr-only">
                  {searchType === "wa" ? "Nomor WhatsApp" : "Username X"}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="reputation-query"
                    type="text"
                    inputMode={searchType === "wa" ? "tel" : "text"}
                    autoComplete="off"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      if (error) setError("");
                    }}
                    placeholder={
                      searchType === "wa"
                        ? "Masukkan nomor WhatsApp"
                        : "Masukkan username X"
                    }
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "search-error" : undefined}
                    className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-4 py-3 text-sm text-[#172033] outline-none placeholder:text-slate-400 focus:border-[#a9bcff] focus:ring-2 focus:ring-[#a9bcff]/40"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#7792ff] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#6682f0] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#22346b]"
                  >
                    Cek Reputasi <CekReputasi variant="compact" />
                  </button>
                </div>
                {error && (
                  <p id="search-error" role="alert" className="mt-2 text-xs font-semibold text-rose-200">
                    {error}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-white/65">
                  {searchType === "wa"
                    ? "Gunakan 8–15 digit nomor, dengan kode negara jika diperlukan."
                    : "Username X maksimal 15 karakter, tanpa spasi."}
                </p>
              </form>




              <div className="mt-6 flex flex-wrap gap-2.5">

                {[

                  "Pengecekan akun",

                  "Laporan komunitas",

                  "Informasi transparan",

                ].map((item) => (

                  <span

                    key={item}

                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-sm"

                  >

                    <svg

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke="currentColor"

                      strokeWidth="2"

                      className="h-3.5 w-3.5 text-[#a9bcff]"

                    >

                      <path d="m5 12 4 4L19 6" />

                    </svg>

                    {item}

                  </span>

                ))}

              </div>

            </div>



            {/* HERO VISUAL */}

            <div className="hidden lg:flex lg:items-center lg:justify-center">

              <div className="relative flex h-56 w-56 items-center justify-center rounded-[36px] border border-white/15 bg-white/6 shadow-2xl backdrop-blur-sm">

                <div className="absolute inset-5 rounded-[28px] border border-white/10" />

                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-linear-to-br from-[#7792ff] to-[#4f6bd8] shadow-2xl shadow-black/20">

                  <svg

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke="currentColor"

                    strokeWidth="1.4"

                    className="h-16 w-16 text-white"

                  >

                    <path d="M12 3 4.5 6v5c0 4.5 3 7.5 7.5 10 4.5-2.5 7.5-5.5 7.5-10V6L12 3Z" />

                    <path d="m8.5 12 2.5 2.5 5-5" />

                  </svg>

                </div>

                <div className="absolute -right-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-[#162350] shadow-lg">

                  <svg

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke="currentColor"

                    strokeWidth="1.8"

                    className="h-5 w-5 text-[#a9bcff]"

                  >

                    <circle cx="11" cy="11" r="7" />

                    <path d="m20 20-4-4" />

                  </svg>

                </div>

                <div className="absolute -bottom-4 -left-5 rounded-xl border border-white/15 bg-[#25376e] px-3 py-2 text-xs font-bold text-white shadow-lg">

                  Trust & Safety

                </div>

              </div>

            </div>

          </div>

        </section>

        </div>







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
