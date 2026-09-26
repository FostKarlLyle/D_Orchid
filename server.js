const path = require('path');
const express = require('express');
const session = require('express-session');

const db = require('./src/db');
const helpers = require('./src/helpers');
const { flash, roleHome } = require('./src/middleware');
require('./src/seed')();

const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use('/vendor/icons', express.static(path.join(__dirname, 'node_modules', 'bootstrap-icons', 'font')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: 'd-orchid rahasia super aman 2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// Locals untuk semua view
app.use((req, res, next) => {
  res.locals.user = null;
  if (req.session.userId) {
    const u = db
      .prepare('SELECT id, name, email, role, phone, address FROM users WHERE id = ?')
      .get(req.session.userId);
    if (u) res.locals.user = u;
    else delete req.session.userId;
  }
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.formatRp = helpers.formatRp;
  res.locals.formatDate = helpers.formatDate;
  res.locals.formatDateOnly = helpers.formatDateOnly;
  res.locals.formatDateInput = helpers.formatDateInput;
  res.locals.statusInfo = helpers.statusInfo;
  res.locals.stockInfo = helpers.stockInfo;
  res.locals.FASE_LIST = helpers.FASE_LIST;
  res.locals.JENIS_LIST = helpers.JENIS_LIST;
  res.locals.FASE_BADGE = helpers.FASE_BADGE;
  if (res.locals.user && res.locals.user.role === 'admin') {
    res.locals.pendingCount = db
      .prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'")
      .get().c;
  }
  next();
});

// Routes publik & auth
app.use(require('./src/routes/auth'));

// Routes per role
app.use('/admin', require('./src/routes/admin'));
app.use('/karyawan', require('./src/routes/karyawan'));
app.use('/customer', require('./src/routes/customer'));

// 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 Tidak Ditemukan',
    message: 'Halaman yang kamu cari tidak ada.',
  });
});

// Error handler (termasuk error multer/dll)
app.use((err, req, res, next) => {
  console.error(err);
  flash(req, 'danger', err.message || 'Terjadi kesalahan pada server.');
  const back = req.get('referer') || (res.locals.user ? roleHome(res.locals.user.role) : '/login');
  res.redirect(back);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`D'Orchid berjalan di http://0.0.0.0:${PORT}`);
});
