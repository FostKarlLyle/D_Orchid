const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { flash, requireAuth } = require('../middleware');
const { upload, removeUploadedImage } = require('../upload');
const { FASE_LIST, JENIS_LIST } = require('../helpers');

router.use(requireAuth('admin'));

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => today().slice(0, 8) + '01';

function orderItems(orderId) {
  return db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
}

/* ============================================================
   1. DASHBOARD — ringkasan penjualan & data anggrek
   ============================================================ */
router.get('/', (req, res) => {
  const stats = {
    revenue: db
      .prepare("SELECT COALESCE(SUM(total),0) AS v FROM orders WHERE status != 'dibatalkan'")
      .get().v,
    orders: db.prepare('SELECT COUNT(*) AS v FROM orders').get().v,
    pending: db.prepare("SELECT COUNT(*) AS v FROM orders WHERE status = 'pending'").get().v,
    monthRevenue: db
      .prepare(
        "SELECT COALESCE(SUM(total),0) AS v FROM orders WHERE status != 'dibatalkan' AND date(created_at) >= date('now','start of month')"
      )
      .get().v,
    orchids: db.prepare('SELECT COUNT(*) AS v FROM orchids').get().v,
    orchidStock: db.prepare('SELECT COALESCE(SUM(stock),0) AS v FROM orchids').get().v,
    catalogActive: db.prepare('SELECT COUNT(*) AS v FROM catalog WHERE is_active = 1').get().v,
    sellableStock: db
      .prepare(
        "SELECT COALESCE(SUM(o.stock),0) AS v FROM catalog c JOIN orchids o ON o.id = c.orchid_id WHERE c.is_active = 1"
      )
      .get().v,
    customers: db.prepare("SELECT COUNT(*) AS v FROM users WHERE role = 'customer'").get().v,
    reviews: db.prepare('SELECT COUNT(*) AS v FROM reviews').get().v,
  };

  // Ringkasan jumlah anggrek berdasarkan jenis
  const byJenis = db
    .prepare('SELECT jenis, COUNT(*) AS jumlah FROM orchids GROUP BY jenis ORDER BY jumlah DESC')
    .all();

  // Ringkasan jumlah anggrek berdasarkan fase pertumbuhan
  const faseRows = db
    .prepare('SELECT fase, COUNT(*) AS jumlah FROM orchids GROUP BY fase')
    .all();
  const byFase = FASE_LIST.map((f) => ({
    fase: f,
    jumlah: (faseRows.find((r) => r.fase === f) || {}).jumlah || 0,
  }));

  // Stok anggrek yang tersedia untuk dijual
  const stock = db
    .prepare(
      `SELECT c.id AS catalog_id, c.price, c.is_active, o.name, o.jenis, o.varietas, o.fase, o.stock, o.image
       FROM catalog c JOIN orchids o ON o.id = c.orchid_id
       ORDER BY o.stock ASC, o.name ASC`
    )
    .all();

  const recentOrders = db
    .prepare(
      `SELECT o.*, (SELECT GROUP_CONCAT(item_name || ' ×' || qty, ', ') FROM order_items WHERE order_id = o.id) AS items
       FROM orders o ORDER BY o.created_at DESC LIMIT 6`
    )
    .all();

  res.render('admin/dashboard', {
    title: 'Dashboard',
    stats,
    byJenis,
    byFase,
    stock,
    recentOrders,
    maxJenis: Math.max(1, ...byJenis.map((r) => r.jumlah)),
    maxFase: Math.max(1, ...byFase.map((r) => r.jumlah)),
  });
});

/* ============================================================
   2. DATA AKUN — admin, karyawan, customer (CRUD)
   ============================================================ */
