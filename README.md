# PrintKasir — Tahap 1

Prototipe aplikasi desktop untuk usaha jasa print di Windows.

## Yang sudah tersedia

- Pilih file PDF dan membaca jumlah halaman secara otomatis.
- Tampilan loading interaktif dan progress bar real-time saat membaca dan menganalisis halaman dokumen (sangat membantu untuk PDF yang tebal).
- Memisahkan halaman hitam-putih dan warna secara otomatis dengan analisis tampilan tiap halaman PDF.
- Pilihan mode cetak:
  - **Berwarna**: menghitung total biaya gabungan antara halaman berwarna (tarif warna) dan halaman hitam-putih (tarif hitam-putih).
  - **Tidak Berwarna**: menghitung seluruh halaman dokumen menggunakan biaya tidak berwarna (tarif hitam-putih).
- Koreksi manual tetap tersedia apabila operator/pelanggan ingin menyesuaikan rincian halaman.
- Harga per halaman yang bisa diatur.
- Kalkulasi biaya otomatis berdasarkan halaman dan jumlah rangkap.
- Simpan transaksi serta rekap lokal sederhana.

## Menjalankan

1. Instal Node.js versi 20 atau yang lebih baru.
2. Klik dua kali `Jalankan PrintKasir.cmd`.

Pada pemakaian pertama, peluncur tersebut akan mengunduh kebutuhan aplikasi. Setelah itu aplikasi dapat dibuka dengan klik dua kali dan dipakai tanpa internet. Jangan membuka `index.html` langsung di browser karena tombol pilih PDF membutuhkan aplikasi desktop Electron.

Alternatif melalui Terminal: jalankan `npm install` sekali, lalu `npm start`.

Data tarif dan transaksi disimpan lokal pada profil aplikasi Windows, bukan di dalam folder proyek.

## Tahap selanjutnya

1. Cetak nota dan ekspor rekap.
2. Dukungan layanan tambahan serta stok kertas.
