import "server-only";
import { putMedia } from "./blob";
import { saveArticle, getIndex, deleteArticle } from "./store";
import { escapeHtml, siteUrl } from "./util";

const COLORS: Record<string, [string, string]> = {
  viral: ["#dc2626", "#7f1d1d"],
  teknologi: ["#0f172a", "#2563eb"],
  lifestyle: ["#be185d", "#f59e0b"],
  olahraga: ["#065f46", "#16a34a"],
  unik: ["#7c3aed", "#f97316"],
  nasional: ["#111827", "#dc2626"],
  hiburan: ["#9333ea", "#ec4899"],
};

function wrap(text: string, max = 26): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      lines.push(cur.trim());
      cur = w;
    } else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, 4);
}

export function coverSvg(title: string, category: string, variant = 0): string {
  const [a, b] = COLORS[category] || COLORS.viral;
  const lines = wrap(title);
  const circles = Array.from({ length: 6 }, (_, i) => {
    const x = (i * 211 + variant * 97) % 1200;
    const y = (i * 137 + variant * 53) % 675;
    return `<circle cx="${x}" cy="${y}" r="${60 + ((i * 37) % 140)}" fill="#fff" opacity="0.06"/>`;
  }).join("");
  const text = lines
    .map((l, i) => `<text x="70" y="${300 + i * 74 - (lines.length - 1) * 30}" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="800" fill="#fff">${escapeHtml(l)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/>${circles}<rect x="70" y="70" width="190" height="52" rx="6" fill="#fff"/><text x="165" y="106" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" fill="${a}">${escapeHtml(category.toUpperCase())}</text><rect x="980" y="70" width="150" height="52" rx="6" fill="#facc15"/><text x="1055" y="106" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" fill="#111">DEMO</text>${text}<text x="70" y="610" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#fff" opacity="0.85">AGENTVIRAL • Ilustrasi konten demo</text></svg>`;
}

const NOTE = "> **Catatan:** Ini adalah **artikel demo** bawaan Agentviral untuk contoh tampilan. Isinya bersifat umum/edukatif dan dapat dihapus dari panel admin.\n\n";

const DEMOS = [
  {
    title: "[DEMO] Mengapa Sebuah Video Bisa Viral? Ini 5 Faktor yang Sering Berperan",
    subtitle: "Emosi, waktu unggah, dan kemudahan dibagikan kerap menjadi kunci sebuah konten menyebar luas.",
    category: "viral",
    tags: ["Media Sosial", "Konten Kreator", "Tips"],
    flags: { headline: true, breaking: true, featured: true },
    embeds: ["https://www.youtube.com/watch?v=aqz-KE-bpKQ"],
    body: `Setiap hari, ribuan video diunggah ke media sosial. Namun hanya sebagian kecil yang benar-benar menyebar luas. Apa yang membedakannya?

## 1. Memicu emosi
Konten yang membuat penonton tertawa, terharu, atau kagum cenderung lebih sering dibagikan.

## 2. Singkat dan jelas
Durasi pendek dengan pesan yang langsung tertangkap memudahkan orang menonton sampai habis.

## 3. Relevan dengan keseharian
Penonton lebih mudah terhubung dengan situasi yang mirip pengalaman mereka sendiri.

## 4. Waktu unggah
Mengunggah saat audiens sedang aktif, misalnya jam istirahat atau malam hari, membantu jangkauan awal.

## 5. Mudah dibagikan
Judul yang jelas dan visual yang kuat membuat orang tak ragu meneruskannya ke grup percakapan.

Bagian **Fakta Lapangan** di bawah ini menampilkan contoh sematan video (film animasi terbuka *Big Buck Bunny*) untuk mendemonstrasikan fitur embed.`,
  },
  {
    title: "[DEMO] Tips Mengamankan Akun Media Sosial dengan Verifikasi Dua Langkah",
    subtitle: "Langkah sederhana yang bisa mencegah akun diambil alih orang lain.",
    category: "teknologi",
    tags: ["Keamanan Digital", "Tips", "Media Sosial"],
    flags: { featured: true },
    body: `Verifikasi dua langkah (2FA) menambahkan lapisan keamanan selain kata sandi.

## Kenapa penting?
Kata sandi bisa bocor. Dengan 2FA, pelaku tetap membutuhkan kode tambahan dari perangkat Anda.

## Cara mengaktifkan
1. Buka **Pengaturan** → **Keamanan** di aplikasi media sosial.
2. Pilih **Verifikasi Dua Langkah**.
3. Gunakan aplikasi autentikator bila tersedia, karena lebih aman dibanding SMS.
4. Simpan kode cadangan di tempat aman.

## Tips tambahan
- Gunakan kata sandi berbeda untuk setiap layanan.
- Waspadai tautan yang meminta Anda login ulang.
- Jangan pernah membagikan kode OTP kepada siapa pun.`,
  },
  {
    title: "[DEMO] Lima Kebiasaan Pagi Sederhana untuk Hari yang Lebih Produktif",
    subtitle: "Mulai dari minum air putih hingga merencanakan tiga tugas utama.",
    category: "lifestyle",
    tags: ["Gaya Hidup", "Produktivitas", "Tips"],
    flags: { featured: true },
    gallery: true,
    body: `Pagi hari sering menentukan suasana sepanjang hari. Berikut kebiasaan sederhana yang bisa dicoba.

## Minum segelas air putih
Tubuh membutuhkan cairan setelah tidur beberapa jam.

## Bergerak ringan
Peregangan lima menit membantu tubuh terasa lebih segar.

## Tentukan tiga tugas utama
Menulis tiga prioritas membantu fokus pada hal yang paling penting.

## Sarapan seimbang
Pilih menu yang mengandung karbohidrat, protein, dan serat.

## Batasi gawai di awal hari
Menunda membuka notifikasi selama 30 menit dapat membantu pikiran lebih tenang.`,
  },
  {
    title: "[DEMO] Panduan Memulai Lari untuk Pemula: Cukup Mulai dari 15 Menit",
    subtitle: "Konsistensi lebih penting daripada kecepatan di minggu-minggu awal.",
    category: "olahraga",
    tags: ["Lari", "Kebugaran", "Tips"],
    flags: { featured: true },
    body: `Lari adalah olahraga yang murah dan bisa dilakukan hampir di mana saja.

## Mulai perlahan
Kombinasikan jalan cepat dan lari ringan, misalnya 1 menit lari dan 2 menit jalan, selama 15 menit.

## Pemanasan dan pendinginan
Luangkan 5 menit sebelum dan sesudah berlari untuk peregangan.

## Sepatu yang nyaman
Gunakan sepatu yang pas dan memiliki bantalan memadai.

## Dengarkan tubuh
Jika merasa nyeri yang tidak biasa, istirahat dan konsultasikan dengan tenaga kesehatan.`,
  },
  {
    title: "[DEMO] Mengapa Langit Senja Berwarna Jingga? Begini Penjelasan Ilmiahnya",
    subtitle: "Fenomena hamburan cahaya membuat warna langit berubah saat matahari terbenam.",
    category: "unik",
    tags: ["Sains", "Fenomena Alam"],
    flags: { featured: true },
    body: `Langit biru di siang hari dan jingga saat senja ternyata berasal dari proses yang sama: **hamburan Rayleigh**.

## Cahaya dan atmosfer
Cahaya matahari terdiri dari berbagai warna. Partikel udara lebih banyak menghamburkan cahaya dengan panjang gelombang pendek seperti biru.

## Saat matahari rendah
Ketika matahari mendekati cakrawala, cahaya menempuh jarak lebih jauh melewati atmosfer. Warna biru sudah banyak terhambur, sehingga yang tersisa didominasi jingga dan merah.

## Debu dan awan
Partikel debu atau awan tipis dapat membuat warna senja tampak lebih dramatis.`,
  },
  {
    title: "[DEMO] Tips Perjalanan Darat Jarak Jauh: Persiapan Kendaraan hingga Barang Bawaan",
    subtitle: "Cek kendaraan, atur waktu istirahat, dan siapkan perlengkapan darurat.",
    category: "nasional",
    tags: ["Perjalanan", "Mudik", "Tips"],
    flags: {},
    body: `Perjalanan darat jarak jauh membutuhkan persiapan agar aman dan nyaman.

## Periksa kendaraan
Cek tekanan ban, rem, lampu, oli, dan air radiator sebelum berangkat.

## Atur jadwal istirahat
Beristirahatlah setiap dua hingga tiga jam perjalanan untuk menjaga konsentrasi.

## Siapkan perlengkapan
- Kotak P3K dan obat pribadi
- Air minum dan camilan
- Pengisi daya ponsel
- Uang tunai secukupnya

## Pantau informasi lalu lintas
Gunakan aplikasi navigasi dan ikuti informasi resmi dari pihak berwenang.`,
  },
];

export async function seedDemo() {
  const idx = await getIndex(true);
  if (idx.articles.some((a) => a.demo)) return { created: 0, message: "Artikel demo sudah ada" };
  const now = Date.now();
  let created = 0;
  for (let i = 0; i < DEMOS.length; i++) {
    const d = DEMOS[i];
    const plain = d.title.replace("[DEMO] ", "");
    const coverUrl = await putMedia(`media/demo/cover-${d.category}.svg`, coverSvg(plain, d.category, i), "image/svg+xml");
    const gallery = d.gallery
      ? await Promise.all(
          [1, 2].map(async (g) => ({
            url: await putMedia(`media/demo/galeri-${g}.svg`, coverSvg(g === 1 ? "Ilustrasi galeri pertama" : "Ilustrasi galeri kedua", d.category, i + g * 3), "image/svg+xml"),
            alt: `Ilustrasi galeri demo ${g}`,
            caption: `Gambar ilustrasi galeri ${g} (demo)`,
          })),
        )
      : [];
    await saveArticle({
      title: d.title,
      subtitle: d.subtitle,
      body: NOTE + d.body,
      category: d.category,
      tags: d.tags,
      status: "published",
      publishAt: new Date(now - i * 3 * 3600 * 1000).toISOString(),
      cover: { url: coverUrl, alt: `Ilustrasi: ${plain}`, caption: "Ilustrasi konten demo", credit: "Agentviral" },
      gallery,
      embeds: d.embeds || [],
      sources: [{ title: "Konten demo Agentviral", url: `${siteUrl()}/tentang` }],
      author: "Redaksi Agentviral",
      featured: Boolean(d.flags.featured),
      headline: Boolean(d.flags.headline),
      breaking: Boolean(d.flags.breaking),
      seo: { metaTitle: plain, metaDescription: d.subtitle, focusKeyword: d.tags[0].toLowerCase() },
      demo: true,
    });
    created++;
  }
  return { created, message: `${created} artikel demo dibuat` };
}

export async function deleteDemos() {
  const idx = await getIndex(true);
  const demos = idx.articles.filter((a) => a.demo);
  for (const a of demos) await deleteArticle(a.id);
  return demos.length;
}