router.get('/akun', (req, res) => {
  const role = ['admin', 'karyawan', 'customer'].includes(req.query.role) ? req.query.role : 'admin';
  const q = String(req.query.q || '').trim();
  let sql = 'SELECT * FROM users WHERE role = ?';
  const params = [role];
  if (q) {
    sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY created_at DESC';
  const accounts = db.prepare(sql).all(...params);
  const counts = {
    admin: db.prepare("SELECT COUNT(*) AS v FROM users WHERE role='admin'").get().v,
    karyawan: db.prepare("SELECT COUNT(*) AS v FROM users WHERE role='karyawan'").get().v,
    customer: db.prepare("SELECT COUNT(*) AS v FROM users WHERE role='customer'").get().v,
  };
  res.render('admin/accounts', { title: 'Data Akun', role, q, accounts, counts });
});

router.get('/akun/tambah', (req, res) => {
  const role = ['admin', 'karyawan', 'customer'].includes(req.query.role) ? req.query.role : 'admin';
  if (role === 'customer') {
    flash(req, 'warning', 'Admin tidak dapat menambah akun customer.');
    return res.redirect('/admin/akun?role=customer');
  }
  res.render('admin/account-form', { title: 'Tambah Akun', role, akun: null });
});

router.post('/akun/tambah', (req, res) => {
  const { name, email, phone = '', address = '', password } = req.body;
  const role = ['admin', 'karyawan', 'customer'].includes(req.body.role) ? req.body.role : 'admin';
  if (role === 'customer') {
    flash(req, 'warning', 'Admin tidak dapat menambah akun customer.');
    return res.redirect('/admin/akun?role=customer');
  }
  if (!name || !email || !password) {
    flash(req, 'danger', 'Nama, email, dan password wajib diisi.');
    return res.redirect(`/admin/akun/tambah?role=${role}`);
  }
  if (String(password).length < 6) {
    flash(req, 'danger', 'Password minimal 6 karakter.');
    return res.redirect(`/admin/akun/tambah?role=${role}`);
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
  if (exists) {
    flash(req, 'danger', 'Email sudah digunakan akun lain.');
    return res.redirect(`/admin/akun/tambah?role=${role}`);
  }
  db.prepare('INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)').run(
    String(name).trim(),
    String(email).trim().toLowerCase(),
    bcrypt.hashSync(String(password), 10),
    role,
    String(phone).trim(),
    String(address).trim()
  );
  flash(req, 'success', `Akun ${role} "${name}" berhasil ditambahkan.`);
  res.redirect(`/admin/akun?role=${role}`);
});

router.get('/akun/:id/ubah', (req, res) => {
  const akun = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!akun) {
    flash(req, 'warning', 'Akun tidak ditemukan.');
    return res.redirect('/admin/akun');
  }
  if (akun.role === 'customer') {
    flash(req, 'warning', 'Admin tidak dapat mengubah akun customer.');
    return res.redirect('/admin/akun?role=customer');
  }
  res.render('admin/account-form', { title: 'Ubah Akun', role: akun.role, akun });
});

router.post('/akun/:id/ubah', (req, res) => {
  const akun = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!akun) {
    flash(req, 'warning', 'Akun tidak ditemukan.');
    return res.redirect('/admin/akun');
  }
  if (akun.role === 'customer') {
    flash(req, 'warning', 'Admin tidak dapat mengubah akun customer.');
    return res.redirect('/admin/akun?role=customer');
  }
  const { name, email, phone = '', address = '', password } = req.body;
  if (!name || !email) {
    flash(req, 'danger', 'Nama dan email wajib diisi.');
    return res.redirect(`/admin/akun/${akun.id}/ubah`);
  }
  const exists = db
    .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .get(String(email).trim().toLowerCase(), akun.id);
  if (exists) {
    flash(req, 'danger', 'Email sudah digunakan akun lain.');
    return res.redirect(`/admin/akun/${akun.id}/ubah`);
  }
  db.prepare('UPDATE users SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?').run(
    String(name).trim(),
    String(email).trim().toLowerCase(),
    String(phone).trim(),
    String(address).trim(),
    akun.id
  );
  if (password && String(password).length >= 6) {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(String(password), 10), akun.id);
  }
  flash(req, 'success', 'Akun berhasil diperbarui.');
  res.redirect(`/admin/akun?role=${akun.role}`);
});

router.post('/akun/:id/hapus', (req, res) => {
  const akun = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!akun) {
    flash(req, 'warning', 'Akun tidak ditemukan.');
    return res.redirect('/admin/akun');
  }
  if (akun.id === req.session.userId) {
    flash(req, 'danger', 'Tidak bisa menghapus akun sendiri.');
    return res.redirect(`/admin/akun?role=${akun.role}`);
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(akun.id);
  flash(req, 'success', `Akun "${akun.name}" berhasil dihapus.`);
  res.redirect(`/admin/akun?role=${akun.role}`);
});

/* ============================================================
   3. KATALOG ANGGREK
   — Tombol "+" : pilih data anggrek (dibuat karyawan) → jadikan katalog
   ============================================================ */
