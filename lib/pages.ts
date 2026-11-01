export const STATIC_PAGES: Record<string, { title: string; body: (site: string, email: string) => string }> = {
  tentang: {
    title: "Tentang Kami",
    body: (s) => `**${s}** adalah portal berita daring berbahasa Indonesia yang menyajikan kabar viral, nasional, teknologi, hiburan, olahraga, gaya hidup, dan cerita unik dari berbagai penjuru.

## Visi
Menjadi rujukan informasi viral yang cepat, akurat, dan berimbang bagi pembaca Indonesia.

## Misi
- Menyajikan berita yang terverifikasi dan mudah dipahami.
- Menjernihkan informasi viral di media sosial dengan konteks dan sumber yang jelas.
- Menjunjung tinggi Kode Etik Jurnalistik dan Pedoman Pemberitaan Media Siber.

## Komitmen
Kami berkomitmen melakukan verifikasi, memberikan hak jawab, dan mengoreksi kesalahan secepatnya bila ditemukan.`,
  },
  redaksi: {
    title: "Redaksi",
    body: (s, email) => `Susunan redaksi **${s}**:

- **Pemimpin Redaksi:** (diisi oleh pengelola)
- **Redaktur Pelaksana:** (diisi oleh pengelola)
- **Redaktur:** (diisi oleh pengelola)
- **Reporter & Kontributor:** Tim ${s}
- **Desain & Teknologi:** Tim ${s}

## Alamat Redaksi
(Alamat redaksi diisi oleh pengelola)

Email: ${email}

Setiap wartawan ${s} dibekali identitas resmi dan tidak dibenarkan menerima imbalan dalam bentuk apa pun dari narasumber.`,
  },
  "pedoman-media-siber": {
    title: "Pedoman Pemberitaan Media Siber",
    body: (s) => `Kemerdekaan berpendapat, kemerdekaan berekspresi, dan kemerdekaan pers adalah hak asasi manusia yang dilindungi Pancasila, Undang-Undang Dasar 1945, dan Deklarasi Universal Hak Asasi Manusia PBB. ${s} berpedoman pada Pedoman Pemberitaan Media Siber yang ditetapkan Dewan Pers.

## 1. Ruang Lingkup
Media siber adalah segala bentuk media yang menggunakan wahana internet dan melaksanakan kegiatan jurnalistik, serta memenuhi persyaratan Undang-Undang Pers dan Standar Perusahaan Pers yang ditetapkan Dewan Pers.

## 2. Verifikasi dan Keberimbangan Berita
Pada prinsipnya setiap berita harus melalui verifikasi. Berita yang dapat merugikan pihak lain memerlukan verifikasi pada berita yang sama untuk memenuhi prinsip akurasi dan keberimbangan. Dalam kondisi tertentu (sumber jelas, berita bersifat mendesak demi kepentingan publik), berita dapat dimuat dengan kewajiban verifikasi dilakukan sesegera mungkin dan dicantumkan pada berita pemutakhiran.

## 3. Isi Buatan Pengguna (User Generated Content)
Media siber wajib mencantumkan syarat dan ketentuan mengenai isi buatan pengguna yang tidak bertentangan dengan UU Pers dan Kode Etik Jurnalistik. Pengguna dilarang memuat isi yang bohong, fitnah, sadis, cabul, mengandung prasangka dan kebencian terkait SARA, atau menganjurkan kekerasan.

## 4. Ralat, Koreksi, dan Hak Jawab
Ralat, koreksi, dan hak jawab mengacu pada UU Pers, Kode Etik Jurnalistik, dan Pedoman Hak Jawab Dewan Pers, serta wajib ditautkan pada berita yang diralat, dikoreksi, atau diberi hak jawab, disertai waktu pemuatannya.

## 5. Pencabutan Berita
Berita yang sudah dipublikasikan tidak dapat dicabut karena alasan penyensoran dari pihak luar redaksi, kecuali terkait SARA, kesusilaan, masa depan anak, pengalaman traumatik korban, atau pertimbangan khusus lain yang ditetapkan Dewan Pers. Pencabutan wajib disertai alasan dan diumumkan kepada publik.

## 6. Iklan
Iklan, artikel berbayar, atau konten bersponsor wajib dibedakan dengan jelas dari berita, dengan keterangan "advertorial", "iklan", "ads", "sponsored", atau sejenisnya.

## 7. Hak Cipta
Media siber wajib menghormati hak cipta sebagaimana diatur dalam peraturan perundang-undangan yang berlaku.

## 8. Pencantuman Pedoman
Media siber wajib mencantumkan Pedoman Pemberitaan Media Siber ini di medianya secara terang dan jelas.

## 9. Sengketa
Penilaian akhir atas sengketa mengenai pelaksanaan pedoman ini diselesaikan oleh Dewan Pers.`,
  },
  kontak: {
    title: "Kontak",
    body: (s, email) => `Hubungi redaksi **${s}** untuk informasi, kerja sama, hak jawab, koreksi, atau kiriman berita.

- **Email redaksi:** ${email}
- **Kerja sama & iklan:** ${email}
- **Hak jawab & koreksi:** sertakan tautan berita, identitas, dan penjelasan Anda.

Kami berupaya membalas setiap pesan dalam 1–2 hari kerja.`,
  },
  "kebijakan-privasi": {
    title: "Kebijakan Privasi",
    body: (s, email) => `Kebijakan privasi ini menjelaskan bagaimana **${s}** mengumpulkan dan menggunakan informasi pengunjung.

## Informasi yang Kami Kumpulkan
- Data teknis anonim seperti jenis perangkat, peramban, dan halaman yang dikunjungi, untuk statistik dan peningkatan layanan.
- Informasi yang Anda kirimkan secara sukarela melalui email.

## Cookie dan Pihak Ketiga
Kami dapat menggunakan cookie serta layanan pihak ketiga seperti Google Analytics dan Google AdSense. Pihak ketiga tersebut dapat menggunakan cookie untuk menayangkan iklan berdasarkan kunjungan Anda. Anda dapat menonaktifkan cookie melalui pengaturan peramban.

## Konten Sematan
Artikel dapat memuat konten sematan (video, unggahan media sosial) dari situs lain yang berperilaku sama seperti jika Anda mengunjungi situs tersebut.

## Keamanan
Kami tidak menjual data pribadi pengunjung kepada pihak mana pun.

## Kontak
Pertanyaan terkait privasi dapat dikirim ke ${email}.`,
  },
  disclaimer: {
    title: "Disclaimer",
    body: (s) => `Seluruh informasi di **${s}** disajikan dengan itikad baik untuk tujuan informasi umum.

- ${s} berupaya menyajikan informasi yang akurat, namun tidak menjamin kelengkapan dan ketepatan setiap informasi setiap saat.
- Konten viral dari media sosial yang disematkan merupakan milik pengunggah aslinya dan ditampilkan sebagai rujukan.
- Tautan ke situs lain disediakan untuk kemudahan; ${s} tidak bertanggung jawab atas isi situs tersebut.
- Sebagian konten dapat disusun dengan bantuan perangkat kecerdasan buatan dan selalu melalui peninjauan redaksi sebelum terbit.
- Segala tindakan yang Anda lakukan berdasarkan informasi di situs ini sepenuhnya menjadi tanggung jawab Anda.

Bila menemukan kekeliruan, silakan hubungi redaksi melalui halaman Kontak.`,
  },
};
