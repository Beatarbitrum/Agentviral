"use client";
import { api } from "./client";
import { Spinner, useAction } from "./ui";

export default function LogoutButton() {
  const [run, busy] = useAction();
  return (
    <button
      type="button"
      disabled={busy}
      className="flex min-h-11 w-full shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 text-left text-red-300 transition active:scale-[.97] active:bg-white/20 hover:bg-white/10 lg:min-h-10"
      onClick={() =>
        run(async () => {
          await api("/api/admin/logout", "POST").catch(() => {});
          window.location.href = "/admin/login";
        })
      }
    >
      {busy ? <Spinner /> : <span aria-hidden>⎋</span>} Keluar
    </button>
  );
}
