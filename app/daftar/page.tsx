
"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "buyer" | "seller";

export default function DaftarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username_x, setUsernameX] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [storeName, setStoreName] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  // DAFTAR EMAIL & PASSWORD
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);

    if (password.length < 8) {
      setMessage("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Konfirmasi password tidak sama.");
      return;
    }

    if (role === "seller" && !storeName.trim()) {
      setMessage("Nama toko wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      // Pastikan pendaftaran tidak memakai session user lama
      const { data: currentSession } = await supabase.auth.getSession();

      if (currentSession.session) {
        await supabase.auth.signOut();
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
            data: {
              full_name: fullName.trim(),
              role,
              username_x: username_x.trim().replace(/^@/, ""),
              phone: phone.trim(),
              store_name: role === "seller" ? storeName.trim() : "",
            },
          },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.user) {
        setMessage("Pendaftaran gagal. Silakan coba kembali.");
        return;
      }

      // Jika session otomatis terbentuk, logout agar user wajib login
      if (data.session) {
        await supabase.auth.signOut();
      }

      setSuccess(true);
      setMessage(
        data.session
          ? "Pendaftaran berhasil! Silakan login menggunakan akun yang baru dibuat."
          : "Pendaftaran berhasil! Silakan login. Jika konfirmasi email diwajibkan, cek email kamu terlebih dahulu."
      );

      // Tidak masuk dashboard setelah daftar
      router.replace("/login?registered=true");
      router.refresh();
    } catch (error) {
      console.error("Signup error:", error);
      setMessage("Terjadi kesalahan saat mendaftar.");
    } finally {
      setLoading(false);
    }
  }

  // LOGIN / DAFTAR GOOGLE
  async function signInWithGoogle() {
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setMessage("Gagal menghubungkan akun Google.");
      setLoading(false);
    }
  }
  return (
    <main className="min-h-screen bg-[#f4f6fa] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-lg sm:p-9">

        {/* LOGO */}
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <Image
              src="/assets/images/logo-trustx.svg"
              alt="Logo TrustX"
              width={150}
              height={55}
              priority
            />
          </Link>
        </div>

        {/* JUDUL */}
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-extrabold text-[#162350]">
            Buat Akun TrustX
          </h1>
          <p className="mt-2 text-sm text-[#667089]">
            Daftar sekarang dan gunakan TrustX untuk bertransaksi lebih aman.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* NAMA LENGKAP */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#172033]">
              Nama lengkap
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masukkan nama lengkap"
              required
              autoComplete="name"
              className="w-full rounded-xl border border-[#e3e7f0] px-4 py-3 text-sm outline-none transition focus:border-[#4f6bd8]"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#172033]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-[#e3e7f0] px-4 py-3 text-sm outline-none transition focus:border-[#4f6bd8]"
            />
          </div>

          {/* Username X*/}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#172033]">
              Username X
            </label>
            <input
              type="text"
              value={username_x}
              onChange={(e) => setUsernameX(e.target.value)}
              placeholder="Masukkan username x"
              required
              autoComplete="name"
              className="w-full rounded-xl border border-[#e3e7f0] px-4 py-3 text-sm outline-none transition focus:border-[#4f6bd8]"
            />
          </div>

          {/* NOMOR TELEPON */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#172033]">
              Nomor telepon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              required
              autoComplete="tel"
              className="w-full rounded-xl border border-[#e3e7f0] px-4 py-3 text-sm outline-none transition focus:border-[#4f6bd8]"
            />
          </div>

          {/* ROLE */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-[#172033]">
              Daftar sebagai
            </label>
            <div className="grid grid-cols-2 gap-3">

              {/* BUYER */}
              <button
                type="button"
                onClick={() => {
                  setRole("buyer");
                  setStoreName("");
                }}
                aria-pressed={role === "buyer"}
                className={`rounded-xl border p-4 text-left transition ${
                  role === "buyer"
                    ? "border-[#4f6bd8] bg-[#eef1ff] text-[#162350]"
                    : "border-[#e3e7f0] text-[#667089] hover:border-[#4f6bd8]"
                }`}
              >
                <span className="mb-2 block text-2xl">🛍️</span>
                <span className="block text-sm font-bold">Pembeli</span>
                <span className="mt-1 block text-xs">
                  Cek reputasi dan buat laporan.
                </span>
              </button>

              {/* SELLER */}
              <button
                type="button"
                onClick={() => setRole("seller")}
                aria-pressed={role === "seller"}
                className={`rounded-xl border p-4 text-left transition ${
                  role === "seller"
                    ? "border-[#4f6bd8] bg-[#eef1ff] text-[#162350]"
                    : "border-[#e3e7f0] text-[#667089] hover:border-[#4f6bd8]"
                }`}
              >
                <span className="mb-2 block text-2xl">🏪</span>
                <span className="block text-sm font-bold">Penjual</span>
                <span className="mt-1 block text-xs">
                  Kelola toko dan tanggapi laporan.
                </span>
              </button>
            </div>
          </div>

          {/* NAMA TOKO SELLER */}
          {role === "seller" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#172033]">
                Nama toko
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Masukkan nama toko"
                required
                autoComplete="organization"
                className="w-full rounded-xl border border-[#e3e7f0] px-4 py-3 text-sm outline-none transition focus:border-[#4f6bd8]"
              />
            </div>
          )}

          {/* PASSWORD */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#172033]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-[#e3e7f0] px-4 py-3 pr-20 text-sm outline-none transition focus:border-[#4f6bd8]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#4f6bd8]"
              >
                {showPassword ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </div>

          {/* KONFIRMASI PASSWORD */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#172033]">
              Konfirmasi password
            </label>
            <div className="relative">
              <input
                type={showPasswordConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Masukkan ulang password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-[#e3e7f0] px-4 py-3 pr-20 text-sm outline-none transition focus:border-[#4f6bd8]"
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#4f6bd8]"
              >
                {showPasswordConfirm ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </div>

          {/* PESAN */}
          {message && (
            <div
              role="alert"
              className={`rounded-xl p-3 text-sm ${
                success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {message}
            </div>
          )}

          {/* BUTTON DAFTAR */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#162350] py-3.5 text-sm font-bold text-white transition hover:bg-[#22346b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Daftar Sekarang"}
          </button>

          {/* PEMISAH */}
          <div className="my-6 flex items-center gap-3 text-xs font-semibold text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            ATAU
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          {/* GOOGLE */}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="flex w-full justify-center rounded-lg border border-gray-300 py-3 text-sm font-semibold text-[#162350] transition hover:bg-gray-50 disabled:opacity-60"
          >
            Daftar / Masuk via Google
          </button>
        </form>

        {/* LINK LOGIN */}
        <p className="mt-6 text-center text-sm text-[#667089]">
          Sudah memiliki akun?{" "}
          <Link
            href="/login"
            className="font-bold text-[#4f6bd8] hover:underline"
          >
            Masuk
          </Link>
        </p>

        <p className="mt-5 text-center text-xs text-[#667089]">
          Dengan mendaftar, kamu menyetujui penggunaan layanan TrustX.
        </p>
      </div>
    </main>
  );
}
