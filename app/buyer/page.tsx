
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CheckItem = {
  id: string;
  search_type: "whatsapp" | "x";
  search_value: string;
  created_at: string;
};

type ReportItem = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export default function BuyerPage() {
  const router = useRouter();

  const [name, setName] = useState("Pembeli");
  const [email, setEmail] = useState("");
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);

  const [searchType, setSearchType] =
    useState<"whatsapp" | "x">("whatsapp");

  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "buyer") {
        router.replace(
          profile?.role === "seller" ? "/seller" : "/login"
        );
        return;
      }

      setName(profile.full_name || "Pembeli");
      setEmail(user.email || "");

      const { data: history } = await supabase
        .from("reputation_checks")
        .select("id, search_type, search_value, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      setChecks(history || []);

      const { data: reportData } = await supabase
        .from("reports")
        .select("id, title, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      setReports(reportData || []);
      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const value = searchValue.trim();

    if (!value) {
      setMessage("Masukkan nomor WhatsApp atau username X.");
      return;
    }

    if (
      searchType === "whatsapp" &&
      !/^\+?[0-9\s-]{8,20}$/.test(value)
    ) {
      setMessage("Format nomor WhatsApp tidak valid.");
      return;
    }

    if (searchType === "x" && !/^@?[a-zA-Z0-9_]{1,15}$/.test(value)) {
      setMessage("Format username X tidak valid.");
      return;
    }

    setSearching(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("reputation_checks")
        .insert({
          user_id: user.id,
          search_type: searchType,
          search_value: value,
        })
        .select("id, search_type, search_value, created_at")
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      setChecks((previous) => [data, ...previous].slice(0, 5));
      setSearchValue("");
      setMessage(
        "Pencarian berhasil disimpan. Hasil reputasi belum terhubung ke sistem pemeriksaan."
      );
    } catch {
      setMessage("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSearching(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6fa]">
        <p className="text-sm font-medium text-[#667089]">
          Memuat dashboard TrustX...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6fa] pb-24 text-[#172033]">

      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-[#e3e7f0] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/buyer" className="text-2xl font-extrabold text-[#162350]">
            Trust<span className="text-[#4f6bd8]">X</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <Link href="/buyer" className="text-[#4f6bd8]">
              Beranda
            </Link>
            <Link href="/buyer/laporan" className="hover:text-[#4f6bd8]">
              Laporan
            </Link>
            <Link href="/buyer/profil" className="hover:text-[#4f6bd8]">
              Profil
            </Link>
          </nav>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-[#e3e7f0] px-4 py-2 text-sm font-semibold text-[#162350] hover:bg-[#f4f6fa]"
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-7 px-5 py-8">

        {/* WELCOME */}
        <section className="rounded-2xl bg-[#162350] p-6 text-white sm:p-8">
          <p className="text-sm text-blue-200">
            DASHBOARD PEMBELI
          </p>

          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
            Halo, {name}!
          </h1>

          <p className="mt-2 text-sm text-blue-100">
            Selamat datang kembali di TrustX. Cek reputasi sebelum bertransaksi.
          </p>

          <p className="mt-4 text-xs text-blue-200">
            {email}
          </p>
        </section>

        {/* SEARCH */}
        <section className="rounded-2xl border border-[#e3e7f0] bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#162350]">
              Cek Reputasi Akun
            </h2>
            <p className="mt-1 text-sm text-[#667089]">
              Periksa informasi akun sebelum melakukan transaksi.
            </p>
          </div>

          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setSearchType("whatsapp")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                searchType === "whatsapp"
                  ? "bg-[#162350] text-white"
                  : "bg-[#eef1f8] text-[#667089]"
              }`}
            >
              Nomor WhatsApp
            </button>

            <button
              type="button"
              onClick={() => setSearchType("x")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                searchType === "x"
                  ? "bg-[#162350] text-white"
                  : "bg-[#eef1f8] text-[#667089]"
              }`}
            >
              Username X
            </button>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={
                searchType === "whatsapp"
                  ? "Contoh: 081234567890"
                  : "Contoh: @username"
              }
              className="w-full rounded-xl border border-[#e3e7f0] px-4 py-3 text-sm outline-none focus:border-[#4f6bd8]"
            />

            <button
              type="submit"
              disabled={searching}
              className="w-full rounded-xl bg-[#4f6bd8] px-5 py-3 font-bold text-white hover:bg-[#3e58c0] disabled:opacity-60 sm:w-auto"
            >
              {searching ? "Memeriksa..." : "CEK REPUTASI"}
            </button>
          </form>

          {message && (
            <p className="mt-3 text-sm text-[#667089]" role="status">
              {message}
            </p>
          )}

          <p className="mt-4 text-xs text-[#667089]">
            Riwayat pencarian tersimpan di akunmu. Penyimpanan riwayat
            belum berarti reputasi akun sudah berhasil diverifikasi.
          </p>
        </section>

        {/* STATISTIK */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e7f0] bg-white p-5">
            <p className="text-sm text-[#667089]">Riwayat pengecekan</p>
            <p className="mt-2 text-3xl font-extrabold text-[#162350]">
              {checks.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e7f0] bg-white p-5">
            <p className="text-sm text-[#667089]">Laporan ditampilkan</p>
            <p className="mt-2 text-3xl font-extrabold text-[#162350]">
              {reports.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e7f0] bg-white p-5">
            <p className="text-sm text-[#667089]">Jenis akun</p>
            <p className="mt-2 text-2xl font-extrabold text-[#162350]">
              Pembeli
            </p>
          </div>
        </section>

        {/* HISTORY */}
        <section className="rounded-2xl border border-[#e3e7f0] bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#162350]">
                Riwayat Pengecekan
              </h2>
              <p className="mt-1 text-sm text-[#667089]">
                Pencarian dari akunmu.
              </p>
            </div>
          </div>

          {checks.length === 0 ? (
            <p className="rounded-xl bg-[#f4f6fa] p-5 text-center text-sm text-[#667089]">
              Belum ada riwayat pengecekan.
            </p>
          ) : (
            <div className="space-y-3">
              {checks.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3e7f0] p-4"
                >
                  <div>
                    <p className="font-semibold text-[#162350]">
                      {item.search_value}
                    </p>
                    <p className="mt-1 text-xs text-[#667089]">
                      {item.search_type === "whatsapp"
                        ? "Nomor WhatsApp"
                        : "Username X"}
                    </p>
                  </div>

                  <p className="text-xs text-[#667089]">
                    {new Date(item.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* REPORTS */}
        <section className="rounded-2xl border border-[#e3e7f0] bg-white p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#162350]">
              Laporan Komunitas
            </h2>
            <p className="mt-1 text-sm text-[#667089]">
              Laporan yang kamu buat.
            </p>
          </div>

          {reports.length === 0 ? (
            <p className="rounded-xl bg-[#f4f6fa] p-5 text-center text-sm text-[#667089]">
              Belum ada laporan.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border border-[#e3e7f0] p-4"
                >
                  <p className="font-semibold text-[#162350]">
                    {report.title}
                  </p>
                  <p className="mt-1 text-xs text-[#667089]">
                    Status: {report.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DISCLAIMER */}
        <p className="text-center text-xs leading-relaxed text-[#667089]">
          Informasi laporan komunitas merupakan bahan pertimbangan dan
          bukan jaminan keamanan transaksi.
        </p>

      </div>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 z-30 grid w-full grid-cols-3 border-t border-[#e3e7f0] bg-white py-3 md:hidden">
        <Link href="/buyer" className="text-center text-xs font-bold text-[#4f6bd8]">
          🏠<span className="mt-1 block">Beranda</span>
        </Link>

        <Link href="/buyer/laporan" className="text-center text-xs text-[#667089]">
          📄<span className="mt-1 block">Laporan</span>
        </Link>

        <Link href="/buyer/profil" className="text-center text-xs text-[#667089]">
          👤<span className="mt-1 block">Profil</span>
        </Link>
      </nav>

    </main>
  );
}
