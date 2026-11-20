
"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // LOGIN MENGGUNAKAN EMAIL DAN PASSWORD
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setMessage("Email dan kata sandi wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setMessage("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  // LOGIN MENGGUNAKAN GOOGLE
  async function signInWithGoogle() {
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
      }
    } catch {
      setMessage("Gagal menghubungkan akun Google.");
      setLoading(false);
    }
  }

  // LOGIN MENGGUNAKAN X
  async function signInWithX() {
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "x",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
      }
    } catch {
      setMessage("Gagal menghubungkan akun X.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-main flex min-h-screen items-center justify-center bg-[#f4f6fa] px-4 py-10">
      <div className="auth-card w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        {/* LOGO */}
        <div className="auth-symbol mb-5 flex justify-center">
          <Image
            src="/assets/images/logo-trustx.svg"
            alt="Logo TrustX"
            width={65}
            height={65}
            priority
          />
        </div>

        {/* JUDUL */}
        <h1 className="text-center text-3xl font-bold text-[#162350]">
          Masuk ke Akun
        </h1>

        <p className="section-intro mt-3 text-center text-sm leading-relaxed text-gray-500">
          Verifikasi akun, cek reputasi, nomor rekening, dan transaksi
          sebelum transfer.
        </p>

        {/* FORM LOGIN */}
        <form
          id="loginForm"
          className="form-stack mt-8 space-y-5"
          noValidate
          onSubmit={handleSubmit}
        >
          {/* EMAIL */}
          <div className="field">
            <label
              htmlFor="loginEmail"
              className="mb-2 block text-sm font-semibold text-[#172033]"
            >
              Alamat Email
            </label>

            <div className="auth-field flex items-center gap-3 rounded-lg border border-gray-300 px-3">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0 fill-none stroke-gray-400"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="m3 6 9 7 9-7" />
              </svg>

              <input
                type="email"
                id="loginEmail"
                name="email"
                autoComplete="email"
                required
                placeholder="email@example.com"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="field">
            <label
              htmlFor="loginPassword"
              className="mb-2 block text-sm font-semibold text-[#172033]"
            >
              Kata Sandi
            </label>

            <div className="auth-field flex items-center gap-3 rounded-lg border border-gray-300 px-3">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0 fill-none stroke-gray-400"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>

              <input
                type={showPassword ? "text" : "password"}
                id="loginPassword"
                name="password"
                autoComplete="current-password"
                required
                placeholder="Kata sandi"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-sm font-semibold text-[#4f6bd8]"
                aria-label={
                  showPassword
                    ? "Sembunyikan kata sandi"
                    : "Tampilkan kata sandi"
                }
              >
                {showPassword ? "Sembunyi" : "Lihat"}
              </button>
            </div>
          </div>

          {/* LUPA PASSWORD */}
          <p className="auth-hint text-right text-sm">
            <Link
              href="/lupa-password"
              className="font-medium text-[#4f6bd8] hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </p>

          {/* PESAN */}
          {message && (
            <p
              id="loginMessage"
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              {message}
            </p>
          )}

          {/* TOMBOL LOGIN */}
          <button
            type="submit"
            disabled={loading}
            className="check-btn w-full rounded-lg bg-[#162350] py-3 font-semibold text-white transition hover:bg-[#22346b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        {/* PEMISAH */}
        <div className="socials-sep my-6 flex items-center gap-3 text-xs font-semibold text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          ATAU
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        {/* LOGIN SOSIAL */}
        <div className="socials space-y-3">
          <button
            type="button"
            onClick={signInWithX}
            disabled={loading}
            className="btn out flex w-full justify-center rounded-lg border border-gray-300 py-3 text-sm font-semibold text-[#162350] transition hover:bg-gray-50 disabled:opacity-60"
          >
            MASUK via X
          </button>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="btn out flex w-full justify-center rounded-lg border border-gray-300 py-3 text-sm font-semibold text-[#162350] transition hover:bg-gray-50 disabled:opacity-60"
          >
            MASUK via Google
          </button>
        </div>

        {/* DAFTAR */}
        <p className="auth-switch mt-7 text-center text-sm text-gray-500">
          Belum punya akun?{" "}
          <Link
            href="/daftar"
            className="font-semibold text-[#4f6bd8] hover:underline"
          >
            Daftar
          </Link>
        </p>
      </div>
    </main>
  );
}
