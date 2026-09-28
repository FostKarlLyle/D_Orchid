const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { flash, requireAuth } = require('../middleware');
const { upload, removeUploadedImage } = require('../upload');
const { FASE_LIST, JENIS_LIST } = require('../helpers');

router.use(requireAuth('karyawan'));

/* ============================================================
   Beranda karyawan → data anggrek
   ============================================================ */
router.get('/', (req, res) => res.redirect('/karyawan/anggrek'));

/* ============================================================
   1. DATA AKUN — lihat & ubah akun sendiri
   ============================================================ */
router.get('/akun', (req, res) => {
  const akun = db.prepare('SELECT * FROM users WHERE id = ?').get(res.locals.user.id);
  const stats = {
    orchids: db.prepare('SELECT COUNT(*) AS v FROM orchids WHERE created_by = ?').get(akun.id).v,
    inCatalog: db
      .prepare(
        'SELECT COUNT(*) AS v FROM catalog c JOIN orchids o ON o.id = c.orchid_id WHERE o.created_by = ?'
      )
      .get(akun.id).v,
  };
  res.render('karyawan/account', { title: 'Data Akun', akun, stats });
});

router.post('/akun', (req, res) => {
  const akun = db.prepare('SELECT * FROM users WHERE id = ?').get(res.locals.user.id);
  const { name, email, phone = '', address = '', password } = req.body;
  if (!name || !email) {
    flash(req, 'danger', 'Nama dan email wajib diisi.');
    return res.redirect('/karyawan/akun');
  }
  const exists = db
    .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .get(String(email).trim().toLowerCase(), akun.id);
  if (exists) {
    flash(req, 'danger', 'Email sudah digunakan akun lain.');
    return res.redirect('/karyawan/akun');
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
  flash(req, 'success', 'Data akun berhasil diperbarui.');
  res.redirect('/karyawan/akun');
});

/* ============================================================
   2. MANAJEMEN DATA ANGGREK — CRUD
   ============================================================ */
router.get('/anggrek', (req, res) => {
  const q = String(req.query.q || '').trim();
  const fase = FASE_LIST.includes(req.query.fase) ? req.query.fase : '';
  let sql = `
    SELECT o.*, u.name AS creator_name, c.id AS catalog_id
    FROM orchids o
    LEFT JOIN users u ON u.id = o.created_by
    LEFT JOIN catalog c ON c.orchid_id = o.id
    WHERE 1 = 1`;
  const params = [];
  if (q) {
    sql += ' AND (o.name LIKE ? OR o.jenis LIKE ? OR o.varietas LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (fase) {
    sql += ' AND o.fase = ?';
    params.push(fase);
  }
  sql += ' ORDER BY o.created_at DESC';
  const orchids = db.prepare(sql).all(...params);
  res.render('karyawan/orchids', { title: 'Manajemen Data Anggrek', orchids, q, fase });
});

router.get('/anggrek/tambah', (req, res) => {
  res.render('karyawan/orchid-form', { title: 'Tambah Data Anggrek', orchid: null });
});

router.post('/anggrek/tambah', upload.single('image'), (req, res) => {
  const d = validateOrchid(req.body);
  if (d.error) {
    flash(req, 'danger', d.error);
    return res.redirect('/karyawan/anggrek/tambah');
  }
  db.prepare(
    `INSERT INTO orchids (name, jenis, varietas, fase, stock, description, image, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    d.name,
    d.jenis,
    d.varietas,
    d.fase,
    d.stock,
    d.description,
    req.file ? '/public/uploads/' + req.file.filename : '',
    res.locals.user.id
  );
  flash(req, 'success', `Data anggrek "${d.name}" berhasil dibuat.`);
  res.redirect('/karyawan/anggrek');
});

router.get('/anggrek/:id/ubah', (req, res) => {
  const orchid = db.prepare('SELECT * FROM orchids WHERE id = ?').get(req.params.id);
  if (!orchid) {
    flash(req, 'warning', 'Data anggrek tidak ditemukan.');
    return res.redirect('/karyawan/anggrek');
  }
  res.render('karyawan/orchid-form', { title: 'Ubah Data Anggrek', orchid });
});

router.post('/anggrek/:id/ubah', upload.single('image'), (req, res) => {
  const orchid = db.prepare('SELECT * FROM orchids WHERE id = ?').get(req.params.id);
  if (!orchid) {
    flash(req, 'warning', 'Data anggrek tidak ditemukan.');
    return res.redirect('/karyawan/anggrek');
  }
  const d = validateOrchid(req.body);
  if (d.error) {
    flash(req, 'danger', d.error);
    return res.redirect(`/karyawan/anggrek/${orchid.id}/ubah`);
  }
  let image = orchid.image;
  if (req.file) {
    removeUploadedImage(orchid.image);
    image = '/public/uploads/' + req.file.filename;
  }
  if (req.body.remove_image === '1' && !req.file) {
    removeUploadedImage(orchid.image);
    image = '';
  }
  db.prepare(
    `UPDATE orchids SET name = ?, jenis = ?, varietas = ?, fase = ?, stock = ?,
     description = ?, image = ?, updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(d.name, d.jenis, d.varietas, d.fase, d.stock, d.description, image, orchid.id);
  // Sinkronisasi: stok yang tampil di katalog mengikuti data anggrek
  const inCatalog = db.prepare('SELECT id FROM catalog WHERE orchid_id = ?').get(orchid.id);
  if (orchid.stock !== d.stock && inCatalog) {
    flash(req, 'success', `Data anggrek diperbarui — stok ${orchid.stock} → ${d.stock} pot. Stok di katalog ikut ter-update otomatis. 🔄`);
  } else {
    flash(req, 'success', 'Data anggrek berhasil diperbarui.');
  }
  res.redirect('/karyawan/anggrek');
});

router.post('/anggrek/:id/hapus', (req, res) => {
  const orchid = db.prepare('SELECT * FROM orchids WHERE id = ?').get(req.params.id);
  if (!orchid) {
    flash(req, 'warning', 'Data anggrek tidak ditemukan.');
    return res.redirect('/karyawan/anggrek');
  }
  db.prepare('DELETE FROM orchids WHERE id = ?').run(orchid.id);
  removeUploadedImage(orchid.image);
  flash(req, 'success', `Data anggrek "${orchid.name}" berhasil dihapus.`);
  res.redirect('/karyawan/anggrek');
});

function validateOrchid(b) {
  const name = String(b.name || '').trim();
  const jenis = String(b.jenis || '').trim();
  const varietas = String(b.varietas || '').trim();
  const fase = String(b.fase || '').trim();
  const stock = parseInt(b.stock, 10);
  const description = String(b.description || '').trim();
  if (!name) return { error: 'Nama anggrek wajib diisi.' };
  if (!JENIS_LIST.includes(jenis)) return { error: 'Jenis anggrek tidak valid.' };
  if (!FASE_LIST.includes(fase)) return { error: 'Fase pertumbuhan tidak valid.' };
  if (Number.isNaN(stock) || stock < 0) return { error: 'Stok harus angka >= 0.' };
  return { name, jenis, varietas, fase, stock, description };
}


module.exports = router;
