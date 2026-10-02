const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { flash, roleHome } = require('../middleware');

// Halaman root → login atau home sesuai role
router.get('/', (req, res) => {
  if (res.locals.user) return res.redirect(roleHome(res.locals.user.role));
  res.redirect('/login');
});

// ---- Login ----
router.get('/login', (req, res) => {
  if (res.locals.user) return res.redirect(roleHome(res.locals.user.role));
  res.render('auth/login', { title: 'Login' });
});

router.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) {
    flash(req, 'danger', 'Email dan password wajib diisi.');
    return res.redirect('/login');
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    flash(req, 'danger', 'Email atau password salah.');
    return res.redirect('/login');
  }
  req.session.userId = user.id;
  flash(req, 'success', `Selamat datang, ${user.name}!`);
  res.redirect(roleHome(user.role));
});

// ---- Register (khusus customer) ----
router.get('/register', (req, res) => {
  if (res.locals.user) return res.redirect(roleHome(res.locals.user.role));
  res.render('auth/register', { title: 'Register' });
});

router.post('/register', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const address = String(req.body.address || '').trim();
  const password = String(req.body.password || '');
  const confirm = String(req.body.confirm || '');

  /* Aturan pendaftaran (sama dengan versi static) */
  if (!name || !email || !password) {
    flash(req, 'danger', 'Nama, email, dan password wajib diisi.');
    return res.redirect('/register');
  }
  if (name.length < 2) {
    flash(req, 'danger', 'Nama lengkap minimal 2 karakter.');
    return res.redirect('/register');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    flash(req, 'danger', 'Format email tidak valid. Contoh: nama@email.com');
    return res.redirect('/register');
  }
  if (password.length < 8) {
    flash(req, 'danger', 'Password minimal 8 karakter.');
    return res.redirect('/register');
  }
  if (!(/[A-Za-z]/.test(password) && /\d/.test(password))) {
    flash(req, 'danger', 'Password harus mengandung huruf dan angka.');
    return res.redirect('/register');
  }
  if (password !== confirm) {
    flash(req, 'danger', 'Konfirmasi password tidak sama.');
    return res.redirect('/register');
  }
  if (phone && phone.replace(/\D/g, '').length < 8) {
    flash(req, 'danger', 'No. HP minimal 8 digit angka.');
    return res.redirect('/register');
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) {
    /* perbaikan: kembali ke halaman register, bukan dilempar ke login */
    flash(req, 'danger', 'Email sudah terdaftar. Gunakan email lain atau login.');
    return res.redirect('/register');
  }
  const info = db
    .prepare(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(name, email, bcrypt.hashSync(password, 10), 'customer', phone, address);
  req.session.userId = info.lastInsertRowid;
  flash(req, 'success', 'Registrasi berhasil! Selamat berbelanja 🌸');
  res.redirect('/customer/katalog');
});

// ---- Logout ----
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