router.get('/katalog', (req, res) => {
  const q = String(req.query.q || '').trim();
  let sql = `
    SELECT c.*, o.name, o.jenis, o.varietas, o.fase, o.stock, o.image,
           (SELECT ROUND(AVG(rating),1) FROM reviews r WHERE r.catalog_id = c.id) AS avg_rating,
           (SELECT COUNT(*) FROM reviews r WHERE r.catalog_id = c.id) AS review_count
    FROM catalog c JOIN orchids o ON o.id = c.orchid_id`;
  const params = [];
  if (q) {
    sql += ' WHERE o.name LIKE ? OR o.jenis LIKE ? OR o.varietas LIKE ?';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY c.created_at DESC';
  const items = db.prepare(sql).all(...params);
  res.render('admin/catalog', { title: 'Katalog Anggrek', items, q });
});

// Halaman pilihan data anggrek (dari tenaga kerja) untuk dijadikan katalog
router.get('/katalog/tambah', (req, res) => {
  const q = String(req.query.q || '').trim();
  let sql = `
    SELECT o.*, c.id AS catalog_id
    FROM orchids o LEFT JOIN catalog c ON c.orchid_id = o.id`;
  const params = [];
  if (q) {
    sql += ' WHERE o.name LIKE ? OR o.jenis LIKE ? OR o.varietas LIKE ?';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY o.created_at DESC';
  const orchids = db.prepare(sql).all(...params);
  res.render('admin/catalog-pick', { title: 'Tambah Katalog', orchids, q });
});

// Form harga untuk anggrek terpilih
router.get('/katalog/tambah/:orchidId', (req, res) => {
  const o = db
    .prepare('SELECT o.*, c.id AS catalog_id FROM orchids o LEFT JOIN catalog c ON c.orchid_id = o.id WHERE o.id = ?')
    .get(req.params.orchidId);
  if (!o) {
    flash(req, 'warning', 'Data anggrek tidak ditemukan.');
    return res.redirect('/admin/katalog/tambah');
  }
  if (o.catalog_id) {
    flash(req, 'warning', 'Anggrek ini sudah ada di katalog.');
    return res.redirect('/admin/katalog/tambah');
  }
  res.render('admin/catalog-price', { title: 'Tentukan Harga', orchid: o });
});

router.post('/katalog/tambah/:orchidId', (req, res) => {
  const o = db.prepare('SELECT * FROM orchids WHERE id = ?').get(req.params.orchidId);
  if (!o) {
    flash(req, 'warning', 'Data anggrek tidak ditemukan.');
    return res.redirect('/admin/katalog/tambah');
  }
  const exists = db.prepare('SELECT id FROM catalog WHERE orchid_id = ?').get(o.id);
  if (exists) {
    flash(req, 'warning', 'Anggrek ini sudah ada di katalog.');
    return res.redirect('/admin/katalog');
  }
  const price = Number(req.body.price);
  if (!price || price <= 0) {
    flash(req, 'danger', 'Harga harus lebih dari 0.');
    return res.redirect(`/admin/katalog/tambah/${o.id}`);
  }
  db.prepare('INSERT INTO catalog (orchid_id, price) VALUES (?, ?)').run(o.id, price);
  flash(req, 'success', `"${o.name}" berhasil ditambahkan ke katalog dengan harga ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price)}.`);
  res.redirect('/admin/katalog');
});

// Ubah HARGA katalog
router.get('/katalog/:id/ubah', (req, res) => {
  const item = db
    .prepare('SELECT c.*, o.name, o.jenis, o.varietas FROM catalog c JOIN orchids o ON o.id = c.orchid_id WHERE c.id = ?')
    .get(req.params.id);
  if (!item) {
    flash(req, 'warning', 'Data katalog tidak ditemukan.');
    return res.redirect('/admin/katalog');
  }
  res.render('admin/catalog-edit', { title: 'Ubah Harga Katalog', item });
});

router.post('/katalog/:id/ubah', (req, res) => {
  const item = db.prepare('SELECT * FROM catalog WHERE id = ?').get(req.params.id);
  if (!item) {
    flash(req, 'warning', 'Data katalog tidak ditemukan.');
    return res.redirect('/admin/katalog');
  }
  const price = Number(req.body.price);
  if (!price || price <= 0) {
    flash(req, 'danger', 'Harga harus lebih dari 0.');
    return res.redirect(`/admin/katalog/${item.id}/ubah`);
  }
  const is_active = req.body.is_active === '1' ? 1 : 0;
  db.prepare(`UPDATE catalog SET price = ?, is_active = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(
    price,
    is_active,
    item.id
  );
  flash(req, 'success', 'Harga katalog berhasil diperbarui.');
  res.redirect('/admin/katalog');
});

router.post('/katalog/:id/hapus', (req, res) => {
  const item = db
    .prepare('SELECT c.id, o.name FROM catalog c JOIN orchids o ON o.id = c.orchid_id WHERE c.id = ?')
    .get(req.params.id);
  if (!item) {
    flash(req, 'warning', 'Data katalog tidak ditemukan.');
    return res.redirect('/admin/katalog');
  }
  db.prepare('DELETE FROM catalog WHERE id = ?').run(item.id);
  flash(req, 'success', `"${item.name}" dihapus dari katalog. Data anggrek tetap tersimpan.`);
  res.redirect('/admin/katalog');
});

/* ============================================================
   4. PESANAN — buat, lihat, update status
   ============================================================ */
router.get('/pesanan', (req, res) => {
  const status = ['pending', 'diproses', 'selesai', 'dibatalkan'].includes(req.query.status)
    ? req.query.status
    : '';
  let sql = 'SELECT * FROM orders';
  const params = [];
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  const orders = db.prepare(sql).all(...params).map((o) => ({ ...o, items: orderItems(o.id) }));
  const counts = {
    all: db.prepare('SELECT COUNT(*) AS v FROM orders').get().v,
    pending: db.prepare("SELECT COUNT(*) AS v FROM orders WHERE status='pending'").get().v,
    diproses: db.prepare("SELECT COUNT(*) AS v FROM orders WHERE status='diproses'").get().v,
    selesai: db.prepare("SELECT COUNT(*) AS v FROM orders WHERE status='selesai'").get().v,
    dibatalkan: db.prepare("SELECT COUNT(*) AS v FROM orders WHERE status='dibatalkan'").get().v,
  };
  res.render('admin/orders', { title: 'Pesanan', orders, status, counts });
});

router.get('/pesanan/tambah', (req, res) => {
  const customers = db
    .prepare("SELECT id, name, email FROM users WHERE role = 'customer' ORDER BY name")
    .all();
  const catalog = db
    .prepare(
      `SELECT c.id, c.price, o.name, o.jenis, o.stock
       FROM catalog c JOIN orchids o ON o.id = c.orchid_id
       WHERE c.is_active = 1 ORDER BY o.name`
    )
    .all();
  res.render('admin/order-form', { title: 'Buat Pesanan', customers, catalog });
});

router.post('/pesanan/tambah', (req, res) => {
  const customerId = Number(req.body.customer_id);
  const customer = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'customer'").get(customerId);
  if (!customer) {
    flash(req, 'danger', 'Customer harus dipilih.');
    return res.redirect('/admin/pesanan/tambah');
  }
  const catIds = [].concat(req.body.catalog_id || []).map(Number);
  const qtys = [].concat(req.body.qty || []).map(Number);
  const items = [];
  for (let i = 0; i < catIds.length; i++) {
    const qty = qtys[i] || 0;
    if (!catIds[i] || qty <= 0) continue;
    const c = db
      .prepare('SELECT c.id, c.price, c.is_active, o.name, o.stock FROM catalog c JOIN orchids o ON o.id = c.orchid_id WHERE c.id = ?')
      .get(catIds[i]);
    if (!c) continue;
    if (!c.is_active) {
      flash(req, 'danger', `"${c.name}" tidak aktif di katalog.`);
      return res.redirect('/admin/pesanan/tambah');
    }
    if (c.stock < qty) {
      flash(req, 'danger', `Stok "${c.name}" tidak mencukupi (tersisa ${c.stock}).`);
      return res.redirect('/admin/pesanan/tambah');
    }
    items.push({ ...c, qty });
  }
  if (!items.length) {
    flash(req, 'danger', 'Pesanan minimal berisi 1 item.');
    return res.redirect('/admin/pesanan/tambah');
  }

  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  const note = String(req.body.note || '').trim();

  db.exec('BEGIN');
  try {
    const info = db
      .prepare('INSERT INTO orders (customer_id, customer_name, total, status, note) VALUES (?, ?, ?, ?, ?)')
      .run(customer.id, customer.name, total, 'pending', note);
    const orderId = info.lastInsertRowid;
    const insItem = db.prepare(
      'INSERT INTO order_items (order_id, catalog_id, item_name, price, qty) VALUES (?, ?, ?, ?, ?)'
    );
    const decStock = db.prepare(`UPDATE orchids SET stock = stock - ?, updated_at = datetime('now','localtime') WHERE id = ?`);
    for (const it of items) {
      insItem.run(orderId, it.id, it.name, it.price, it.qty);
      const orchid = db.prepare('SELECT orchid_id FROM catalog WHERE id = ?').get(it.id);
      decStock.run(it.qty, orchid.orchid_id);
    }
    db.exec('COMMIT');
    flash(req, 'success', `Pesanan #${orderId} untuk ${customer.name} berhasil dibuat.`);
    res.redirect('/admin/pesanan');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
});

router.get('/pesanan/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    flash(req, 'warning', 'Pesanan tidak ditemukan.');
    return res.redirect('/admin/pesanan');
  }
  const items = orderItems(order.id);
  const customer = order.customer_id
    ? db.prepare('SELECT * FROM users WHERE id = ?').get(order.customer_id)
    : null;
  res.render('admin/order-detail', { title: `Pesanan #${order.id}`, order, items, customer });
});

router.post('/pesanan/:id/status', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    flash(req, 'warning', 'Pesanan tidak ditemukan.');
    return res.redirect('/admin/pesanan');
  }
  const status = String(req.body.status || '');
  if (!['pending', 'diproses', 'selesai', 'dibatalkan'].includes(status)) {
    flash(req, 'danger', 'Status tidak valid.');
    return res.redirect(`/admin/pesanan/${order.id}`);
  }

  db.exec('BEGIN');
  try {
    // Jika dibatalkan → kembalikan stok
    if (status === 'dibatalkan' && order.status !== 'dibatalkan') {
      for (const it of orderItems(order.id)) {
        if (!it.catalog_id) continue;
        const cat = db.prepare('SELECT orchid_id FROM catalog WHERE id = ?').get(it.catalog_id);
        if (cat) {
          db.prepare(`UPDATE orchids SET stock = stock + ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(
            it.qty,
            cat.orchid_id
          );
        }
      }
    }
    db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(
      status,
      order.id
    );
    db.exec('COMMIT');
    flash(req, 'success', `Status pesanan #${order.id} diperbarui menjadi "${status}".`);
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  res.redirect(`/admin/pesanan/${order.id}`);
});

/* ============================================================
   5. ULASAN — lihat, balas, hapus
   ============================================================ */
router.get('/ulasan', (req, res) => {
  const reviews = db
    .prepare(
      `SELECT r.*, u.name AS customer_name, o.name AS orchid_name, c.price
       FROM reviews r
       LEFT JOIN users u ON u.id = r.customer_id
       LEFT JOIN catalog c ON c.id = r.catalog_id
       LEFT JOIN orchids o ON o.id = c.orchid_id
       ORDER BY r.created_at DESC`
    )
    .all();
  res.render('admin/reviews', { title: 'Ulasan', reviews });
});

router.post('/ulasan/:id/balas', (req, res) => {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) {
    flash(req, 'warning', 'Ulasan tidak ditemukan.');
    return res.redirect('/admin/ulasan');
  }
  const reply = String(req.body.reply || '').trim();
  if (!reply) {
    flash(req, 'danger', 'Balasan tidak boleh kosong.');
    return res.redirect('/admin/ulasan');
  }
  db.prepare(`UPDATE reviews SET reply = ?, replied_at = datetime('now','localtime') WHERE id = ?`).run(
    reply,
    review.id
  );
  flash(req, 'success', 'Balasan ulasan berhasil disimpan.');
  res.redirect('/admin/ulasan');
});

router.post('/ulasan/:id/hapus', (req, res) => {
  const review = db.prepare('SELECT id FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) {
    flash(req, 'warning', 'Ulasan tidak ditemukan.');
    return res.redirect('/admin/ulasan');
  }
  db.prepare('DELETE FROM reviews WHERE id = ?').run(review.id);
  flash(req, 'success', 'Ulasan berhasil dihapus.');
  res.redirect('/admin/ulasan');
});

/* ============================================================
   6. GALERI — CRUD foto
   ============================================================ */
router.get('/galeri', (req, res) => {
  const items = db.prepare('SELECT * FROM gallery ORDER BY created_at DESC').all();
  res.render('admin/gallery', { title: 'Galeri', items });
});

router.get('/galeri/tambah', (req, res) => {
  res.render('admin/gallery-form', { title: 'Tambah Foto Galeri', foto: null });
});

router.post('/galeri/tambah', upload.single('image'), (req, res) => {
  const title = String(req.body.title || '').trim();
  const caption = String(req.body.caption || '').trim();
  if (!title) {
    flash(req, 'danger', 'Judul foto wajib diisi.');
    return res.redirect('/admin/galeri/tambah');
  }
  if (!req.file) {
    flash(req, 'danger', 'File gambar wajib diupload.');
    return res.redirect('/admin/galeri/tambah');
  }
  db.prepare('INSERT INTO gallery (title, caption, image) VALUES (?, ?, ?)').run(
    title,
    caption,
    '/public/uploads/' + req.file.filename
  );
  flash(req, 'success', 'Foto berhasil ditambahkan ke galeri.');
  res.redirect('/admin/galeri');
});

router.get('/galeri/:id/ubah', (req, res) => {
  const foto = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!foto) {
    flash(req, 'warning', 'Foto tidak ditemukan.');
    return res.redirect('/admin/galeri');
  }
  res.render('admin/gallery-form', { title: 'Ubah Foto Galeri', foto });
});

router.post('/galeri/:id/ubah', upload.single('image'), (req, res) => {
  const foto = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!foto) {
    flash(req, 'warning', 'Foto tidak ditemukan.');
    return res.redirect('/admin/galeri');
  }
  const title = String(req.body.title || '').trim();
  const caption = String(req.body.caption || '').trim();
  if (!title) {
    flash(req, 'danger', 'Judul foto wajib diisi.');
    return res.redirect(`/admin/galeri/${foto.id}/ubah`);
  }
  let image = foto.image;
  if (req.file) {
    removeUploadedImage(foto.image);
    image = '/public/uploads/' + req.file.filename;
  }
  db.prepare('UPDATE gallery SET title = ?, caption = ?, image = ? WHERE id = ?').run(title, caption, image, foto.id);
  flash(req, 'success', 'Foto galeri berhasil diperbarui.');
  res.redirect('/admin/galeri');
});

router.post('/galeri/:id/hapus', (req, res) => {
  const foto = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!foto) {
    flash(req, 'warning', 'Foto tidak ditemukan.');
    return res.redirect('/admin/galeri');
  }
  removeUploadedImage(foto.image);
  db.prepare('DELETE FROM gallery WHERE id = ?').run(foto.id);
  flash(req, 'success', 'Foto berhasil dihapus dari galeri.');
  res.redirect('/admin/galeri');
});

