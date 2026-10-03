# 🌸 D'Orchid — Sistem Manajemen Toko Anggrek

Web aplikasi manajemen toko anggrek dengan **3 role**: Admin, Tenaga Perawatan Anggrek (Karyawan), dan Customer.

Tersedia **2 versi**:

| Versi | Kebutuhan | Cocok untuk |
|---|---|---|
| **Static (utama)** — `index.html` | Tanpa server, buka langsung di browser | Demo UI + alur fitur per role |
| Server (opsional) — `npm start` | Node.js 22+ | Backend penuh dengan data tersimpan di SQLite |

> **Versi static**: website **HTML + CSS + JS murni, multi-halaman** — tiap tampilan adalah file `.html` sendiri dengan navigasi tautan biasa (bukan SPA). Transaksi antara customer & penjual **dinonaktifkan** (checkout & pembuatan pesanan) — sesuai kebutuhan prototipe UI. Fitur lain (login, CRUD, pencarian, katalog `+`, balas ulasan, laporan + unduh CSV) tetap berfungsi. Data demo disimpan di `localStorage` browser.

---

## 🖥️ Cara Buka (versi static — tanpa server)

1. **Download / clone repo ini**
2. **Klik ganda `index.html`** → terbuka langsung di browser (Chrome/Firefox/Edge)
   - Tidak perlu `npm install`, tidak perlu server, tidak perlu internet
3. Login dengan akun demo:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@d-orchid.id` | `admin123` |
| Karyawan | `karyawan@d-orchid.id` | `karyawan123` |
| Customer | `sari@mail.com` | `customer123` |

Reset data demo: buka `index.html` lalu jalankan di DevTools Console:
`localStorage.removeItem('dorchid_state_v1')` → reload.

### Fitur versi static

- **Auth** — login 3 role, register customer (**aturan: nama min. 2 karakter · email valid & belum terdaftar · password min. 8 karakter + huruf & angka · konfirmasi sama · no. HP opsional min. 8 digit** — dengan checklist live & pesan error inline), logout (session di localStorage)
- **Admin** — Dashboard (ringkasan penjualan, jumlah anggrek per jenis/fase, stok terjual), Data Akun (CRUD admin & karyawan; **akun customer hanya bisa dilihat**, tidak bisa ditambah/diubah), **Katalog tombol `+`** (pilih data anggrek karyawan → tentukan harga), Pesanan (lihat + update status), Ulasan (balas/hapus), Galeri (CRUD foto), Laporan periode + **unduh CSV**
- **Karyawan** — Data Akun (**mode lihat dulu — tombol ✏️ Edit Profil & 🔑 Ganti Password**; ganti password terpisah: wajib password saat ini + aturan min. 8, huruf & angka), Manajemen Data Anggrek (CRUD + foto). *Fitur katalog dihapus*; saat karyawan memperbarui stok anggrek, **stok di katalog otomatis ikut ter-update** (satu sumber data).
- **Customer** — Register, Katalog + **pencarian nama/jenis/varietas**, Keranjang (demo, tanpa checkout), Pesanan Saya, Galeri, Ulasan (beri/hapus), Data Akun (**mode lihat dulu — tombol ✏️ Edit Profil & 🔑 Ganti Password terpisah**)
- ❌ Dinonaktifkan: checkout customer & pembuatan pesanan admin (prototipe UI saja)

### Struktur versi static (multi-halaman, folder per role)

```
index.html            # halaman Login (entry — klik ganda untuk membuka)
register.html         # registrasi customer
admin/                # 15 halaman admin (dashboard, akun, katalog, pesanan, ulasan, galeri, laporan + form)
karyawan/             # 4 halaman karyawan (data anggrek + form, data akun)
customer/             # 6 halaman customer (katalog, keranjang, pesanan, galeri, ulasan, akun)
static/
  vendor/             # Bootstrap + Bootstrap Icons (lokal, jalan offline)
  store.js            # seed data demo + localStorage CRUD
  ui.js               # komponen, escape, toast, flash lintas halaman, shell statis
  views-admin.js      # konten & interaksi halaman admin
  views-karyawan.js   # konten & interaksi halaman karyawan
  views-customer.js   # konten & interaksi halaman customer
  page.js             # bootstrap tiap halaman: guard sesi/role, render view ke #view
public/css/style.css  # tema utama (dipakai kedua versi)
images/               # foto seed
```

Setiap halaman punya sidebar/topbar HTML statis (navigasi `<a href>` asli), lalu `page.js` menjaga sesi/role dan mengisi konten dinamis dari `views-*.js`. Query parameter memakai `?…` (contoh: `admin/admin-pesanan-detail.html?id=8`).

> ⚠️ Halaman di folder `admin/`, `karyawan/`, `customer/` memakai path aset berawalan `../` (mis. `../static/store.js`) dan gambar seed `../images/…` — **jangan dirapikan/dipindah tanpa menyesuaikan path-nya**. Guard logout/menuju login juga memakai `../index.html`.

---

## ⚙️ Versi server (opsional)

```bash
npm install
npm start
```

Buka **http://localhost:3000** — data awal (seed) dibuat otomatis. Backend Express 5 + EJS + SQLite bawaan Node 22 (`node:sqlite`), data tersimpan di folder `data/` (gitignored).

- Akun demo sama seperti tabel di atas.
- Reset: hapus folder `data/` lalu `npm start` lagi.

Alur katalog (versi server & static sama):
1. Karyawan membuat **data anggrek**
2. Admin → *Katalog Anggrek* → tombol **`+ Tambah ke Katalog`**
3. Pilih data anggrek (yang sudah ada diberi badge *Sudah di katalog*)
4. Isi **harga jual** → produk tampil di katalog customer

## Struktur proyek (versi server)

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
data/                # file database (gitignored)
```
