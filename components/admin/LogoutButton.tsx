"use client";
import { api } from "./client";

export default function LogoutButton() {
  return (
    <button
      className="block w-full shrink-0 rounded px-3 py-2 text-left text-red-300 hover:bg-white/10"
      onClick={async () => {
        await api("/api/admin/logout", "POST").catch(() => {});
        window.location.href = "/admin/login";
      }}
    >
      ⎋ Keluar
    </button>
  );
}