/* ============================================================
   7. LAPORAN PENJUALAN — lihat & unduh per periode
   ============================================================ */
function reportRows(from, to) {
  return db
    .prepare(
      `SELECT * FROM orders
       WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
       ORDER BY created_at DESC`
    )
    .all(from, to);
}

router.get('/laporan', (req, res) => {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : firstOfMonth();
  const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : today();
  const orders = reportRows(from, to).map((o) => ({ ...o, items: orderItems(o.id) }));
  const valid = orders.filter((o) => o.status !== 'dibatalkan');
  const summary = {
    count: orders.length,
    revenue: valid.reduce((s, o) => s + o.total, 0),
    avg: valid.length ? Math.round(valid.reduce((s, o) => s + o.total, 0) / valid.length) : 0,
    cancelled: orders.length - valid.length,
  };
  const byStatus = ['pending', 'diproses', 'selesai', 'dibatalkan'].map((s) => ({
    status: s,
    count: orders.filter((o) => o.status === s).length,
  }));
  res.render('admin/report', { title: 'Laporan Penjualan', from, to, orders, summary, byStatus });
});

router.get('/laporan/unduh', (req, res) => {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : firstOfMonth();
  const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : today();
  const orders = reportRows(from, to).map((o) => ({ ...o, items: orderItems(o.id) }));

  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = [];
  lines.push(
    ['ID Pesanan', 'Tanggal', 'Customer', 'Item', 'Jumlah Item', 'Status', 'Total (Rp)'].map(esc).join(',')
  );
  for (const o of orders) {
    lines.push(
      [
        o.id,
        o.created_at,
        o.customer_name,
        o.items.map((i) => `${i.item_name} x${i.qty}`).join('; '),
        o.items.reduce((s, i) => s + i.qty, 0),
        o.status,
        o.total,
      ]
        .map(esc)
        .join(',')
    );
  }
  const totalValid = orders.filter((o) => o.status !== 'dibatalkan').reduce((s, o) => s + o.total, 0);
  lines.push('');
  lines.push([`Periode ${from} s.d. ${to}`, '', '', '', '', 'Total Pendapatan', totalValid].map(esc).join(','));

  const csv = '\uFEFF' + lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="laporan-penjualan-${from}-sd-${to}.csv"`);
  res.send(csv);
});

module.exports = router;
