const db = require('./db');

function flash(req, type, msg) {
  req.session.flash = { type, msg };
}

function requireAuth(...roles) {
  return (req, res, next) => {
    const user = res.locals.user;
    if (!user) {
      flash(req, 'warning', 'Silakan login terlebih dahulu.');
      return res.redirect('/login');
    }
    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).render('error', {
        title: 'Akses Ditolak',
        message: 'Anda tidak punya akses ke halaman ini.',
      });
    }
    next();
  };
}

function roleHome(role) {
  /* langsung ke halaman yang me-render (hindari rantai redirect
     yang bisa menelan flash sebelum tampil) */
  if (role === 'admin') return '/admin';
  if (role === 'karyawan') return '/karyawan/anggrek';
  return '/customer/katalog';
}

// Ambil barang keranjang/cart id customer (untuk kebutuhan tampilan)
function customerById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

module.exports = { flash, requireAuth, roleHome, customerById };
