
"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "wa" | "x";

type Props = {
  variant?: "default" | "compact";
};

export default function CekReputasi({
  variant = "default",
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<Mode>("wa");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const compact = variant === "compact";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const value = query.trim();

    if (!value) {
      setError(
        mode === "wa"
          ? "Masukkan nomor WhatsApp terlebih dahulu."
          : "Masukkan username X terlebih dahulu."
      );
      return;
    }

    if (mode === "wa" && !/^[+0-9\s()-]+$/.test(value)) {
      setError("Format nomor WhatsApp tidak valid.");
      return;
    }

    if (mode === "x" && value.replace(/^@/, "").length < 1) {
      setError("Username X tidak valid.");
      return;
    }

    setLoading(true);

    try {
      let store: { id: string; nama_toko: string } | null = null;

      if (mode === "wa") {
        const nomor = value.replace(/\D/g, "");

        const nomor62 = nomor.startsWith("0")
          ? "62" + nomor.slice(1)
          : nomor.startsWith("62")
            ? nomor
            : "62" + nomor;

        const nomor0 = nomor.startsWith("62")
          ? "0" + nomor.slice(2)
          : nomor.startsWith("0")
            ? nomor
            : "0" + nomor;

        const candidates = Array.from(
          new Set([value, nomor, nomor62, nomor0])
        );

        for (const candidate of candidates) {
          const { data, error } = await supabase
            .from("profil_toko")
            .select("id, nama_toko")
            .eq("nomor_telepon", candidate)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            store = data;
            break;
          }
        }
      } else {
        const username = value
          .replace(/^@/, "")
          .toLowerCase();

        const { data, error } = await supabase
          .from("profil_toko")
          .select("id, nama_toko")
          .ilike("username_x", username)
          .maybeSingle();

        if (error) throw error;

        store = data;
      }

      if (!store) {
        setError("Akun tidak ditemukan di database TrustX.");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        storeId: store.id,
        type: mode === "wa" ? "whatsapp" : "x",
        value,
      });

      router.push(`/cek-reputasi/hasil?${params.toString()}`);
    } catch (err) {
      console.error("Cek reputasi gagal:", err);
      setError("Terjadi kesalahan. Silakan coba kembali.");
      setLoading(false);
    }
  }

  return (
    <section
      className={`w-full ${
        compact
          ? "rounded-2xl"
          : "rounded-3xl border border-[#e3e8f2] bg-white p-5 sm:p-7 shadow-sm"
      }`}
    >
      {!compact && (
        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-[#162350]">
            Cek Reputasi Akun
          </h2>
          <p className="mt-1 text-sm text-[#647089]">
            Cari tahu riwayat laporan komunitas sebelum bertransaksi.
          </p>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 rounded-xl bg-[#f2f4f9] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("wa");
            setQuery("");
            setError("");
          }}
          className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
            mode === "wa"
              ? "bg-white text-[#162350] shadow-sm"
              : "text-[#718096]"
          }`}
        >
          WhatsApp
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("x");
            setQuery("");
            setError("");
          }}
          className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
            mode === "x"
              ? "bg-white text-[#162350] shadow-sm"
              : "text-[#718096]"
          }`}
        >
          Username X
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="cek-reputasi-input"
            className="mb-2 block text-sm font-semibold text-[#263453]"
          >
            {mode === "wa"
              ? "Nomor WhatsApp toko"
              : "Username X toko"}
          </label>

          <input
            id="cek-reputasi-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError("");
            }}
            placeholder={
              mode === "wa"
                ? "Contoh: 081234567890"
                : "Contoh: @username"
            }
            className="w-full rounded-xl border border-[#dce2ed] bg-white px-4 py-3.5 text-sm text-[#172033] outline-none transition focus:border-[#4f6bd8] focus:ring-4 focus:ring-[#4f6bd8]/10"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#162350] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#2a3c75] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Memeriksa akun..." : "Cek Reputasi"}
        </button>
      </form>

      <p className="mt-3 text-center text-xs leading-relaxed text-[#7a8499]">
        Informasi laporan berasal dari komunitas TrustX dan
        bukan jaminan mutlak keamanan transaksi.
      </p>
    </section>
  );
}
