const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { flash, requireAuth } = require('../middleware');

router.use(requireAuth('customer'));

/* ============================================================
   Beranda customer → katalog
   ============================================================ */
router.get('/', (req, res) => res.redirect('/customer/katalog'));

/* ============================================================
   1. DATA AKUN — lihat & ubah akun sendiri
   ============================================================ */
router.get('/akun', (req, res) => {
  const akun = db.prepare('SELECT * FROM users WHERE id = ?').get(res.locals.user.id);
  const stats = {
    orders: db.prepare('SELECT COUNT(*) AS v FROM orders WHERE customer_id = ?').get(akun.id).v,
    reviews: db.prepare('SELECT COUNT(*) AS v FROM reviews WHERE customer_id = ?').get(akun.id).v,
    spent: db
      .prepare(
        "SELECT COALESCE(SUM(total),0) AS v FROM orders WHERE customer_id = ? AND status != 'dibatalkan'"
      )
      .get(akun.id).v,
  };
  const mode = req.query.mode === 'edit' || req.query.mode === 'password' ? req.query.mode : 'view';
  res.render('customer/account', { title: 'Data Akun', akun, stats, mode });
});

/* Ubah data profil — tanpa password (password lewat POST /akun/password) */
router.post('/akun', (req, res) => {
  const akun = db.prepare('SELECT * FROM users WHERE id = ?').get(res.locals.user.id);
  const back = '/customer/akun?mode=edit';
  const { name, email, phone = '', address = '' } = req.body;
  if (!name || !email) {
    flash(req, 'danger', 'Nama dan email wajib diisi.');
    return res.redirect(back);
  }
  const nm = String(name).trim();
  const em = String(email).trim().toLowerCase();
  if (nm.length < 2) {
    flash(req, 'danger', 'Nama lengkap minimal 2 karakter.');
    return res.redirect(back);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
    flash(req, 'danger', 'Format email tidak valid. Contoh: nama@email.com');
    return res.redirect(back);
  }
  const exists = db
    .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .get(em, akun.id);
  if (exists) {
    flash(req, 'danger', 'Email sudah digunakan akun lain.');
    return res.redirect(back);
  }
  db.prepare('UPDATE users SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?').run(
    nm,
    em,
    String(phone).trim(),
    String(address).trim(),
    akun.id
  );
  flash(req, 'success', 'Data akun berhasil diperbarui.');
  res.redirect('/customer/akun');
});

/* Ganti password — wajib password saat ini + aturan seperti register */
router.post('/akun/password', (req, res) => {
  const akun = db.prepare('SELECT * FROM users WHERE id = ?').get(res.locals.user.id);
  const back = '/customer/akun?mode=password';
  const current = String(req.body.current || '');
  const newpw = String(req.body.newpw || '');
  const confirmpw = String(req.body.confirmpw || '');
  if (!current || !newpw || !confirmpw) {
    flash(req, 'danger', 'Semua kolom password wajib diisi.');
    return res.redirect(back);
  }
  if (!bcrypt.compareSync(current, akun.password)) {
    flash(req, 'danger', 'Password saat ini salah.');
    return res.redirect(back);
  }
  if (newpw.length < 8) {
    flash(req, 'danger', 'Password minimal 8 karakter.');
    return res.redirect(back);
  }
  if (!/[A-Za-z]/.test(newpw) || !/\d/.test(newpw)) {
    flash(req, 'danger', 'Password harus mengandung huruf dan angka.');
    return res.redirect(back);
  }
  if (bcrypt.compareSync(newpw, akun.password)) {
    flash(req, 'danger', 'Password baru tidak boleh sama dengan password lama.');
    return res.redirect(back);
  }
  if (newpw !== confirmpw) {
    flash(req, 'danger', 'Konfirmasi password tidak sama.');
    return res.redirect(back);
  }
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newpw, 10), akun.id);
  flash(req, 'success', 'Password berhasil diganti. Gunakan password baru saat login berikutnya.');
  res.redirect('/customer/akun');
});

/* Hapus akun sendiri — ulasan ikut terhapus (FK CASCADE),
   pesanan tetap tersimpan dengan nama snapshot (FK SET NULL) */
