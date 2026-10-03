/* ============================================================
   D'Orchid — full-test.js
   Suite lengkap versi multipage (folder admin/ karyawan/ customer/)
   Jalankan: node .tests/full-test.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, '..', 'node_modules', 'jsdom'));

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const fails = [];
function ok(cond, label) {
  if (cond) { pass++; return true; }
  fail++; fails.push(label);
  console.log('  x ' + label);
}
function section(t) { console.log('--- ' + t); }
function has(t, s) { return String(t).includes(s); }

const DOMS = [];
function closeAll() { DOMS.forEach(d => { try { d.window.close(); } catch (e) {} }); }

/* ---------- loader: buka halaman statis, injeksi sesi, jalankan script ---------- */
function openPage(rel, opts) {
  opts = opts || {};
  const abs = path.join(ROOT, rel);
  const html = fs.readFileSync(abs, 'utf8');
  /* origin http agar localStorage jsdom aktif (file:// = opaque origin, diblokir) */
  const url = 'https://dorchid.test/' + rel + (opts.query ? '?' + opts.query : '');
  const vc = new VirtualConsole(); // senyap — error jsdom tidak mengganggu
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', virtualConsole: vc });
  const w = dom.window;
  DOMS.push(dom);
  const events = [];
  w.document.addEventListener('dorchid:go', ev => events.push(ev.detail));
  if (opts.state) w.localStorage.setItem('dorchid_state_v1', JSON.stringify(opts.state));
  if (opts.flash) w.localStorage.setItem('dorchid_flash_v1', JSON.stringify(opts.flash));

  /* semua <script src> berurutan sesuai dokumen; sesi diset tepat setelah store.js */
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  for (const src of srcs) {
    const file = path.resolve(path.dirname(abs), src);
    w.eval(fs.readFileSync(file, 'utf8'));
    if (src.endsWith('store.js') && opts.user) {
      const u = w.Store.state.users.find(x => x.email === opts.user || x.id === opts.user);
      if (!u) throw new Error('user tes tidak ditemukan: ' + opts.user);
      w.Store.state.session = u.id;
      w.Store.save();
    }
  }
  /* inline script (halaman auth) */
  for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) w.eval(m[1]);

  return {
    w, d: w.document, S: w.Store, U: w.UI, events,
    q: sel => w.document.querySelector(sel),
    qa: sel => [...w.document.querySelectorAll(sel)],
    text: () => w.document.body.textContent,
    view: () => { const v = w.document.getElementById('view'); return v ? v.textContent : ''; },
    flashStored: () => { try { return JSON.parse(w.localStorage.getItem('dorchid_flash_v1')); } catch (e) { return null; } },
    flashText: () => {
      try {
        const raw = w.localStorage.getItem('dorchid_flash_v1');
        if (raw) return JSON.parse(raw).msg || '';
      } catch (e) {}
      const slot = w.document.getElementById('flashSlot');
      return slot ? slot.textContent : '';
    },
    toast: () => { const t = w.document.querySelectorAll('.toast-item'); return t.length ? t[t.length - 1].textContent : ''; },
    submit: form => form.dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true })),
    input: (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); },
    click: el => el.dispatchEvent(new w.Event('click', { bubbles: true, cancelable: true })),
  };
}

const EMAILS = {
  admin: 'admin@d-orchid.id',
  karyawan: 'karyawan@d-orchid.id',
  customer: 'sari@mail.com',
  sari: 'sari@mail.com',
  budi: 'budi@mail.com',
};

/* ============================================================
   A. STRUKTUR FILE & SOURCE
   ============================================================ */
section('struktur file & source');
ok(fs.existsSync(path.join(ROOT, 'index.html')), 'index.html di root');
ok(fs.existsSync(path.join(ROOT, 'register.html')), 'register.html di root');
ok(fs.existsSync(path.join(ROOT, '.nojekyll')), '.nojekyll ada');
const nAdmin = fs.readdirSync(path.join(ROOT, 'admin')).filter(f => f.endsWith('.html')).length;
const nKaryawan = fs.readdirSync(path.join(ROOT, 'karyawan')).filter(f => f.endsWith('.html')).length;
const nCustomer = fs.readdirSync(path.join(ROOT, 'customer')).filter(f => f.endsWith('.html')).length;
ok(nAdmin === 15, 'admin/ = 15 halaman (dapat ' + nAdmin + ')');
ok(nKaryawan === 4, 'karyawan/ = 4 halaman (dapat ' + nKaryawan + ')');
ok(nCustomer === 7, 'customer/ = 7 halaman (dapat ' + nCustomer + ')');

