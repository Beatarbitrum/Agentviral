// Pencocokan relevansi media terhadap judul artikel — murni lokal, tanpa API berbayar.
// Dipakai untuk (1) menyusun kueri pencarian dari entitas kunci judul dan (2) menilai apakah
// judul/deskripsi video kandidat benar-benar membahas topik yang sama.

const STOP = new Set(
  (
    // kata umum bahasa Indonesia
    "yang dan di ke dari ini itu dengan untuk pada dalam tidak akan juga sudah telah oleh karena atau saat setelah sebelum bisa dapat ada adalah sebagai jadi agar kepada bagi hingga sampai tentang seperti lebih paling sangat masih belum baru lagi pun hanya saja namun tapi tetapi bahwa jika kalau maka para serta antara usai kini kian akan mulai mau ingin harus perlu buat bikin kata ujar sebut menurut tak nggak gak enggak apa siapa mengapa kenapa bagaimana kapan dimana mana berapa begini begitu inilah itulah ialah yakni yaitu tersebut sendiri semua seluruh banyak beberapa sejumlah satu dua tiga hal cara orang warga pihak sang si nih dong sih kok deh loh lho kah lah tah pula pernah sempat terus langsung cuma dia ia mereka kami kita kamu anda aku saya beliau nya punya milik gara-gara hari ini kemarin besok tahun bulan minggu pekan jam menit detik pagi siang sore malam " +
    // kata generik judul berita viral (tidak membedakan topik)
    "viral video heboh netizen warganet terbaru terkini update berita kabar info informasi momen detik detik-detik fakta fakta-fakta terungkap ternyata kronologi lengkap simak cek lihat nonton begini inilah resmi breaking eksklusif full live streaming hd official trending ramai diperbincangkan disorot sorotan reaksi respons tanggapi tanggapan curhat bikin geger gempar kocak lucu unik menarik penting terbaru2024 terbaru2025 shorts short reels reel tiktok youtube instagram twitter facebook fyp " +
    // kata umum bahasa Inggris
    "the a an and or of to in on at for with from by is are was were be been this that these those it its as new news latest today watch how why what when who video videos full live official"
  ).split(/\s+/).filter(Boolean),
);

export function norm(s: string) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function stem(t: string) {
  if (t.length > 5) return t.replace(/(nya|lah|kah|pun)$/, "");
  return t;
}