router.post('/akun/hapus', (req, res) => {
  const akun = db.prepare('SELECT * FROM users WHERE id = ?').get(res.locals.user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(akun.id);
  req.session.userId = null; // keluar — flash tetap hidup di sesi yang sama
  flash(req, 'success', 'Akun kamu berhasil dihapus. Sampai jumpa! 👋');
  res.redirect('/login');
});

/* ============================================================
   2. KATALOG — lihat & cari (nama / jenis / varietas)
   ============================================================ */
router.get('/katalog', (req, res) => {
  const q = String(req.query.q || '').trim();
  let sql = `
    SELECT c.id AS catalog_id, c.price, c.is_active,
           o.id AS orchid_id, o.name, o.jenis, o.varietas, o.fase, o.stock, o.image, o.description,
           (SELECT ROUND(AVG(rating),1) FROM reviews r WHERE r.catalog_id = c.id) AS avg_rating,
           (SELECT COUNT(*) FROM reviews r WHERE r.catalog_id = c.id) AS review_count
    FROM catalog c JOIN orchids o ON o.id = c.orchid_id
    WHERE c.is_active = 1`;
  const params = [];
  if (q) {
    sql += ' AND (o.name LIKE ? OR o.jenis LIKE ? OR o.varietas LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY o.name ASC';
  const items = db.prepare(sql).all(...params);
  const all = db
    .prepare(
      `SELECT c.id AS catalog_id, c.price, o.name, o.jenis, o.varietas, o.stock, o.image
       FROM catalog c JOIN orchids o ON o.id = c.orchid_id WHERE c.is_active = 1 ORDER BY o.name`
    )
    .all();
  res.render('customer/catalog', { title: 'Katalog Anggrek', items, all, q });
});

/* Detail katalog: info produk lengkap + semua ulasan pembeli */
router.get('/katalog/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM catalog WHERE id = ?').get(Number(req.params.id));
  const o = c ? db.prepare('SELECT * FROM orchids WHERE id = ?').get(c.orchid_id) : null;
  if (!c || !c.is_active || !o) {
    flash(req, 'warning', 'Produk katalog tidak ditemukan.');
    return res.redirect('/customer/katalog');
  }
  const reviews = db
    .prepare(
      `SELECT r.*, u.name AS customer_name
       FROM reviews r LEFT JOIN users u ON u.id = r.customer_id
       WHERE r.catalog_id = ? ORDER BY r.created_at DESC`
    )
    .all(c.id);
  const agg = db
    .prepare('SELECT COALESCE(ROUND(AVG(rating), 1), 0) AS avg, COUNT(*) AS n FROM reviews WHERE catalog_id = ?')
    .get(c.id);
  const myReview = reviews.find(r => r.customer_id === res.locals.user.id);
  res.render('customer/detail', {
    title: o.name,
    orchid: o,
    price: c.price,
    catalog_id: c.id,
    reviews,
    avg: agg.avg,
    count: agg.n,
    myReview: !!myReview,
  });
});

/* ============================================================
   3. KERANJANG BELANJA SEMENTARA + CHECKOUT
   ============================================================ */
router.get('/keranjang', (req, res) => {
  const catalog = db
    .prepare(
      `SELECT c.id AS catalog_id, c.price, o.name, o.jenis, o.varietas, o.stock, o.image
       FROM catalog c JOIN orchids o ON o.id = c.orchid_id
       WHERE c.is_active = 1`
    )
    .all();
  res.render('customer/cart', { title: 'Keranjang Belanja', catalog });
});

router.post('/checkout', (req, res) => {
  const raw = Array.isArray(req.body.items) ? req.body.items : [];
  const wanted = [];
  for (const it of raw) {
    const id = Number(it && it.id);
    const qty = Number(it && it.qty);
    if (!id || !qty || qty <= 0) continue;
    const ex = wanted.find((w) => w.id === id);
    if (ex) ex.qty += qty;
    else wanted.push({ id, qty });
  }
  if (!wanted.length) {
    return res.status(400).json({ error: 'Keranjang kosong.' });
  }

  const customer = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const lines = [];
  for (const w of wanted) {
    const c = db
      .prepare(
        `SELECT c.id, c.price, o.name, o.stock, o.id AS orchid_id
         FROM catalog c JOIN orchids o ON o.id = c.orchid_id
         WHERE c.id = ? AND c.is_active = 1`
      )
      .get(w.id);
    if (!c) return res.status(400).json({ error: 'Salah satu item di keranjang sudah tidak tersedia.' });
    if (c.stock < w.qty) {
      return res.status(400).json({ error: `Stok "${c.name}" tidak mencukupi (tersisa ${c.stock}).` });
    }
    lines.push({ ...c, qty: w.qty });
  }

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const note = String((req.body && req.body.note) || '').trim();

  db.exec('BEGIN');
  try {
    const info = db
      .prepare('INSERT INTO orders (customer_id, customer_name, total, status, note) VALUES (?, ?, ?, ?, ?)')
      .run(customer.id, customer.name, total, 'pending', note);
    const orderId = info.lastInsertRowid;
    const insItem = db.prepare(
      'INSERT INTO order_items (order_id, catalog_id, item_name, price, qty) VALUES (?, ?, ?, ?, ?)'
    );
    const decStock = db.prepare(
      "UPDATE orchids SET stock = stock - ?, updated_at = datetime('now','localtime') WHERE id = ?"
    );
    for (const l of lines) {
      insItem.run(orderId, l.id, l.name, l.price, l.qty);
      decStock.run(l.qty, l.orchid_id);
    }
    db.exec('COMMIT');
    res.json({ ok: true, orderId });
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
});

/* ============================================================
   4. PESANAN — lihat pesanan sendiri
   ============================================================ */
router.get('/pesanan', (req, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC')
    .all(res.locals.user.id)
    .map((o) => ({
      ...o,
      items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id),
    }));
  res.render('customer/orders', { title: 'Pesanan Saya', orders });
});

