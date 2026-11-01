import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl font-black text-brand">404</p>
      <h1 className="mt-2 text-2xl font-black">Halaman tidak ditemukan</h1>
      <Link href="/" className="btn btn-primary mt-6">Kembali ke Beranda</Link>
    </div>
  );
}