/** Kata-kata bermakna (tanpa stopword) dalam bentuk dasar sederhana. */
export function keywords(s: string): string[] {
  const out: string[] = [];
  for (const raw of norm(s).split(/[^a-z0-9]+/)) {
    if (!raw) continue;
    const hasDigit = /\d/.test(raw);
    if (!hasDigit && raw.length < 3) continue;
    if (hasDigit && raw.length < 2) continue;
    if (STOP.has(raw)) continue;
    const t = stem(raw);
    if (STOP.has(t)) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

function tokMatch(a: string, b: string) {
  if (a === b) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  return s.length >= 5 && l.startsWith(s);
}

export interface Topic {
  /** kata kunci judul */
  title: string[];
  /** kata kunci tambahan dari tag / kata kunci utama */
  extra: string[];
  /** entitas (nama diri, singkatan, angka) dari judul */
  entities: string[];
}

/** Ambil entitas kunci dari judul: nama diri (huruf kapital), singkatan, dan token berangka. */
export function topicOf(title: string, opts: { keyword?: string; tags?: string[] } = {}): Topic {
  const words = title.replace(/[“”"'‘’()[\]{}|:;,.!?]/g, " ").split(/\s+/).filter(Boolean);
  // "Title Case" bila tidak ada satu pun kata bermakna yang ditulis huruf kecil —
  // pada gaya ini huruf kapital tidak menandakan nama diri.
  const lowerContent = words.some((w, i) => i > 0 && /^[a-z]/.test(w) && keywords(w).length > 0);
  const titleCase = words.length > 3 && !lowerContent;
  const entities: string[] = [];
  words.forEach((w, i) => {
    const k = keywords(w)[0];
    if (!k) return;
    const acronym = /^[A-Z0-9]{2,}$/.test(w.replace(/[-/]/g, ""));
    const digit = /\d/.test(w);
    const proper = !titleCase && i > 0 && /^[A-Z]/.test(w);
    if ((acronym || digit || proper) && !entities.includes(k)) entities.push(k);
  });
  const extra = [...keywords(opts.keyword || ""), ...(opts.tags || []).flatMap((t) => keywords(t.replace(/-/g, " ")))].filter((t, i, a) => a.indexOf(t) === i);
  return { title: keywords(title), extra, entities };
}

/** Kueri pencarian ringkas dari entitas kunci judul (maks. ~6 kata). */
export function searchQuery(title: string, opts: { keyword?: string; tags?: string[] } = {}): string {
  const t = topicOf(title, opts);
  const kw = keywords(opts.keyword || "");
  const order: string[] = [];
  const push = (x: string) => { if (!order.some((o) => tokMatch(o, x))) order.push(x); };
  t.entities.forEach(push);
  kw.forEach(push);
  // sisanya: kata judul yang juga muncul di tag, lalu kata terpanjang
  t.title.filter((x) => t.extra.some((e) => tokMatch(e, x))).forEach(push);
  [...t.title].sort((a, b) => b.length - a.length).forEach(push);
  // pertahankan urutan kemunculan di judul agar kueri terbaca alami
  const pick = order.slice(0, 6);
  const inTitle = t.title.filter((x) => pick.includes(x));
  const rest = pick.filter((x) => !inTitle.includes(x));
  const q = [...inTitle, ...rest].join(" ").trim();
  return q || title.slice(0, 100);
}

export interface Score {
  shared: number;
  ratio: number;
  entityHits: number;
  pass: boolean;
  matched: string[];
}

/**
 * Nilai kecocokan teks kandidat (judul + deskripsi video) dengan topik artikel.
 * Lolos bila ≥2 kata kunci bermakna sama DAN ≥40% kata kunci judul cocok, atau ≥4 kata kunci
 * sama (judul panjang). Judul sangat pendek (≤3 kata kunci) cukup ≥50% bila entitasnya cocok.
 * Bila judul memuat entitas (nama diri/singkatan/angka), minimal satu entitas wajib cocok.
 */
export function scoreText(topic: Topic, text: string): Score {
  const cand = keywords(text);
  const pool = [...topic.title, ...topic.extra.filter((e) => !topic.title.some((t) => tokMatch(t, e)))];
  const matched = pool.filter((k) => cand.some((c) => tokMatch(c, k)));
  const titleHits = topic.title.filter((k) => cand.some((c) => tokMatch(c, k))).length;
  const entityHits = topic.entities.filter((k) => cand.some((c) => tokMatch(c, k))).length;
  const ratio = topic.title.length ? titleHits / topic.title.length : 0;
  // Bila judul punya entitas (nama diri/angka), minimal satu harus cocok — mencegah video
  // "banjir" acak untuk berita "banjir di Kota X".
  const entityOk = topic.entities.length === 0 || entityHits > 0;
  const short = topic.title.length <= 3 && titleHits >= 1 && ratio >= 0.5 && (entityHits > 0 || topic.title.length <= 2);
  const pass = entityOk && ((matched.length >= 2 && ratio >= 0.4) || matched.length >= 4 || short);
  return { shared: matched.length, ratio, entityHits, pass, matched };
}

/** Umur (hari) dari teks seperti "3 hari lalu", "1 thn lalu", "2 weeks ago", atau tanggal ISO. */
export function ageDays(s?: string): number | undefined {
  if (!s) return undefined;
  const t = norm(s);
  const m = t.match(/(\d+)\s*(detik|dtk|second|sec|menit|mnt|minute|min|jam|hour|hr|hari|day|minggu|mgg|pekan|week|bulan|bln|month|tahun|thn|year|yr)/);
  if (m) {
    const n = Number(m[1]);
    const u = m[2];
    if (/^(detik|dtk|second|sec|menit|mnt|minute|min|jam|hour|hr)/.test(u)) return 0;
    if (/^(hari|day)/.test(u)) return n;
    if (/^(minggu|mgg|pekan|week)/.test(u)) return n * 7;
    if (/^(bulan|bln|month)/.test(u)) return n * 30;
    return n * 365;
  }
  const d = Date.parse(s);
  if (!isNaN(d)) return Math.max(0, (Date.now() - d) / 864e5);
  return undefined;
}

/** Bobot akhir untuk pengurutan: kecocokan + bonus kebaruan. */
export function rank(sc: Score, age?: number) {
  let r = sc.shared + sc.entityHits * 0.5 + sc.ratio;
  if (age !== undefined) {
    if (age <= 7) r += 1;
    else if (age <= 31) r += 0.6;
    else if (age <= 180) r += 0.2;
    else if (age > 365) r -= 0.8;
  }
  return r;
}

/** Tolak video yang sangat lama kecuali kecocokannya sangat kuat. */
export function tooOld(sc: Score, age?: number) {
  return age !== undefined && age > 3 * 365 && sc.shared < 3;
}