/* ============================================================
   5. GALERI — lihat foto
   ============================================================ */
router.get('/galeri', (req, res) => {
  const items = db.prepare('SELECT * FROM gallery ORDER BY created_at DESC').all();
  res.render('customer/gallery', { title: 'Galeri Anggrek', items });
});

/* ============================================================
   6. ULASAN — beri & hapus ulasan sendiri
   ============================================================ */
router.get('/ulasan', (req, res) => {
  const myReviews = db
    .prepare(
      `SELECT r.*, o.name AS orchid_name, c.price
       FROM reviews r
       LEFT JOIN catalog c ON c.id = r.catalog_id
       LEFT JOIN orchids o ON o.id = c.orchid_id
       WHERE r.customer_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(res.locals.user.id);

  // Katalog yang belum diulas oleh customer ini
  const candidates = db
    .prepare(
      `SELECT c.id AS catalog_id, o.name, o.jenis, o.varietas, o.image
       FROM catalog c JOIN orchids o ON o.id = c.orchid_id
       WHERE c.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM reviews r WHERE r.catalog_id = c.id AND r.customer_id = ?
         )
       ORDER BY o.name`
    )
    .all(res.locals.user.id);

  const ratedTotal = myReviews.reduce((s, r) => s + r.rating, 0);
  const avg = myReviews.length ? (ratedTotal / myReviews.length).toFixed(1) : '-';

  res.render('customer/reviews', { title: 'Ulasan Saya', myReviews, candidates, avg });
});

router.post('/ulasan', (req, res) => {
  const catalogId = Number(req.body.catalog_id);
  const rating = parseInt(req.body.rating, 10);
  const comment = String(req.body.comment || '').trim();
  if (!catalogId) {
    flash(req, 'danger', 'Pilih anggrek yang mau diulas.');
    return res.redirect('/customer/ulasan');
  }
  if (!rating || rating < 1 || rating > 5) {
    flash(req, 'danger', 'Rating harus antara 1–5.');
    return res.redirect('/customer/ulasan');
  }
  if (!comment) {
    flash(req, 'danger', 'Tulis ulasan kamu terlebih dahulu.');
    return res.redirect('/customer/ulasan');
  }
  const cat = db.prepare('SELECT id FROM catalog WHERE id = ?').get(catalogId);
  if (!cat) {
    flash(req, 'warning', 'Katalog tidak ditemukan.');
    return res.redirect('/customer/ulasan');
  }
  const dup = db
    .prepare('SELECT id FROM reviews WHERE catalog_id = ? AND customer_id = ?')
    .get(catalogId, res.locals.user.id);
  if (dup) {
    flash(req, 'warning', 'Kamu sudah mengulas anggrek ini. Hapus ulasan lama dulu jika ingin mengganti.');
    return res.redirect('/customer/ulasan');
  }
  db.prepare('INSERT INTO reviews (customer_id, catalog_id, rating, comment) VALUES (?, ?, ?, ?)').run(
    res.locals.user.id,
    catalogId,
    rating,
    comment
  );
  flash(req, 'success', 'Terima kasih atas ulasanmu! 🌸');
  res.redirect('/customer/ulasan');
});

router.post('/ulasan/:id/hapus', (req, res) => {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review || review.customer_id !== res.locals.user.id) {
    flash(req, 'danger', 'Ulasan tidak ditemukan atau bukan milikmu.');
    return res.redirect('/customer/ulasan');
  }
  db.prepare('DELETE FROM reviews WHERE id = ?').run(review.id);
  flash(req, 'success', 'Ulasan berhasil dihapus.');
  res.redirect('/customer/ulasan');
});

module.exports = router;
