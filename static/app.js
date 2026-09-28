/* ============================================================
   D'Orchid — App: router hash + auth + boot (versi static)
   Buka langsung: klik ganda index.html (tanpa server).
   ============================================================ */
(function () {
  'use strict';
  var S = window.Store, U = window.UI, e = U.e;

  /* ---------- util: baca file gambar → dataURL (untuk file://) ---------- */
  window.readFileData = function (file, cb) {
    if (!file) return cb(null, 'File tidak ditemukan.');
    if (file.size > 700 * 1024) return cb(null, 'File terlalu besar (maks 700 KB).');
    var reader = new FileReader();
    reader.onload = function () { cb(reader.result, null); };
    reader.onerror = function () { cb(null, 'Gagal membaca file.'); };
    reader.readAsDataURL(file);
  };

  /* ---------- halaman auth (bare / tanpa shell) ---------- */
  var Auth = {
    login: function () {
      var html = `
        <div class="auth-wrap">
          <div class="auth-hero" style="background-image:url('images/hero-login.jpg')">
            <div class="auth-hero-inner">
              <div class="auth-brand">
                <div class="brand-badge" style="width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.15);display:grid;place-items:center;font-size:22px">🌸</div>
                D'Orchid
              </div>
              <h1>Anggrek indah,<br>rawatan penuh cinta.</h1>
              <p>Katalog anggrek pilihan, dirawat langsung oleh tenaga perawatan kami. Prototipe UI — tanpa server.</p>
            </div>
          </div>
          <div class="auth-form-side">
            <div class="auth-card">
              <h2>Selamat datang 👋</h2>
              <div class="hint">Login ke akun demo untuk melihat tampilan tiap role.</div>
              ${U.flashHTML()}
              <form data-form="login">
                <div class="mb-3"><label class="form-label">Email</label>
                  <div class="input-group"><span class="input-group-text"><i class="bi bi-envelope"></i></span>
                  <input type="email" name="email" class="form-control" placeholder="nama@email.com" required autofocus /></div></div>
                <div class="mb-4"><label class="form-label">Password</label>
                  <div class="input-group"><span class="input-group-text"><i class="bi bi-lock"></i></span>
                  <input type="password" name="password" class="form-control" placeholder="••••••••" required /></div></div>
                <button class="btn-accent w-100" type="submit"><i class="bi bi-box-arrow-in-right me-1"></i> Login</button>
              </form>
              <div class="auth-switch">Belum punya akun? <a href="#/register" class="link-plain">Daftar sebagai Customer</a></div>
              <div class="demo-box">
                <b>Akun demo:</b><br>
                Admin — <code>admin@d-orchid.id</code> / <code>admin123</code><br>
                Karyawan — <code>karyawan@d-orchid.id</code> / <code>karyawan123</code><br>
                Customer — <code>sari@mail.com</code> / <code>customer123</code>
              </div>
            </div>
          </div>
        </div>`;
      return {
        title: 'Login', bare: true, content: html,
        after: function (root) {
          root.querySelector('[data-form="login"]').onsubmit = function (ev) {
            ev.preventDefault();
            var email = root.querySelector('[name=email]').value;
            var pw = root.querySelector('[name=password]').value;
            var u = S.login(email, pw);
            if (!u) return U.toast('Email atau password salah.', 'err');
            U.toast('Selamat datang, ' + u.name + '! 🌸');
            location.hash = S.roleHome(u.role);
          };
        }
      };
    },

    register: function () {
      var html = `
        <div class="auth-wrap">
          <div class="auth-hero" style="background-image:url('images/hero-login.jpg')">
            <div class="auth-hero-inner">
              <div class="auth-brand">
                <div class="brand-badge" style="width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.15);display:grid;place-items:center;font-size:22px">🌸</div>
                D'Orchid
              </div>
              <h1>Gabung dan mulai<br>koleksi anggrekmu.</h1>
              <p>Daftar akun customer untuk menjelajahi katalog dan memberi ulasan.</p>
            </div>
          </div>
          <div class="auth-form-side">
            <div class="auth-card">
              <h2>Daftar Akun 🌱</h2>
              <div class="hint">Registrasi khusus customer.</div>
              ${U.flashHTML()}
              <form data-form="register">
                <div class="mb-3"><label class="form-label">Nama Lengkap</label>
                  <input type="text" name="name" class="form-control" required autofocus placeholder="Nama kamu" /></div>
                <div class="mb-3"><label class="form-label">Email</label>
                  <input type="email" name="email" class="form-control" required placeholder="nama@email.com" /></div>
                <div class="row g-2 mb-3">
                  <div class="col-sm-6"><label class="form-label">No. HP</label>
                    <input type="text" name="phone" class="form-control" placeholder="08xx-xxxx-xxxx" /></div>
                  <div class="col-sm-6"><label class="form-label">Password</label>
                    <input type="password" name="password" class="form-control" required minlength="6" placeholder="min. 6 karakter" /></div>
                </div>
                <div class="mb-3"><label class="form-label">Alamat</label>
                  <input type="text" name="address" class="form-control" placeholder="Alamat pengiriman" /></div>
                <div class="mb-4"><label class="form-label">Konfirmasi Password</label>
                  <input type="password" name="confirm" class="form-control" required placeholder="Ulangi password" /></div>
                <button class="btn-accent w-100" type="submit"><i class="bi bi-person-plus me-1"></i> Daftar Sekarang</button>
              </form>
              <div class="auth-switch">Sudah punya akun? <a href="#/login" class="link-plain">Login di sini</a></div>
            </div>
          </div>
        </div>`;
      return {
        title: 'Register', bare: true, content: html,
        after: function (root) {
          root.querySelector('[data-form="register"]').onsubmit = function (ev) {
            ev.preventDefault();
            var val = function (n) { return root.querySelector('[name=' + n + ']').value.trim(); };
            var data = {
              name: val('name'), email: val('email').toLowerCase(), phone: val('phone'),
              address: val('address'), password: root.querySelector('[name=password]').value
            };
            var confirm2 = root.querySelector('[name=confirm]').value;
            if (!data.name || !data.email || !data.password) return U.toast('Nama, email, dan password wajib diisi.', 'err');
            if (data.password.length < 6) return U.toast('Password minimal 6 karakter.', 'err');
            if (data.password !== confirm2) return U.toast('Konfirmasi password tidak sama.', 'err');
            var res = S.register(data);
            if (res.error) return U.toast(res.error, 'err');
            U.toast('Registrasi berhasil! Selamat berbelanja 🌸');
            location.hash = '#/customer';
          };
        }
      };
    }
  };

  function errorPage(title, message) {
    return {
      title: title, bare: true,
      content: `
        <div class="auth-wrap">
          <div class="auth-form-side" style="grid-column:1 / -1">
            <div class="auth-card" style="text-align:center">
              <div style="font-size:64px">🥀</div>
              <h2>${e(title)}</h2>
              <p class="hint">${e(message)}</p>
              <a href="#/" class="btn-accent d-inline-block text-decoration-none">
                <i class="bi bi-house me-1"></i> Kembali ke Beranda</a>
            </div>
          </div>
        </div>`
    };
  }

  /* ---------- tabel route ---------- */
  var routes = [
    // auth (public)
    { re: /^\/login$/, roles: 'public', view: Auth.login },
    { re: /^\/register$/, roles: 'public', view: Auth.register },

    // admin
    { re: /^\/admin$/, roles: ['admin'], view: function () { return VAdmin.dashboard(); } },
    { re: /^\/admin\/akun$/, roles: ['admin'], view: function (q) { return VAdmin.accounts(q); } },
    { re: /^\/admin\/akun\/tambah$/, roles: ['admin'], view: function (q) { return VAdmin.accountForm(q); } },
    { re: /^\/admin\/akun\/(\d+)\/ubah$/, roles: ['admin'], view: function (q, id) { return VAdmin.accountForm(q, id); } },
    { re: /^\/admin\/katalog$/, roles: ['admin'], view: function (q) { return VAdmin.catalog(q); } },
    { re: /^\/admin\/katalog\/tambah$/, roles: ['admin'], view: function (q) { return VAdmin.catalogPick(q); } },
    { re: /^\/admin\/katalog\/tambah\/(\d+)$/, roles: ['admin'], view: function (q, id) { return VAdmin.catalogPrice(q, id); } },
    { re: /^\/admin\/katalog\/(\d+)\/ubah$/, roles: ['admin'], view: function (q, id) { return VAdmin.catalogEdit(q, id); } },
    { re: /^\/admin\/pesanan$/, roles: ['admin'], view: function (q) { return VAdmin.orders(q); } },
    { re: /^\/admin\/pesanan\/(\d+)$/, roles: ['admin'], view: function (q, id) { return VAdmin.orderDetail(q, id); } },
    { re: /^\/admin\/ulasan$/, roles: ['admin'], view: function () { return VAdmin.reviews(); } },
    { re: /^\/admin\/galeri$/, roles: ['admin'], view: function () { return VAdmin.gallery(); } },
    { re: /^\/admin\/galeri\/tambah$/, roles: ['admin'], view: function (q) { return VAdmin.galleryForm(q); } },
    { re: /^\/admin\/galeri\/(\d+)\/ubah$/, roles: ['admin'], view: function (q, id) { return VAdmin.galleryForm(q, id); } },
    { re: /^\/admin\/laporan$/, roles: ['admin'], view: function (q) { return VAdmin.report(q); } },

    // karyawan
    { re: /^\/karyawan$/, roles: ['karyawan'], to: '#/karyawan/anggrek' },
    { re: /^\/karyawan\/akun$/, roles: ['karyawan'], view: function () { return VKaryawan.account(); } },
    { re: /^\/karyawan\/anggrek$/, roles: ['karyawan'], view: function (q) { return VKaryawan.orchids(q); } },
    { re: /^\/karyawan\/anggrek\/tambah$/, roles: ['karyawan'], view: function (q) { return VKaryawan.orchidForm(q); } },
    { re: /^\/karyawan\/anggrek\/(\d+)\/ubah$/, roles: ['karyawan'], view: function (q, id) { return VKaryawan.orchidForm(q, id); } },
    { re: /^\/karyawan\/katalog$/, roles: ['karyawan'], view: function (q) { return VKaryawan.catalog(q); } },
    { re: /^\/karyawan\/katalog\/(\d+)\/ubah$/, roles: ['karyawan'], view: function (q, id) { return VKaryawan.catalogEdit(q, id); } },

    // customer
    { re: /^\/customer$/, roles: ['customer'], to: '#/customer/katalog' },
    { re: /^\/customer\/katalog$/, roles: ['customer'], view: function (q) { return VCustomer.catalog(q); } },
    { re: /^\/customer\/keranjang$/, roles: ['customer'], view: function () { return VCustomer.cart(); } },
    { re: /^\/customer\/pesanan$/, roles: ['customer'], view: function () { return VCustomer.orders(); } },
    { re: /^\/customer\/galeri$/, roles: ['customer'], view: function () { return VCustomer.gallery(); } },
    { re: /^\/customer\/ulasan$/, roles: ['customer'], view: function () { return VCustomer.reviews(); } },
    { re: /^\/customer\/akun$/, roles: ['customer'], view: function () { return VCustomer.account(); } }
  ];

  /* ---------- router ---------- */
  function parseHash() {
    var raw = location.hash.replace(/^#/, '');
    if (!raw || raw === '/') return { path: '/', query: {} };
    var parts = raw.split('?');
    var query = {};
    (parts[1] || '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = i < 0 ? kv : kv.slice(0, i);
      var v = i < 0 ? '' : kv.slice(i + 1);
      query[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    });
    return { path: parts[0], query: query };
  }

  function mount(view) {
    var app = document.getElementById('app');
    document.title = view.title + " · D'Orchid";
    if (view.bare) {
      app.innerHTML = view.content;
    } else {
      app.innerHTML = U.shell(view, view.content);
      U.bindShell();
    }
    if (view.after) view.after(app);
  }

  function render() {
    var user = S.currentUser();
    var h = parseHash();
    var path = h.path;

    if (path === '/' || path === '') {
      location.hash = user ? S.roleHome(user.role) : '#/login';
      return;
    }

    var matched = null;
    for (var i = 0; i < routes.length; i++) {
      var m = path.match(routes[i].re);
      if (m) { matched = { route: routes[i], m: m }; break; }
    }

    if (!matched) {
      mount(errorPage('404 Tidak Ditemukan', 'Halaman yang kamu cari tidak ada.'));
      return;
    }

    var route = matched.route;

    if (route.roles === 'public') {
      if (user) { location.hash = S.roleHome(user.role); return; }
      var pubView = route.view(h.query, matched.m[1] !== undefined ? Number(matched.m[1]) : undefined);
      if (pubView && pubView.redirect) { location.hash = pubView.redirect; return; }
      mount(pubView);
      return;
    }

    if (!user) {
      U.flash('warning', 'Silakan login terlebih dahulu.');
      location.hash = '#/login';
      return;
    }
    if (!route.roles.includes(user.role)) {
      mount(errorPage('Akses Ditolak', 'Anda tidak punya akses ke halaman ini.'));
      return;
    }
    if (route.to) { location.hash = route.to; return; }

    var view = route.view(h.query, matched.m[1] !== undefined ? Number(matched.m[1]) : undefined);
    if (view && view.redirect) { location.hash = view.redirect; return; }
    mount(view);
  }

  /* ---------- boot ---------- */
  window.App = { render: render, parseHash: parseHash };
  window.addEventListener('hashchange', render);
  if (!location.hash) location.hash = '#/login';
  render();
})();
