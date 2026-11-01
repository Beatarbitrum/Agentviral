"use client";
import { useCallback, useRef, useState } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`spinner ${className}`} aria-hidden />;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; busyText?: React.ReactNode };

/** Tombol dengan status sibuk: langsung nonaktif + spinner saat proses berjalan. */
export function Btn({ busy, busyText, children, disabled, className = "btn btn-ghost", type = "button", ...rest }: BtnProps) {
  return (
    <button type={type} {...rest} className={className} disabled={disabled || busy} aria-busy={busy || undefined}>
      {busy ? (
        <>
          <Spinner />
          {busyText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Bungkus aksi async: status busy seketika, cegah ketuk ganda, dan pesan hasil.
 * const [run, busy] = useAction(); run(async () => {...})
 */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    try {
      return await fn();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);
  return [run, busy] as const;
}

/** Pesan status kecil yang otomatis hilang. */
export function useFlash(ms = 3500) {
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback(
    (t: string, ok = true) => {
      if (timer.current) clearTimeout(timer.current);
      setMsg({ t, ok });
      if (ok) timer.current = setTimeout(() => setMsg(null), ms);
    },
    [ms],
  );
  return [msg, flash, () => setMsg(null)] as const;
}

export function Flash({ msg }: { msg: { t: string; ok: boolean } | null }) {
  if (!msg) return null;
  return (
    <span role="status" className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>
      {msg.t}
    </span>
  );
}
