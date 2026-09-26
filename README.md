# 🌸 D'Orchid — Sistem Manajemen Toko Anggrek

Web aplikasi manajemen toko anggrek dengan **3 role**: Admin, Tenaga Perawatan Anggrek (Karyawan), dan Customer.

Dibangun dengan **Node.js + Express + EJS + SQLite** (module bawaan Node 22, tanpa native dependency).

## Menjalankan

```bash
npm install
npm start
```

Buka **http://localhost:3000** — data awal (seed) dibuat otomatis saat pertama dijalankan.

### Akun demo

| Role     | Email               | Password     |
|----------|---------------------|--------------|
| Admin    | admin@d-orchid.id   | admin123     |
| Karyawan | karyawan@d-orchid.id| karyawan123  |
| Customer | sari@mail.com       | customer123  |
| Customer | budi@mail.com       | customer123  |
| Customer | citra@mail.com      | customer123  |

> Reset data: hapus folder `data/` lalu jalankan `npm start` lagi.

## Fitur

### 1. Admin
- **Dashboard** — ringkasan penjualan (pendapatan total & bulan ini, jumlah pesanan), jumlah anggrek per **jenis** & per **fase pertumbuhan**, serta stok anggrek yang tersedia untuk dijual.
- **Data Akun** — CRUD akun Admin, Karyawan, dan Customer (tab per role + pencarian).
- **Katalog Anggrek** — tombol **`+`** untuk memilih **data anggrek buatan karyawan** → tentukan harga → masuk katalog. Juga ubah harga, nonaktifkan, dan hapus dari katalog.
- **Pesanan** — buat pesanan manual, lihat semua pesanan (filter status), detail item, dan update status (`menunggu → diproses → selesai / dibatalkan`). Pembatalan otomatis mengembalikan stok.
- **Ulasan** — lihat, balas, dan hapus ulasan customer.
- **Galeri** — CRUD foto galeri (upload gambar).
- **Laporan Penjualan** — filter periode (tanggal awal–akhir), ringkasan pendapatan, dan **unduh CSV**.
- **Log Out**.

### 2. Tenaga Perawatan Anggrek (Karyawan)
- **Login** & **Data Akun** (lihat/ubah akun sendiri).
- **Manajemen Data Anggrek** — CRUD data anggrek: nama, jenis, varietas, fase pertumbuhan, stok, deskripsi, foto. Data ini menjadi kandidat produk katalog pilihan Admin.
- **Katalog** — lihat katalog, ubah harga & status produk.
- **Log Out**.

### 3. Customer
- **Register** & **Login**.
- **Data Akun** — lihat/ubah profil sendiri.
- **Katalog** — lihat produk aktif + **pencarian nama / jenis / varietas**, tombol tambah ke keranjang.
- **Keranjang belanja sementara** (localStorage) → checkout membuat pesanan; validasi stok di server.
- **Pesanan Saya** — riwayat + status pesanan.
- **Galeri** — lihat foto anggrek.
- **Ulasan** — beri rating + komentar, lihat balasan admin, hapus ulasan sendiri.
- **Log Out**.

## Struktur Proyek

```
server.js            # bootstrap Express, session, static, error handler
src/
  db.js              # koneksi SQLite + skema tabel
  seed.js            # data awal demo
  helpers.js         # format rupiah/tanggal/badge
  middleware.js      # requireAuth, flash, roleHome
  upload.js          # multer upload gambar
  routes/
    auth.js          # login, register, logout
    admin.js         # dashboard, akun, katalog, pesanan, ulasan, galeri, laporan
    karyawan.js      # data akun, CRUD anggrek, katalog
    customer.js      # akun, katalog+search, keranjang/checkout, pesanan, galeri, ulasan
views/               # template EJS (partials + halaman per role)
public/              # css, js, uploads
images/              # gambar seed
data/                # file database (gitignored)
```

## Alur katalog (sorotan)

1. Karyawan membuat **data anggrek** di *Manajemen Data Anggrek*.
2. Admin membuka *Katalog Anggrek* → menekan tombol **`+ Tambah ke Katalog`**.
3. Muncul daftar data anggrek dari karyawan — yang sudah di katalog dimunculkan badge *Sudah di katalog*.
4. Admin menekan **Pilih**, memasukkan **harga jual**, lalu produk tampil di katalog customer.
