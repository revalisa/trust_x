
"use client";

// <<<<<<< HEAD
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "buyer" | "seller";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // ==========================================
  // REDIRECT DASHBOARD SESUAI ROLE
  // ==========================================
  const redirectDashboard = useCallback(
    (role: Role) => {
      const destination = role === "buyer" ? "/buyer" : "/seller";
      router.replace(destination);
      router.refresh();
    },
    [router]
  );

  // ==========================================
  // CEK USER DAN PROFIL
  // ==========================================
  const getUserRole = useCallback(async (): Promise<Role> => {
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      throw new Error("Sesi login tidak valid.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profil_pengguna")
      .select("jenis_akun")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profil error:", profileError.message);
      throw new Error("Gagal memeriksa profil akun.");
    }

    if (!profile) {
      throw new Error("Profil akun belum ditemukan.");
    }

    if (
      profile.jenis_akun !== "buyer" &&
      profile.jenis_akun !== "seller"
    ) {
      throw new Error("Role akun tidak valid.");
    }

    return profile.jenis_akun as Role;
  }, [supabase]);

  // ==========================================
  // CEK SESSION SAAT HALAMAN DIBUKA
  // ==========================================
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error.message);
          return;
        }

        if (!data.session) return;

        const role = await getUserRole();

        if (active) {
          redirectDashboard(role);
        }
      } catch (error) {
        if (!active) return;

        console.error("Session verification:", error);

        const errorMessage =
          error instanceof Error ? error.message : "";

        if (
          errorMessage === "Profil akun belum ditemukan." ||
          errorMessage === "Role akun tidak valid."
        ) {
          await supabase.auth.signOut();
        }

        if (errorMessage === "Profil akun belum ditemukan.") {
          setMessage(
            "Profil akun belum ditemukan. Silakan hubungi administrator."
          );
        } else if (errorMessage === "Role akun tidak valid.") {
          setMessage(
            "Role akun tidak valid. Silakan hubungi administrator."
          );
        } else {
          setMessage(
            "Gagal memeriksa sesi akun. Silakan coba login kembali."
          );
          await supabase.auth.signOut();
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [getUserRole, redirectDashboard, supabase]);

  // ==========================================
  // LOGIN EMAIL DAN PASSWORD
  // ==========================================
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || checkingSession) return;

    setMessage("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setMessage("Email dan kata sandi wajib diisi.");
      setLoading(false);
      return;
    }

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (loginError) {
        console.error("Login error:", loginError.message);

        if (
          loginError.message.toLowerCase().includes("email not confirmed")
        ) {
          setMessage(
            "Email kamu belum diverifikasi. Silakan periksa kotak masuk email."
          );
        } else if (
          loginError.message.toLowerCase().includes("invalid login credentials")
        ) {
          setMessage("Email atau kata sandi salah.");
        } else {
          setMessage(
            "Login gagal. Periksa data akun dan coba kembali."
          );
        }

        return;
      }

      const role = await getUserRole();

      redirectDashboard(role);
    } catch (error) {
      console.error("Login verification error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "";

      await supabase.auth.signOut();

      if (errorMessage === "Profil akun belum ditemukan.") {
        setMessage(
          "Profil akun belum terdaftar. Silakan hubungi administrator."
        );
      } else if (errorMessage === "Role akun tidak valid.") {
        setMessage(
          "Role akun tidak valid. Silakan hubungi administrator."
        );
      } else {
        setMessage(
          "Terjadi kesalahan saat memverifikasi akun. Silakan coba kembali."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LOGIN GOOGLE DAN X
  // ==========================================
  async function handleOAuth(provider: "google") {
    if (loading || checkingSession) return;

    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error(`${provider} OAuth error:`, error.message);

        setMessage(
            "Gagal menghubungkan Google. Silakan coba kembali."
        );

        setLoading(false);
      }
    } catch (error) {
      console.error("OAuth error:", error);

      setMessage("Terjadi kesalahan saat menghubungkan akun.");
      setLoading(false);
    }
  }

  // ==========================================
  // TAMPILAN LOGIN
  // ==========================================
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
        <h1 className="text-center text-3xl font-bold text-[#162350]">
          Masuk ke Akun
        </h1>

        <p className="section-intro mt-3 text-center text-sm leading-relaxed text-gray-500">
          Verifikasi akun, cek reputasi, nomor rekening, dan transaksi
          sebelum transfer.
        </p>

        <form
          id="loginForm"
          className="form-stack mt-8 space-y-5"
          noValidate
          onSubmit={handleSubmit}
        >
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                required
                disabled={loading || checkingSession}
                placeholder="email@example.com"
                className="w-full bg-transparent py-3 text-sm outline-none disabled:opacity-60"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading || checkingSession}
                placeholder="Kata sandi"
                className="w-full bg-transparent py-3 text-sm outline-none disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                className="shrink-0 text-sm font-semibold text-[#4f6bd8]"
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

          {/* PESAN */}
          {message && (
            <p
              id="loginMessage"
              role="alert"
              aria-live="polite"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              {message}
            </p>
          )}

          {/* TOMBOL LOGIN */}
          <button
            type="submit"
            disabled={loading || checkingSession}
            className="check-btn w-full rounded-lg bg-[#162350] py-3 font-semibold text-white transition hover:bg-[#22346b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingSession
              ? "Memeriksa sesi..."
              : loading
                ? "Memproses..."
                : "Masuk"}
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
            onClick={() => handleOAuth("google")}
            disabled={loading || checkingSession}
            className="btn out flex w-full justify-center rounded-lg border border-gray-300 py-3 text-sm font-semibold text-[#162350] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Memproses..." : "MASUK via Google"}
          </button>
        </div>

        {/* DAFTAR */}
        <p className="auth-switch mt-7 text-center text-sm text-gray-500">
          Belum punya akun?{" "}
          <Link
            href="/daftar"
            className="font-bold text-[#4f6bd8] hover:underline"
          >
            Daftar
          </Link>
        </p>
      </div>
    </main>
  );
}