const storeSrc = fs.readFileSync(path.join(ROOT, 'static/store.js'), 'utf8');
ok(has(storeSrc, "'admin/admin-dashboard.html'"), 'roleHome admin → folder');
ok(has(storeSrc, "'karyawan/karyawan-anggrek.html'"), 'roleHome karyawan → folder');
ok(has(storeSrc, "'customer/customer-katalog.html'"), 'roleHome customer → folder');
ok(!/['"]images\/[^'"]+\.(jpg|png)/.test(storeSrc), 'seed gambar memakai prefix ../images/');
ok(has(storeSrc, '../images/'), 'seed images ../images/ ada');

const pageSrc = fs.readFileSync(path.join(ROOT, 'static/page.js'), 'utf8');
ok(has(pageSrc, "U.go('../index.html')"), 'guard tanpa sesi → ../index.html');
ok(has(pageSrc, "U.go('../' + S.roleHome"), 'guard role salah → ../ + roleHome');
ok(has(pageSrc, 'customer.katalogDetail'), 'page.js mendaftarkan view detail katalog');

let badPrefix = [];
for (const dir of ['admin', 'karyawan', 'customer']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter(x => x.endsWith('.html'))) {
    const s = fs.readFileSync(path.join(ROOT, dir, f), 'utf8');
    if (/(?:href|src)="(?:static|public|images)\//.test(s)) badPrefix.push(dir + '/' + f);
  }
}
ok(badPrefix.length === 0, 'semua halaman subfolder pakai prefix ../ (jelek: ' + badPrefix.join(', ') + ')');

const styleSrc = fs.readFileSync(path.join(ROOT, 'public/css/style.css'), 'utf8');
ok(has(styleSrc, '.pw-rules'), 'CSS .pw-rules tersedia di style.css');
ok(has(styleSrc, '.detail-row'), 'CSS .detail-row tersedia di style.css');
ok(fs.existsSync(path.join(ROOT, 'static/vendor/fonts')), 'folder static/vendor/fonts ada');

const regSrc = fs.readFileSync(path.join(ROOT, 'register.html'), 'utf8');
ok(has(regSrc, 'Aturan Pendaftaran'), 'register: kartu Aturan Pendaftaran');
const vcSrc = fs.readFileSync(path.join(ROOT, 'static/views-customer.js'), 'utf8');
const vkSrc = fs.readFileSync(path.join(ROOT, 'static/views-karyawan.js'), 'utf8');
ok(has(vcSrc, 'Edit Profil') && has(vcSrc, '?mode=edit'), 'customer akun: tombol Edit via query mode');
ok(has(vkSrc, 'Edit Profil') && has(vkSrc, '?mode=password'), 'karyawan akun: tombol Ganti Password via query mode');
ok(has(vcSrc, 'customer-katalog-detail.html?id='), 'kartu katalog → link detail');
ok(has(vcSrc, 'V.katalogDetail = function'), 'view V.katalogDetail ada');
const custRoutes = fs.readFileSync(path.join(ROOT, 'src/routes/customer.js'), 'utf8');
const kemRoutes = fs.readFileSync(path.join(ROOT, 'src/routes/karyawan.js'), 'utf8');
ok(has(custRoutes, "router.post('/akun/password'"), 'server: POST /customer/akun/password ada');
ok(has(kemRoutes, "router.post('/akun/password'"), 'server: POST /karyawan/akun/password ada');
ok(has(custRoutes, 'Password saat ini salah'), 'server: validasi password saat ini ada');
ok(!has(custRoutes, "if (password && String(password).length >= 6)"), 'server: kolom password lama di form profil dilepas');
ok(has(custRoutes, "router.get('/katalog/:id'"), 'server: route detail katalog ada');

/* ============================================================
   B. LOGIN (index.html)
   ============================================================ */
section('login (index.html)');
{
  const t = openPage('index.html');
  ok(t.S.state.users.length >= 5, 'seed terdimuat (≥5 user)');
  const f = t.q('[data-form="login"]');
  f.elements['email'].value = 'admin@d-orchid.id'; f.elements['password'].value = 'salah';
  t.submit(f);
  ok(has(t.toast(), 'Email atau password salah'), 'password salah → toast error');
  ok(t.events.length === 0, 'gagal login tidak navigasi');
  ok(!t.flashText(), 'gagal login tidak meninggalkan flash');
}
{
  const t = openPage('index.html');
  const f = t.q('[data-form="login"]');
  f.elements['email'].value = 'admin@d-orchid.id'; f.elements['password'].value = 'admin123';
  t.submit(f);
  ok(t.events[0] === 'admin/admin-dashboard.html', 'login admin → admin/admin-dashboard.html');
  ok(has(t.flashText(), 'Selamat datang, Administrator'), 'flash selamat datang admin');
}
{
  const t = openPage('index.html');
  const f = t.q('[data-form="login"]');
  f.elements['email'].value = 'karyawan@d-orchid.id'; f.elements['password'].value = 'karyawan123';
  t.submit(f);
  ok(t.events[0] === 'karyawan/karyawan-anggrek.html', 'login karyawan → karyawan-anggrek.html');
}
{
  const t = openPage('index.html');
  const f = t.q('[data-form="login"]');
  f.elements['email'].value = 'sari@mail.com'; f.elements['password'].value = 'customer123';
  t.submit(f);
  ok(t.events[0] === 'customer/customer-katalog.html', 'login customer → customer-katalog.html');
}
{
  const t = openPage('index.html', { user: EMAILS.admin });
  ok(t.events[0] === 'admin/admin-dashboard.html', 'sudah login → langsung ke roleHome');
}

/* ============================================================
   C. REGISTER (aturan pendaftaran)
   ============================================================ */
section('register: aturan pendaftaran');
{
  const t = openPage('register.html');
  ok(has(t.text(), 'Aturan Pendaftaran'), 'kartu aturan tampil');
  ok(t.q('#pwLen') && t.q('#pwLetter') && t.q('#pwDigit'), 'checklist live ada');
  const form = t.q('[data-form="register"]');
  function fill(over) {
    const v = Object.assign({ name: 'Budi Santoso', email: 'budi.baru@mail.com', phone: '0812-3456-7890', password: 'abcDEF12', confirm: 'abcDEF12', address: '' }, over);
    /* jsdom: form.name = atribut name form, bukan input — pakai elements[] */
    form.elements['name'].value = v.name; form.elements['email'].value = v.email;
    form.elements['phone'].value = v.phone; form.elements['password'].value = v.password;
    form.elements['confirm'].value = v.confirm; form.elements['address'].value = v.address;
    t.submit(form);
    const box = t.q('#formError');
    return box ? box.textContent : '';
  }
  let err = fill({ name: 'B' });
  ok(has(err, 'Nama lengkap minimal 2 karakter'), 'nama 1 karakter → inline error');
  ok(!t.flashText(), 'error validasi tidak bocor ke flash storage');
  err = fill({ email: 'bukan-email' });
  ok(has(err, 'Format email tidak valid'), 'email salah format → inline error');
  err = fill({ password: 'abc1234', confirm: 'abc1234' });
  ok(has(err, 'Password minimal 8 karakter'), 'password 7 char → inline error');
  err = fill({ password: 'abcdefgh', confirm: 'abcdefgh' });
  ok(has(err, 'huruf dan angka'), 'password huruf saja → inline error');
  err = fill({ confirm: 'abcDEF99' });
  ok(has(err, 'tidak sama'), 'konfirmasi beda → inline error');
  err = fill({ phone: 'abc' });
  ok(has(err, 'No. HP minimal 8 digit'), 'HP non-digit → inline error');
  err = fill({ email: 'admin@d-orchid.id' });
  ok(has(err, 'sudah terdaftar'), 'email duplikat → inline error');
  /* checklist live */
  const p = form.elements['password'];
  t.input(p, 'abc');
  ok(!t.q('#pwLen').classList.contains('ok'), 'checklist: 3 char → min8 belum ok');
  t.input(p, '12345678');
  ok(t.q('#pwLen').classList.contains('ok'), 'checklist: 8 char angka → min8 ok');
  ok(t.q('#pwDigit').classList.contains('ok'), 'checklist: ada angka → ok');
  ok(!t.q('#pwLetter').classList.contains('ok'), 'checklist: angka saja → huruf belum ok');
  t.input(p, 'abcDEF12');
  ok(t.q('#pwLetter').classList.contains('ok'), 'checklist: ada huruf → ok');
  /* sukses */
  const before = t.S.state.users.length;
  err = fill({});
  ok(t.S.state.users.length === before + 1, 'register valid → user bertambah (5 → 6)');
  ok(has(t.flashText(), 'Registrasi berhasil'), 'flash sukses registrasi');
}

/* ============================================================
   D. GUARD SESI/ROLE
   ============================================================ */
section('guard sesi/role per halaman');
{
  const t = openPage('customer/customer-katalog.html');
  ok(t.events[0] === '../index.html', 'tanpa sesi → redirect ../index.html');
  ok(has(t.flashText(), 'Silakan login terlebih dahulu'), 'flash: silakan login');
}
{
  const t = openPage('customer/customer-akun.html', { user: EMAILS.karyawan });
  ok(t.events[0] === '../karyawan/karyawan-anggrek.html', 'role salah → kembali ke roleHome user sendiri (../)');
  ok(has(t.flashText(), 'Anda tidak punya akses'), 'flash: akses ditolak');
}
{
  const t = openPage('admin/admin-dashboard.html', { user: EMAILS.sari });
  ok(t.events[0] === '../customer/customer-katalog.html', 'customer buka halaman admin → dikembalikan');
}

/* ============================================================
   E. SHELL STATIS + LOGOUT
   ============================================================ */
section('shell statis (sidebar/topbar/flash/logout)');
{
  const t = openPage('customer/customer-katalog.html', { user: EMAILS.sari, flash: { type: 'success', msg: 'Tes flash masuk slot.' } });
  ok(t.q('.side-link'), 'sidebar ada');
  ok(t.q('.topbar-title'), 'topbar ada');
  ok(has(t.q('#flashSlot').textContent, 'Tes flash masuk slot'), 'flash storage → #flashSlot');
  ok(t.q('#btnLogout'), 'tombol logout ada');
  t.w.confirm = () => true; // jsdom: confirm tidak diimplementasi
  t.click(t.q('#btnLogout'));
  ok(t.events.includes('../index.html'), 'logout → ../index.html');
  ok(has(t.flashText(), 'Berhasil logout'), 'flash logout tersimpan');
}

/* ============================================================
   F. ADMIN — DATA AKUN (view-only customer)
   ============================================================ */
section('admin: data akun (view-only customer)');
{
  const t = openPage('admin/admin-akun.html', { user: EMAILS.admin, query: 'role=customer' });
  ok(has(t.view(), 'hanya dapat'), 'banner view-only customer tampil');
  ok(!t.q('a[href^="admin-akun-tambah"]'), 'tanpa tombol Tambah (customer)');
  ok(t.qa('[data-del^="user:"]').length === 3, '3 tombol hapus customer (boleh)');
  ok(t.qa('.b-edit').length === 0, 'tanpa tombol edit customer');
  ok(!has(t.view(), 'admin-akun-ubah.html?id=3'), 'tidak ada link ubah customer');
  const before = t.S.state.users.length;
  t.w.confirm = () => true;
  t.click(t.q('[data-del^="user:3"]'));
  ok(t.S.state.users.length === before - 1, 'hapus customer → user berkurang (5 → 4)');
  ok(has(t.flashText(), 'berhasil dihapus'), 'flash hapus akun (setelah App.render → #flashSlot)');
}
{
  const t = openPage('admin/admin-akun.html', { user: EMAILS.admin, query: 'role=karyawan' });
  ok(t.qa('.b-edit').length >= 1, 'karyawan: tombol edit ada');
  ok(t.qa('a[href^="admin-akun-tambah"]').length >= 1, 'karyawan: tombol Tambah ada');
  const g = openPage('admin/admin-akun-ubah.html', { user: EMAILS.admin, query: 'role=customer&id=3' });
  ok(g.events[0] === 'admin-akun.html?role=customer', 'guard: ubah customer → redirect tab customer');
  ok(has(g.flashText(), 'tidak dapat menambah atau mengubah akun customer'), 'guard: pesan larangan');
}

/* ============================================================
   G. ADMIN — HALAMAN LAIN
   ============================================================ */
section('admin: katalog/pesanan/ulasan/galeri/laporan');
{
  const dash = openPage('admin/admin-dashboard.html', { user: EMAILS.admin });
  ok(!has(dash.view(), 'Halaman tidak ditemukan') && dash.view().length > 50, 'dashboard render');
  ok(has(dash.d.title, "D'Orchid"), 'judul document ter-set');
  const kat = openPage('admin/admin-katalog.html', { user: EMAILS.admin });
  ok(!has(kat.view(), 'Halaman tidak ditemukan'), 'katalog render');
  ok(kat.q('a[href="admin-katalog-tambah.html"]') || has(kat.view(), 'Tambah ke Katalog'), 'tombol + tambah katalog ada');
  const pick = openPage('admin/admin-katalog-tambah.html', { user: EMAILS.admin });
  ok(!has(pick.view(), 'Halaman tidak ditemukan'), 'pilih anggrek (pick) render');
  const pes = openPage('admin/admin-pesanan.html', { user: EMAILS.admin });
  ok(has(pes.view(), 'Menunggu'), 'pesanan: filter status render');
  const det = openPage('admin/admin-pesanan-detail.html', { user: EMAILS.admin, query: 'id=1' });
  ok(!has(det.view(), 'Halaman tidak ditemukan'), 'detail pesanan render');
  const uls = openPage('admin/admin-ulasan.html', { user: EMAILS.admin });
  ok(!has(uls.view(), 'Halaman tidak ditemukan'), 'ulasan render');
  const gal = openPage('admin/admin-galeri.html', { user: EMAILS.admin });
  ok(!has(gal.view(), 'Halaman tidak ditemukan'), 'galeri render');
  const lap = openPage('admin/admin-laporan.html', { user: EMAILS.admin, query: 'from=2020-01-01&to=2030-12-31' });
  ok(has(lap.view(), 'Sari'), 'laporan rentang lebar → ada data pesanan Sari');
}

/* ============================================================
   H. KARYAWAN — tanpa katalog + sinkron stok
   ============================================================ */
section('karyawan: anggrek tanpa katalog + sinkron stok');
{
  const t = openPage('karyawan/karyawan-anggrek.html', { user: EMAILS.karyawan });
  ok(t.w.VKaryawan && t.w.VKaryawan.catalog === undefined, 'VKaryawan.catalog tidak ada');
  const links = t.qa('.side-link').map(a => a.getAttribute('href'));
  ok(!links.some(h => h && h.includes('katalog')), 'sidebar tanpa menu katalog');
  ok(!has(t.view(), 'Halaman tidak ditemukan'), 'daftar anggrek render');
}
{
  const t = openPage('karyawan/karyawan-anggrek-ubah.html', { user: EMAILS.karyawan, query: 'id=1' });
  const form = t.q('[data-form="anggrek"]');
  ok(!!form, 'form edit anggrek ada');
  ok(!!t.S.catalogOfOrchid(1), 'orchid id=1 memang di katalog (premis sync)');
  t.input(form.elements['stock'], '50');
  t.submit(form);
  ok(t.S.orchidById(1).stock === 50, 'stok anggrek ter-update → 50');
  const cat = t.S.activeCatalog().find(c => c.catalog_id === 1);
  ok(cat && cat.stock === 50, 'stok di tampilan katalog ikut → 50 (single-source)');
  ok(has(t.flashText(), 'ikut ter-update otomatis'), 'flash sinkron otomatis');
}

/* ============================================================
   I. CUSTOMER — katalog/keranjang/pesanan/ulasan/galeri
   ============================================================ */
section('customer: katalog/keranjang/ulasan');
{
  const t = openPage('customer/customer-katalog.html', { user: EMAILS.sari });
  ok(t.qa('[data-cart]').length >= 4, 'kartu katalog dengan tombol keranjang');
  const cart0 = t.S.state.cart.length;
  t.click(t.q('[data-cart]'));
  ok(t.S.state.cart.length === cart0 + 1, 'tambah keranjang → cart +1');
}
{
  /* bawa state dari halaman katalog (satu JSDOM per halaman) */
  const k = openPage('customer/customer-katalog.html', { user: EMAILS.sari });
  k.click(k.q('[data-cart]'));
  const st = k.S.state;
  const t = openPage('customer/customer-keranjang.html', { user: EMAILS.sari, state: JSON.parse(JSON.stringify(st)) });
  ok(t.S.state.cart.length >= 1, 'item keranjang terbawa');
  const co = t.q('[data-action="checkout"]');
  ok(!!co, 'tombol checkout ada (demo, isi keranjang)');
  if (co) {
    t.click(co);
    ok(has(t.toast(), 'checkout dinonaktifkan'), 'checkout → toast prototipe (tanpa transaksi)');
  }
}
{
  const t = openPage('customer/customer-pesanan.html', { user: EMAILS.sari });
  ok(!has(t.view(), 'Halaman tidak ditemukan'), 'pesanan saya render');
  const u = openPage('customer/customer-ulasan.html', { user: EMAILS.sari });
  ok(!has(u.view(), 'Halaman tidak ditemukan'), 'ulasan render');
  const g = openPage('customer/customer-galeri.html', { user: EMAILS.sari });
  ok(!has(g.view(), 'Halaman tidak ditemukan'), 'galeri render');
}

/* ============================================================
   I2. DETAIL KATALOG + ULASAN PRODUK (customer)
   ============================================================ */
section('customer: detail katalog + isi ulasan produk');
{
  const t = openPage('customer/customer-katalog.html', { user: EMAILS.customer });
  ok(t.qa('.prod-card[data-detail]').length >= 6, 'semua kartu produk punya data-detail (klik = buka detail)');
  ok(!t.q('a[href^="customer-katalog-detail"]'), 'tombol Detail terpisah sudah dihapus dari kartu');
  /* klik kartu (bukan tombol) → langsung buka detail */
  const first = t.q('.prod-card[data-detail]');
  t.click(first);
  ok(t.events[0] === 'customer-katalog-detail.html?id=' + first.getAttribute('data-detail'), 'klik kartu → langsung ke detail');
}
{
  /* klik tombol Keranjang di dalam kartu TIDAK ikut navigasi */
  const t = openPage('customer/customer-katalog.html', { user: EMAILS.sari });
  const cart0 = t.S.state.cart.length;
  t.click(t.q('[data-cart]'));
  ok(t.S.state.cart.length === cart0 + 1, 'klik Keranjang di kartu → tetap tambah keranjang');
  ok(t.events.length === 0, 'klik Keranjang TIDAK memicu navigasi detail');
}
{
  const t = openPage('customer/customer-katalog-detail.html', { user: EMAILS.sari, query: 'id=1' });
  const o = t.S.orchidById(1);
  const c = t.S.catalogById(1);
  ok(has(t.view(), o.name), 'detail: nama anggrek tampil');
  ok(has(t.view(), t.S.rp(c.price)), 'detail: harga katalog tampil');
  ok(has(t.view(), o.description), 'detail: deskripsi tampil');
  ok(has(t.view(), 'Stok: ' + o.stock), 'detail: stok tampil');
  ok(!!t.q('a[href="customer-katalog.html"]'), 'link Kembali di atas ada');
  ok(!!t.q('a.fab-back[href="customer-katalog.html"]'), 'tombol Kembali MELAYANG (fab-back) — tidak perlu scroll ke atas');
  /* ulasan produk — customer lain bisa baca isi ulasan */
  ok(has(t.view(), 'Ulasan Produk'), 'panel ulasan ada');
  ok(has(t.view(), 'Bunganya lebat sekali'), 'isi ulasan terbaca di detail');
  ok(has(t.view(), 'Sari Wulandari'), 'nama reviewer tampil');
  ok(has(t.view(), 'Terima kasih Sari'), 'balasan penjual tampil');
  ok(!!t.q('#ulasan'), 'anchor #ulasan untuk lompat dari rating');
  ok(has(t.view(), 'Kelola Ulasan Saya'), 'sari sudah mengulas → tombol Kelola Ulasan Saya');
  const cart0 = t.S.state.cart.length;
  t.click(t.q('[data-cart]'));
  ok(t.S.state.cart.length === cart0 + 1, 'tombol Masukkan Keranjang di detail berfungsi');
}
{
  /* produk tanpa ulasan (catalog id=6) → empty state */
  const t = openPage('customer/customer-katalog-detail.html', { user: EMAILS.budi, query: 'id=6' });
  ok(has(t.view(), 'Belum ada ulasan'), 'produk tanpa ulasan → empty state');
  ok(has(t.view(), 'Beri Ulasan'), 'tombol Beri Ulasan untuk yang belum mengulas');
}
{
  /* id tidak ada → redirect + flash */
  const t = openPage('customer/customer-katalog-detail.html', { user: EMAILS.sari, query: 'id=999' });
  ok(t.events[0] === 'customer-katalog.html', 'id tidak valid → redirect ke katalog');
  ok(has(t.flashText(), 'tidak ditemukan'), 'flash produk tidak ditemukan');
}

/* ============================================================
   J. DATA AKUN CUSTOMER — mode lihat / edit / ganti password
   ============================================================ */
section('customer: Data Akun (tampil → tombol edit, password terpisah)');
{
  const t = openPage('customer/customer-akun.html', { user: EMAILS.sari });
  ok(t.qa('.detail-row').length === 5, 'mode lihat: 5 baris data');
  const editLink = t.qa('a').find(a => (a.getAttribute('href') || '').includes('mode=edit'));
  const pwLink = t.qa('a').find(a => (a.getAttribute('href') || '').includes('mode=password'));
  ok(!!editLink, 'ada tombol Edit Profil (link)');
  ok(!!pwLink, 'ada tombol Ganti Password (link)');
  ok(!t.q('form[data-form="profil"]'), 'mode lihat TIDAK langsung mode edit (tanpa form)');
  ok(!t.q('input[name="name"]'), 'mode lihat TIDAK ada input');
  ok(has(t.view(), t.S.currentUser().name), 'nama user tampil sebagai teks');
  ok(!has(t.view(), 'Kosongkan jika tidak diganti'), 'field password lama di form profil sudah tidak ada');
  ok(!!t.q('[data-action="hapus-akun"]'), 'tombol Hapus Akun ada (mode lihat)');
}
{
  /* hapus akun customer sendiri */
  const t = openPage('customer/customer-akun.html', { user: EMAILS.sari });
  const sid = t.S.currentUser().id;
  const revBefore = t.S.state.reviews.filter(r => r.customer_id === sid).length;
  const ordBefore = t.S.state.orders.filter(o => o.customer_id === sid).length;
  ok(revBefore > 0, 'premis: sari punya ulasan (' + revBefore + ')');
  ok(ordBefore > 0, 'premis: sari punya pesanan (' + ordBefore + ')');
  t.w.confirm = () => false;
  t.click(t.q('[data-action="hapus-akun"]'));
  ok(!!t.S.currentUser(), 'confirm=false (batal) → akun tetap ada');
  ok(t.S.state.reviews.filter(r => r.customer_id === sid).length === revBefore, 'ulasan tetap saat batal');
  t.w.confirm = () => true;
  t.click(t.q('[data-action="hapus-akun"]'));
  ok(!t.S.currentUser(), 'confirm=true → sesi berakhir (logout)');
  ok(!t.S.state.users.find(u => u.email === 'sari@mail.com'), 'user terhapus dari state');
  ok(t.S.state.reviews.filter(r => r.customer_id === sid).length === 0, 'ulasan milik ikut terhapus (mirror CASCADE)');
  ok(t.S.state.orders.filter(o => o.customer_id === sid).length === 0, 'pesanan dilepas dari akun (mirror SET NULL)');
  ok(t.S.state.orders.filter(o => o.customer_id === null).length >= ordBefore, 'pesanan tetap tersimpan (customer_id=null)');
  ok(t.S.state.cart.length === 0, 'keranjang dikosongkan');
  ok(has(t.flashText(), 'berhasil dihapus'), 'flash perpisahan tersimpan untuk halaman login');
}
{
  const t = openPage('customer/customer-akun.html', { user: EMAILS.sari, query: 'mode=edit' });
  const form = t.q('form[data-form="profil"]');
  ok(!!form, 'mode edit: form profil muncul (setelah klik Edit)');
  ok(!!t.q('input[name="name"]'), 'mode edit: input nama ada');
  ok(!t.q('input[name="password"]'), 'mode edit: TIDAK ada kolom password (password dipisah)');
  ok(!!t.q('a[href="customer-akun.html"]'), 'tombol Batal ada');
  /* validasi inline */
  form.elements['email'].value = 'not-an-email';
  t.submit(form);
  ok(has(t.q('#formError').textContent, 'Format email tidak valid'), 'edit: email salah format → inline error');
  ok(!t.flashText(), 'edit: error TIDAK masuk flash storage');
  form.elements['email'].value = 'budi@mail.com';
  form.elements['name'].value = 'Sari Wulandari';
  t.submit(form);
  ok(has(t.q('#formError').textContent, 'Email sudah digunakan'), 'edit: email duplikat → inline error');
  /* sukses */
  form.elements['name'].value = 'Sari W. Baru';
  form.elements['email'].value = 'sari@mail.com';
  form.elements['phone'].value = '0811-0000-1111';
  t.submit(form);
  ok(t.S.currentUser().name === 'Sari W. Baru', 'edit sukses → nama tersimpan');
  ok(has(t.flashText(), 'Data akun berhasil diperbarui'), 'edit sukses → flash');
}
{
  const t = openPage('customer/customer-akun.html', { user: EMAILS.sari, query: 'mode=password' });
  const form = t.q('form[data-form="password"]');
  ok(!!form, 'mode password: form ganti password terpisah muncul');
  ok(!!t.q('input[name="current"]'), 'ada kolom password saat ini');
  ok(!!t.q('input[name="newpw"]'), 'ada kolom password baru');
  ok(!!t.q('input[name="confirmpw"]'), 'ada kolom konfirmasi');
  ok(!!t.q('#pwLen'), 'checklist live ada');
  /* checklist */
  t.input(t.q('input[name="newpw"]'), 'abcDE');
  ok(!t.q('#pwLen').classList.contains('ok'), 'checklist: belum 8 → belum ok');
  t.input(t.q('input[name="newpw"]'), 'abcDEFG1');
  ok(t.q('#pwLen').classList.contains('ok') && t.q('#pwLetter').classList.contains('ok') && t.q('#pwDigit').classList.contains('ok'), 'checklist: lengkap → semua ok');
  /* validasi */
  const pwBefore = t.S.currentUser().password;
  t.q('input[name="current"]').value = 'salah-banget';
  t.q('input[name="newpw"]').value = 'abcDEFG1';
  t.q('input[name="confirmpw"]').value = 'abcDEFG1';
  t.submit(form);
  ok(has(t.q('#formError').textContent, 'Password saat ini salah'), 'password salah → inline error');
  ok(!t.flashText(), 'error password TIDAK masuk flash storage');
  ok(t.S.currentUser().password === pwBefore, 'password tidak berubah saat gagal');
  t.q('input[name="current"]').value = 'customer123';
  t.q('input[name="newpw"]').value = 'abc1234';
  t.q('input[name="confirmpw"]').value = 'abc1234';
  t.submit(form);
  ok(has(t.q('#formError').textContent, 'Password minimal 8 karakter'), 'password baru 7 char → inline error');
  t.q('input[name="newpw"]').value = 'abcdefgh';
  t.q('input[name="confirmpw"]').value = 'abcdefgh';
  t.submit(form);
  ok(has(t.q('#formError').textContent, 'huruf dan angka'), 'password huruf saja → inline error');
  t.q('input[name="newpw"]').value = 'abcDEFG1';
  t.q('input[name="confirmpw"]').value = 'abcDEFG9';
  t.submit(form);
  ok(has(t.q('#formError').textContent, 'tidak sama'), 'konfirmasi beda → inline error');
  t.q('input[name="newpw"]').value = 'customer123';
  t.q('input[name="confirmpw"]').value = 'customer123';
  t.submit(form);
  ok(has(t.q('#formError').textContent, 'tidak boleh sama dengan password lama'), 'password baru = lama → ditolak');
  /* sukses */
  t.q('input[name="current"]').value = 'customer123';
  t.q('input[name="newpw"]').value = 'abcDEFG1';
  t.q('input[name="confirmpw"]').value = 'abcDEFG1';
  t.submit(form);
  ok(t.S.currentUser().password === 'abcDEFG1', 'password baru tersimpan di state');
  ok(has(t.flashText(), 'Password berhasil diganti'), 'flash ganti password sukses');
}

/* ============================================================
   K. DATA AKUN KARYAWAN — mode lihat / edit / password
   ============================================================ */
section('karyawan: Data Akun (tampil → tombol edit, password terpisah)');
{
  const t = openPage('karyawan/karyawan-akun.html', { user: EMAILS.karyawan });
  ok(t.qa('.detail-row').length === 5, 'mode lihat: 5 baris data');
  ok(!!t.q('a[href="karyawan-akun.html?mode=edit"]'), 'tombol Edit Profil ada');
  ok(!!t.q('a[href="karyawan-akun.html?mode=password"]'), 'tombol Ganti Password ada');
  ok(!t.q('input[name="name"]'), 'tidak langsung mode edit');
  ok(!t.q('[data-action="hapus-akun"]'), 'hapus akun KHUSUS customer — tidak ada di karyawan');
}
{
  const t = openPage('karyawan/karyawan-akun.html', { user: EMAILS.karyawan, query: 'mode=edit' });
  const form = t.q('form[data-form="profil"]');
  ok(!!form, 'mode edit: form muncul');
  ok(!t.q('input[name="password"]'), 'tanpa kolom password di form profil');
  form.elements['name'].value = 'Rina P. Updated';
  t.submit(form);
  ok(t.S.currentUser().name === 'Rina P. Updated', 'edit sukses → nama tersimpan');
  ok(has(t.flashText(), 'Data akun berhasil diperbarui'), 'flash edit karyawan');
}
{
  const t = openPage('karyawan/karyawan-akun.html', { user: EMAILS.karyawan, query: 'mode=password' });
  const form = t.q('form[data-form="password"]');
  ok(!!form, 'mode password: form terpisah muncul');
  t.q('input[name="current"]').value = 'bukan-password';
  t.q('input[name="newpw"]').value = 'abcDEFG1';
  t.q('input[name="confirmpw"]').value = 'abcDEFG1';
  t.submit(form);
  ok(has(t.q('#formError').textContent, 'Password saat ini salah'), 'password salah → inline error');
  ok(!t.flashText(), 'tidak bocor ke flash');
  t.q('input[name="current"]').value = 'karyawan123';
  t.q('input[name="newpw"]').value = 'abcDEFG1';
  t.q('input[name="confirmpw"]').value = 'abcDEFG1';
  t.submit(form);
  ok(t.S.currentUser().password === 'abcDEFG1', 'password karyawan terganti');
  ok(has(t.flashText(), 'Password berhasil diganti'), 'flash ganti password karyawan');
}

/* ============================================================
   L. UTILITAS & MIGRASI + SWEEP
   ============================================================ */
section('utilitas & migrasi');
{
  /* state lama dengan path gambar tanpa prefix → harus dimigrasi */
  const legacy = {
    users: [{ id: 1, name: 'Admin', email: 'admin@d-orchid.id', password: 'admin123', role: 'admin', phone: '', address: '', created_at: '2026-01-01 00:00:00' }],
    session: 1, cart: [], orchids: [{ id: 1, name: 'X', jenis: 'Vanda', varietas: 'P', fase: 'Dewasa', stock: 1, description: '', image: 'images/hero-login.jpg', created_by: 2, created_at: '2026-01-01 00:00:00' }],
    catalog: [], orders: [], order_items: [], reviews: [], gallery: [{ id: 1, title: 'G', caption: '', image: 'images/x.jpg', created_at: '2026-01-01 00:00:00' }],
  };
  const t = openPage('admin/admin-dashboard.html', { user: 1, state: legacy });
  ok(t.S.state.orchids[0].image === '../images/hero-login.jpg', 'migrasi: gambar orchid → ../images/');
  ok(t.S.state.gallery[0].image === '../images/x.jpg', 'migrasi: gambar galeri → ../images/');
}
{
  const s = openPage('admin/admin-dashboard.html', { user: EMAILS.admin });
  ok(s.S.roleHome('admin') === 'admin/admin-dashboard.html', 'roleHome(admin)');
  ok(s.S.roleHome('karyawan') === 'karyawan/karyawan-anggrek.html', 'roleHome(karyawan)');
  ok(s.S.roleHome('customer') === 'customer/customer-katalog.html', 'roleHome(customer)');
  ok(has(s.S.rp(150000), '150.000'), 'format Rupiah');
}
{
  /* seluruh halaman subfolder wajib me-render (atau redirect valid) */
  section('sweep render semua halaman subfolder');
  const pages = [
    ['admin/admin-dashboard.html', []], ['admin/admin-akun.html', ['role=admin']], ['admin/admin-akun-tambah.html', ['role=karyawan']],
    ['admin/admin-akun-ubah.html', ['id=2']], ['admin/admin-katalog.html', []], ['admin/admin-katalog-tambah.html', []],
    ['admin/admin-katalog-harga.html', ['id=1']], ['admin/admin-katalog-ubah.html', ['id=1']], ['admin/admin-pesanan.html', []],
    ['admin/admin-pesanan-detail.html', ['id=1']], ['admin/admin-ulasan.html', []], ['admin/admin-galeri.html', []],
    ['admin/admin-galeri-tambah.html', []], ['admin/admin-galeri-ubah.html', ['id=1']], ['admin/admin-laporan.html', ['from=2020-01-01', 'to=2030-12-31']],
    ['karyawan/karyawan-anggrek.html', []], ['karyawan/karyawan-anggrek-tambah.html', []], ['karyawan/karyawan-anggrek-ubah.html', ['id=1']],
    ['karyawan/karyawan-akun.html', []],
    ['customer/customer-katalog.html', []], ['customer/customer-katalog-detail.html', ['id=1']], ['customer/customer-keranjang.html', []],
    ['customer/customer-pesanan.html', []], ['customer/customer-ulasan.html', []], ['customer/customer-galeri.html', []],
    ['customer/customer-akun.html', []],
  ];
  let bad = [];
  for (const [rel, qs] of pages) {
    const role = rel.split('/')[0];
    const t = openPage(rel, { user: EMAILS[role] || EMAILS.admin, query: qs.join('&') || undefined });
    const viewOk = !has(t.view(), 'Halaman tidak ditemukan') && (t.view().length > 20 || t.events.length > 0);
    if (!viewOk) bad.push(rel);
  }
  ok(bad.length === 0, '26 halaman ter-render (jelek: ' + bad.join(', ') + ')');
}

/* ============================================================ */
closeAll();
console.log('=============== HASIL: ' + pass + ' lulus, ' + fail + ' gagal ===============');
if (fail) { console.log('Gagal:'); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
