
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LupaPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSuccess("");
    setError("");

    const emailTrim = email.trim();

    if (!emailTrim) {
      setError("Email wajib diisi.");
      return;
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim);

    if (!emailValid) {
      setError("Format email tidak valid.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(emailTrim, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess(
        "Jika email terdaftar, kami akan mengirimkan link untuk mengatur ulang kata sandi. Silakan periksa inbox atau folder spam."
      );
    } catch {
      setError("Terjadi kesalahan koneksi. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6fa] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#e3e7f0] bg-white p-6 shadow-sm sm:p-8">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <Link
            href="/login"
            className="inline-block text-2xl font-extrabold tracking-tight text-[#162350]"
          >
            Trust<span className="text-[#4f6bd8]">X</span>
          </Link>

          <div className="mt-5 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef1f8] text-[#4f6bd8]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-[#162350]">
            Lupa Kata Sandi?
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#667089]">
            Jangan khawatir! Masukkan email akun kamu dan kami akan mengirimkan
            link untuk mengatur ulang kata sandi.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-[#172033]"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Masukkan email terdaftar"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setSuccess("");
              }}
              disabled={loading}
              className="w-full rounded-xl border border-[#e3e7f0] bg-white px-4 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#9aa3b5] focus:border-[#4f6bd8] focus:ring-2 focus:ring-[#4f6bd8]/10 disabled:opacity-60"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-700">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-[#162350] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2a3c75] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Mengirim email..." : "Kirim Link Reset Password"}
          </button>
        </form>

        {/* Back to login */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#4f6bd8] hover:underline"
          >
            <span aria-hidden="true">←</span>
            Kembali ke halaman login
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-[#9aa3b5]">
          TrustX — Cek Dulu Sebelum Transaksi.
        </p>
      </div>
    </main>
  );
}
