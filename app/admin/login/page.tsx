import LoginForm from "@/components/admin/LoginForm";
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Login() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <p className="text-center text-2xl font-black"><span className="bg-red-700 px-1.5 text-white">AGENT</span>VIRAL</p>
        <h1 className="mt-1 text-center text-sm font-semibold text-neutral-500">Masuk ke Panel Admin</h1>
        <LoginForm />
      </div>
    </div>
  );
}
