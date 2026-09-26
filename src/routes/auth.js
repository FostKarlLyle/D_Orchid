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

  if (!name || !email || !password) {
    flash(req, 'danger', 'Nama, email, dan password wajib diisi.');
    return res.redirect('/register');
  }
  if (password.length < 6) {
    flash(req, 'danger', 'Password minimal 6 karakter.');
    return res.redirect('/register');
  }
  if (password !== confirm) {
    flash(req, 'danger', 'Konfirmasi password tidak sama.');
    return res.redirect('/register');
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) {
    flash(req, 'danger', 'Email sudah terdaftar. Silakan login.');
    return res.redirect('/login');
  }
  const info = db
    .prepare(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(name, email, bcrypt.hashSync(password, 10), 'customer', phone, address);
  req.session.userId = info.lastInsertRowid;
  flash(req, 'success', 'Registrasi berhasil! Selamat berbelanja 🌸');
  res.redirect('/customer');
});

// ---- Logout ----
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
