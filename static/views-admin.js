/* ============================================================
   D'Orchid — Views Admin (versi static)
   ============================================================ */
(function () {
  'use strict';
  var S = window.Store, U = window.UI, e = U.e;

  var V = {};

  /* ============ DASHBOARD ============ */
  V.dashboard = function () {
    var st = S.state;
    var valid = st.orders.filter(function (o) { return o.status !== 'dibatalkan'; });
    var stats = {
      revenue: valid.reduce(function (s, o) { return s + o.total; }, 0),
      monthRevenue: valid.filter(function (o) { return o.created_at.slice(0, 10) >= S.firstOfMonth(); })
        .reduce(function (s, o) { return s + o.total; }, 0),
      orders: st.orders.length,
      pending: st.orders.filter(function (o) { return o.status === 'pending'; }).length,
      orchids: st.orchids.length,
      catalogActive: st.catalog.filter(function (c) { return c.is_active; }).length,
      sellableStock: st.catalog.filter(function (c) { return c.is_active; }).reduce(function (s, c) {
        var o = S.orchidById(c.orchid_id); return s + (o ? o.stock : 0);
      }, 0),
      customers: st.users.filter(function (u) { return u.role === 'customer'; }).length,
      reviews: st.reviews.length
    };

    var byJenis = {};
    st.orchids.forEach(function (o) { byJenis[o.jenis] = (byJenis[o.jenis] || 0) + 1; });
    var jenisRows = Object.keys(byJenis).map(function (k) { return { jenis: k, jumlah: byJenis[k] }; })
      .sort(function (a, b) { return b.jumlah - a.jumlah; });
    var maxJenis = Math.max(1, ...jenisRows.map(function (r) { return r.jumlah; }));

    var byFase = {};
    st.orchids.forEach(function (o) { byFase[o.fase] = (byFase[o.fase] || 0) + 1; });
    var faseRows = S.FASE_LIST.map(function (f) { return { fase: f, jumlah: byFase[f] || 0 }; });
    var maxFase = Math.max(1, ...faseRows.map(function (r) { return r.jumlah; }));

    var stockRows = st.catalog.map(function (c) {
      var o = S.orchidById(c.orchid_id);
      if (!o) return null;
      return { c: c, o: o };
    }).filter(Boolean).sort(function (a, b) { return a.o.stock - b.o.stock; });

    var recent = st.orders.slice().sort(function (a, b) { return b.created_at.localeCompare(a.created_at); }).slice(0, 6);

    var html = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-icon i-violet"><i class="bi bi-cash-stack"></i></div>
          <div><div class="stat-label">Total Pendapatan</div><div class="stat-value">${e(S.rp(stats.revenue))}</div>
          <div class="stat-note">Bulan ini ${e(S.rp(stats.monthRevenue))}</div></div></div>
        <div class="stat-card"><div class="stat-icon i-pink"><i class="bi bi-bag-check"></i></div>
          <div><div class="stat-label">Total Pesanan</div><div class="stat-value">${stats.orders}</div>
          <div class="stat-note">${stats.pending} menunggu konfirmasi</div></div></div>
        <div class="stat-card"><div class="stat-icon i-teal"><i class="bi bi-flower2"></i></div>
          <div><div class="stat-label">Anggrek Tersedia</div>
          <div class="stat-value">${stats.sellableStock} <span style="font-size:13px;font-weight:600;color:var(--muted)">pot</span></div>
          <div class="stat-note">${stats.catalogActive} produk di katalog · ${stats.orchids} data anggrek</div></div></div>
        <div class="stat-card"><div class="stat-icon i-amber"><i class="bi bi-people"></i></div>
          <div><div class="stat-label">Customer</div><div class="stat-value">${stats.customers}</div>
          <div class="stat-note">${stats.reviews} ulasan terkumpul</div></div></div>
      </div>

      <div class="grid-2">
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-bar-chart-fill"></i> Jumlah Anggrek per Jenis</div>
          <div class="panel-sub">Ringkasan data anggrek berdasarkan jenisnya</div>
          ${jenisRows.length ? jenisRows.map(r => `
            <div class="bar-row"><div class="bar-name">${e(r.jenis)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(r.jumlah / maxJenis * 100)}%"></div></div>
            <div class="bar-val">${r.jumlah}</div></div>`).join('')
          : U.emptyState('bi-bar-chart', 'Belum ada data anggrek')}
        </div>
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-graph-up-arrow"></i> Jumlah Anggrek per Fase Pertumbuhan</div>
          <div class="panel-sub">Distribusi fase: bibit, anakan, remaja, dewasa, hingga berbunga</div>
          ${faseRows.map(r => `
            <div class="bar-row"><div class="bar-name">${U.faseBadge(r.fase)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(r.jumlah / maxFase * 100)}%"></div></div>
            <div class="bar-val ${r.jumlah === 0 ? 'zero' : ''}">${r.jumlah}</div></div>`).join('')}
        </div>
      </div>

      <div class="grid-2-1">
        <div class="panel">
          <div class="panel-pad pb-2">
            <div class="panel-title"><i class="bi bi-box-seam"></i> Stok Anggrek Tersedia untuk Dijual</div>
            <div class="panel-sub">Status stok produk yang ada di katalog</div>
          </div>
          <div class="table-responsive">
            <table class="table table-them align-middle">
              <thead><tr><th>Anggrek</th><th>Fase</th><th>Harga</th><th>Stok</th><th>Status</th></tr></thead>
              <tbody>
              ${stockRows.length ? stockRows.map(r => `
                <tr>
                  <td><div class="d-flex align-items-center gap-2">${U.thumb(r.o.image)}
                    <div><div class="cell-title">${e(r.o.name)}</div>
                    <div class="cell-sub">${e(r.o.jenis)} · ${e(r.o.varietas || '-')}${r.c.is_active ? '' : ' · <span class="text-danger">nonaktif</span>'}</div></div>
                  </div></td>
                  <td>${U.faseBadge(r.o.fase)}</td>
                  <td class="price-tag">${e(S.rp(r.c.price))}</td>
                  <td><b>${r.o.stock}</b> pot</td>
                  <td>${U.stockBadge(r.o.stock)}</td>
                </tr>`).join('')
              : `<tr><td colspan="5">${U.emptyState('bi-shop', 'Katalog masih kosong', 'Tambahkan data anggrek lewat tombol <b>+</b> di menu Katalog.')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-pad pb-2">
            <div class="panel-title"><i class="bi bi-clock-history"></i> Pesanan Terbaru</div>
            <div class="panel-sub">6 pesanan terakhir</div>
          </div>
          <div class="panel-pad pt-2">
            ${recent.length ? recent.map(o => `
              <div class="mb-3 pb-3" style="border-bottom:1px solid var(--line)">
                <div class="order-head">
                  <a class="link-plain" href="admin-pesanan-detail.html?id=${o.id}">#${o.id} — ${e(o.customer_name)}</a>
                  ${U.statusBadge(o.status)}
                </div>
                <div class="cell-sub mt-1">${e(S.fmtDate(o.created_at))}</div>
                <div class="price-tag mt-1">${e(S.rp(o.total))}</div>
              </div>`).join('')
            : U.emptyState('bi-bag', 'Belum ada pesanan')}
            <a href="admin-pesanan.html" class="btn-soft d-inline-block text-decoration-none">Lihat semua pesanan <i class="bi bi-arrow-right"></i></a>
          </div>
        </div>
      </div>`;

    return { title: 'Dashboard', nav: 'admin', active: 'admin-dashboard.html', content: html };
  };

  /* ============ DATA AKUN ============ */
  V.accounts = function (query) {
    var role = ['admin', 'karyawan', 'customer'].includes(query.role) ? query.role : 'admin';
    var q = (query.q || '').toLowerCase();
    var list = S.state.users.filter(function (u) {
      if (u.role !== role) return false;
      if (!q) return true;
      return (u.name + ' ' + u.email + ' ' + (u.phone || '')).toLowerCase().includes(q);
    }).sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });

    var counts = { admin: 0, karyawan: 0, customer: 0 };
    S.state.users.forEach(function (u) { counts[u.role]++; });
    var me = S.currentUser();

    var roleLabel = role === 'admin' ? 'Admin' : role === 'karyawan' ? 'Karyawan' : 'Customer';
    var canManage = role !== 'customer'; // admin tidak boleh menambah/mengubah akun customer
    var html = U.pageHead('Data Akun', 'Kelola akun admin, karyawan, dan customer',
      canManage
        ? `<a href="admin-akun-tambah.html?role=${role}" class="btn-accent"><i class="bi bi-person-plus-fill me-1"></i> Tambah Akun ${roleLabel}</a>`
        : '') + (role === 'customer'
        ? U.demoBanner('Akun <b>customer</b> hanya dapat <b>dilihat</b> oleh admin — penambahan & perubahan akun customer dinonaktifkan.') : '') + `
      <div class="panel" style="margin-bottom:18px">
        <div class="panel-pad d-flex flex-wrap gap-3 align-items-center justify-content-between">
          <div class="pill-tabs">
            ${['admin', 'karyawan', 'customer'].map(r => `
              <a href="admin-akun.html?role=${r}" class="${role === r ? 'active' : ''}">
                ${r.charAt(0).toUpperCase() + r.slice(1)} <span class="qty-pill">${counts[r]}</span></a>`).join('')}
          </div>
          <form class="d-flex gap-2" data-form="akun-search">
            <input type="hidden" name="role" value="${e(role)}" />
            <div class="search-box"><i class="bi bi-search"></i>
              <input class="form-control" type="text" name="q" value="${e(query.q || '')}" placeholder="Cari nama / email..." /></div>
            <button class="btn-soft" type="submit">Cari</button>
          </form>
        </div>
        <div class="table-responsive">
          <table class="table table-them align-middle">
            <thead><tr><th>Nama</th><th>Email</th><th>No. HP</th><th>Alamat</th><th>Terdaftar</th><th class="text-end">Aksi</th></tr></thead>
            <tbody>
            ${list.length ? list.map(a => `
              <tr>
                <td><div class="d-flex align-items-center gap-2">
                  <div class="avatar" style="width:36px;height:36px;font-size:14px">${e(a.name.trim().charAt(0).toUpperCase())}</div>
                  <div><div class="cell-title">${e(a.name)}${a.id === me.id ? ' <span class="badge bg-success" style="font-size:10px">Kamu</span>' : ''}</div>
                  <div class="cell-sub">${e(a.role)}</div></div></div></td>
                <td>${e(a.email)}</td><td>${e(a.phone || '-')}</td><td>${e(a.address || '-')}</td>
                <td class="cell-sub">${e(S.fmtDateOnly(a.created_at))}</td>
                <td class="text-end">
                  ${a.role !== 'customer'
                    ? `<a class="btn-icon b-edit" href="admin-akun-ubah.html?id=${a.id}" title="Ubah"><i class="bi bi-pencil"></i></a>`
                    : ''}
                  ${a.id !== me.id ? `
                  <button class="btn-icon b-del" title="Hapus" data-del="user:${a.id}"><i class="bi bi-trash3"></i></button>` : ''}
                </td>
              </tr>`).join('')
            : `<tr><td colspan="6">${U.emptyState('bi-people', 'Tidak ada akun ' + roleLabel + ' ditemukan')}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;

    return {
      title: 'Data Akun', nav: 'admin', active: 'admin-akun.html', content: html,
      after: function (root) {
        var f = root.querySelector('[data-form="akun-search"]');
        if (f) f.onsubmit = function (ev) {
          ev.preventDefault();
          var role2 = f.role.value, q2 = f.q.value.trim();
          location.href = 'admin-akun.html?role=' + role2 + (q2 ? '&q=' + encodeURIComponent(q2) : '');
        };
        root.querySelectorAll('[data-del^="user:"]').forEach(function (btn) {
          btn.onclick = function () {
            var id = Number(btn.getAttribute('data-del').split(':')[1]);
            var u = S.userById(id);
            if (!u || !confirm('Hapus akun "' + u.name + '"? (demo UI — data disimpan di browser ini)')) return;
            S.state.users = S.state.users.filter(function (x) { return x.id !== id; });
            S.save();
            U.toast('Akun "' + u.name + '" dihapus.');
            U.flash('success', 'Akun "' + u.name + '" berhasil dihapus.');
            location.href = 'admin-akun.html?role=' + u.role;
            App.render();
          };
        });
      }
    };
  };

  V.accountForm = function (query, id) {
    var role = ['admin', 'karyawan', 'customer'].includes(query.role) ? query.role : 'admin';
    var akun = id ? S.userById(id) : null;
    if (id && !akun) { U.flash('warning', 'Akun tidak ditemukan.'); return { redirect: 'admin-akun.html' }; }
    // Guard: admin tidak dapat menambah atau mengubah akun customer
    if ((!id && role === 'customer') || (akun && akun.role === 'customer')) {
      U.flash('warning', 'Admin tidak dapat menambah atau mengubah akun customer.');
      return { redirect: 'admin-akun.html?role=customer' };
    }
    if (akun) role = akun.role;
    var roleLabel = role === 'admin' ? 'Admin' : role === 'karyawan' ? 'Karyawan' : 'Customer';

    var html = U.pageHead(`${akun ? 'Ubah' : 'Tambah'} Akun ${roleLabel}`,
      `<a class="link-plain" href="admin-akun.html?role=${role}"><i class="bi bi-arrow-left"></i> Kembali ke data akun</a>`) + `
      <div class="panel panel-pad" style="max-width:760px">
        <form data-form="akun" class="row g-3">
          ${akun ? '' : `<input type="hidden" name="role" value="${e(role)}" />`}
          <div class="col-md-6"><label class="form-label">Nama Lengkap *</label>
            <input type="text" name="name" class="form-control" required value="${e(akun ? akun.name : '')}" /></div>
          <div class="col-md-6"><label class="form-label">Email *</label>
            <input type="email" name="email" class="form-control" required value="${e(akun ? akun.email : '')}" /></div>
          <div class="col-md-6"><label class="form-label">No. HP</label>
            <input type="text" name="phone" class="form-control" value="${e(akun ? akun.phone : '')}" placeholder="08xx-xxxx-xxxx" /></div>
          <div class="col-md-6"><label class="form-label">Password ${akun ? '(kosongkan jika tidak diganti)' : '*'}</label>
            <input type="password" name="password" class="form-control" minlength="6" ${akun ? '' : 'required'} placeholder="min. 6 karakter" /></div>
          <div class="col-12"><label class="form-label">Alamat</label>
            <input type="text" name="address" class="form-control" value="${e(akun ? akun.address : '')}" /></div>
          <div class="col-12 d-flex gap-2">
            <button class="btn-accent" type="submit"><i class="bi bi-check2-circle me-1"></i> ${akun ? 'Simpan Perubahan' : 'Tambah Akun'}</button>
            <a href="admin-akun.html?role=${e(role)}" class="btn-soft">Batal</a>
          </div>
        </form>
      </div>`;

    return {
      title: akun ? 'Ubah Akun' : 'Tambah Akun', nav: 'admin', active: 'admin-akun.html', content: html,
      after: function (root) {
        root.querySelector('[data-form="akun"]').onsubmit = function (ev) {
          ev.preventDefault();
          var name = root.querySelector('[name=name]').value.trim();
          var email = root.querySelector('[name=email]').value.trim().toLowerCase();
          var phone = root.querySelector('[name=phone]').value.trim();
          var address = root.querySelector('[name=address]').value.trim();
          var password = root.querySelector('[name=password]').value;
          if (!name || !email) return U.toast('Nama dan email wajib diisi.', 'err');
          var dup = S.state.users.find(function (u) { return u.email.toLowerCase() === email && (!akun || u.id !== akun.id); });
          if (dup) return U.toast('Email sudah digunakan akun lain.', 'err');
          if (akun) {
            akun.name = name; akun.email = email; akun.phone = phone; akun.address = address;
            if (password) {
              if (password.length < 6) return U.toast('Password minimal 6 karakter.', 'err');
              akun.password = password;
            }
          } else {
            if (password.length < 6) return U.toast('Password minimal 6 karakter.', 'err');
            var r = root.querySelector('[name=role]').value;
            S.state.users.push({
              id: S.nextId(S.state.users), name: name, email: email, password: password,
              role: r, phone: phone, address: address, created_at: S.now(0, 0)
            });
          }
          S.save();
          U.toast('Akun berhasil disimpan.', 'ok');
          U.flash('success', akun ? 'Akun berhasil diperbarui.' : 'Akun berhasil ditambahkan.');
          location.href = 'admin-akun.html?role=' + (akun ? akun.role : root.querySelector('[name=role]').value);
        };
      }
    };
  };

  /* ============ KATALOG (+) ============ */
  V.catalog = function (query) {
    var q = (query.q || '').toLowerCase();
    var rows = S.state.catalog.map(function (c) {
      var o = S.orchidById(c.orchid_id);
      if (!o) return null;
      var revs = S.state.reviews.filter(function (r) { return r.catalog_id === c.id; });
      var avg = revs.length ? Math.round((revs.reduce(function (s, r) { return s + r.rating; }, 0) / revs.length) * 10) / 10 : null;
      return { c: c, o: o, avg: avg, rc: revs.length };
    }).filter(Boolean).filter(function (r) {
      if (!q) return true;
      return (r.o.name + ' ' + r.o.jenis + ' ' + r.o.varietas).toLowerCase().includes(q);
    }).sort(function (a, b) { return b.c.created_at.localeCompare(a.c.created_at); });

    var html = U.pageHead('Katalog Anggrek',
      'Anggrek yang dipilih dari data tenaga kerja untuk dijual ke customer',
      `<a href="admin-katalog-tambah.html" class="btn-accent" style="font-size:16px;padding:10px 22px"><i class="bi bi-plus-lg" style="font-weight:900"></i> Tambah ke Katalog</a>`) + `
      <div class="panel" style="margin-bottom:18px">
        <div class="panel-pad pb-0 d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div class="text-muted-2"><i class="bi bi-info-circle me-1"></i>
            Tekan tombol <b>+</b> untuk memilih <b>data anggrek</b> yang dibuat karyawan, lalu tentukan harga jualnya.
            <b>Stok</b> pada tabel ini mengikuti data anggrek — saat karyawan memperbarui stok, katalog ikut ter-update otomatis.</div>
          <form class="d-flex gap-2 mb-3" data-form="cari">
            <div class="search-box"><i class="bi bi-search"></i>
              <input class="form-control" type="text" name="q" value="${e(query.q || '')}" placeholder="Cari nama / jenis / varietas..." /></div>
            <button class="btn-soft" type="submit">Cari</button>
          </form>
        </div>
        <div class="table-responsive mt-3">
          <table class="table table-them align-middle">
            <thead><tr><th>Produk</th><th>Fase</th><th>Harga</th><th>Stok</th><th>Rating</th><th>Status</th><th class="text-end">Aksi</th></tr></thead>
            <tbody>
            ${rows.length ? rows.map(r => `
              <tr>
                <td><div class="d-flex align-items-center gap-2">${U.thumb(r.o.image)}
                  <div><div class="cell-title">${e(r.o.name)}</div>
                  <div class="cell-sub">${e(r.o.jenis)} · ${e(r.o.varietas || '-')}</div></div></div></td>
                <td>${U.faseBadge(r.o.fase)}</td>
                <td class="price-tag">${e(S.rp(r.c.price))}</td>
                <td><b>${r.o.stock}</b> pot</td>
                <td>${r.rc ? `<span class="stars">★ ${r.avg}</span> <span class="cell-sub">(${r.rc})</span>` : '<span class="cell-sub">Belum ada ulasan</span>'}</td>
                <td>${r.c.is_active ? '<span class="badge bg-success">Aktif</span>' : '<span class="badge bg-secondary">Nonaktif</span>'}</td>
                <td class="text-end">
                  <a class="btn-icon b-edit" href="admin-katalog-ubah.html?id=${r.c.id}" title="Ubah harga"><i class="bi bi-pencil"></i></a>
                  <button class="btn-icon b-del" title="Hapus dari katalog" data-del="catalog:${r.c.id}"><i class="bi bi-trash3"></i></button>
                </td>
              </tr>`).join('')
            : `<tr><td colspan="7">${U.emptyState('bi-shop', 'Katalog masih kosong', 'Tekan <b>+ Tambah ke Katalog</b> untuk memilih data anggrek dari tenaga kerja.')}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;

    return {
      title: 'Katalog Anggrek', nav: 'admin', active: 'admin-katalog.html', content: html,
      after: function (root) {
        root.querySelector('[data-form="cari"]').onsubmit = function (ev) {
          ev.preventDefault();
          var v = root.querySelector('[name=q]').value.trim();
          location.href = 'admin-katalog.html' + (v ? '?q=' + encodeURIComponent(v) : '');
        };
        root.querySelectorAll('[data-del^="catalog:"]').forEach(function (btn) {
          btn.onclick = function () {
            var id = Number(btn.getAttribute('data-del').split(':')[1]);
            var c = S.catalogById(id);
            var o = c ? S.orchidById(c.orchid_id) : null;
            if (!c || !confirm('Hapus "' + (o ? o.name : '') + '" dari katalog? Data anggrek tidak ikut terhapus.')) return;
            S.state.catalog = S.state.catalog.filter(function (x) { return x.id !== id; });
            S.save();
            U.flash('success', 'Produk dihapus dari katalog. Data anggrek tetap tersimpan.');
            App.render();
          };
        });
      }
    };
  };

  V.catalogPick = function (query) {
    var q = (query.q || '').toLowerCase();
    var rows = S.state.orchids.map(function (o) {
      return { o: o, cat: S.catalogOfOrchid(o.id) };
    }).filter(function (r) {
      if (!q) return true;
      return (r.o.name + ' ' + r.o.jenis + ' ' + r.o.varietas).toLowerCase().includes(q);
    }).sort(function (a, b) { return b.o.created_at.localeCompare(a.o.created_at); });

    var html = U.pageHead('Pilih Data Anggrek',
      'Data anggrek dibuat oleh tenaga perawatan (karyawan) — pilih mana yang mau dijual di katalog',
      `<a href="admin-katalog.html" class="btn-soft"><i class="bi bi-arrow-left me-1"></i> Kembali ke Katalog</a>`) + `
      <div class="panel" style="margin-bottom:18px">
        <div class="panel-pad pb-0 d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div class="text-muted-2"><i class="bi bi-lightbulb text-warning me-1"></i>
            Anggrek yang <b>sudah ada di katalog</b> ditandai badge <span class="badge bg-success">Sudah di katalog</span> dan tidak bisa dipilih ulang.</div>
          <form class="d-flex gap-2 mb-3" data-form="cari">
            <div class="search-box"><i class="bi bi-search"></i>
              <input class="form-control" type="text" name="q" value="${e(query.q || '')}" placeholder="Cari nama / jenis / varietas..." /></div>
            <button class="btn-soft" type="submit">Cari</button>
          </form>
        </div>
        <div class="table-responsive mt-3">
          <table class="table table-them align-middle">
            <thead><tr><th>Data Anggrek</th><th>Jenis</th><th>Varietas</th><th>Fase</th><th>Stok</th><th>Dibuat Oleh</th><th class="text-end">Aksi</th></tr></thead>
            <tbody>
            ${rows.length ? rows.map(r => {
              var creator = S.userById(r.o.created_by);
              return `
              <tr>
                <td><div class="d-flex align-items-center gap-2">${U.thumb(r.o.image)}
                  <div><div class="cell-title">${e(r.o.name)}</div>
                  <div class="cell-sub">${e(r.o.description ? (r.o.description.length > 60 ? r.o.description.slice(0, 60) + '…' : r.o.description) : 'Tanpa deskripsi')}</div></div></div></td>
                <td>${e(r.o.jenis)}</td><td>${e(r.o.varietas || '-')}</td>
                <td>${U.faseBadge(r.o.fase)}</td>
                <td><b>${r.o.stock}</b> pot</td>
                <td class="cell-sub">${e(creator ? creator.name : '-')}<br>${e(S.fmtDateOnly(r.o.created_at))}</td>
                <td class="text-end">
                  ${r.cat
                    ? `<span class="badge bg-success"><i class="bi bi-check-lg"></i> Sudah di katalog</span>
                       <a class="btn-icon b-eye" href="admin-katalog.html" title="Lihat katalog"><i class="bi bi-eye"></i></a>`
                    : `<a class="btn-accent" href="admin-katalog-harga.html?id=${r.o.id}" style="padding:8px 16px;font-size:13.5px"><i class="bi bi-plus-lg"></i> Pilih</a>`}
                </td>
              </tr>`;
            }).join('')
            : `<tr><td colspan="7">${U.emptyState('bi-flower2', 'Belum ada data anggrek', 'Minta karyawan membuat data anggrek terlebih dahulu.')}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;

    return {
      title: 'Tambah Katalog', nav: 'admin', active: 'admin-katalog.html', content: html,
      after: function (root) {
        root.querySelector('[data-form="cari"]').onsubmit = function (ev) {
          ev.preventDefault();
          var v = root.querySelector('[name=q]').value.trim();
          location.href = 'admin-katalog-tambah.html' + (v ? '?q=' + encodeURIComponent(v) : '');
        };
      }
    };
  };

  V.catalogPrice = function (query, orchidId) {
    var o = S.orchidById(orchidId);
    if (!o || S.catalogOfOrchid(o.id)) {
      U.flash('warning', !o ? 'Data anggrek tidak ditemukan.' : 'Anggrek ini sudah ada di katalog.');
      return { redirect: 'admin-katalog-tambah.html' };
    }
    var html = U.pageHead('Tentukan Harga Jual', 'Anggrek terpilih akan dimasukkan ke katalog produk',
      `<a href="admin-katalog-tambah.html" class="btn-soft"><i class="bi bi-arrow-left me-1"></i> Kembali memilih</a>`) + `
      <div class="grid-2-1">
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-tag-fill"></i> Formulir Katalog</div>
          <div class="panel-sub">Harga menjadi harga jual ke customer</div>
          <form data-form="harga">
            <div class="mb-3"><label class="form-label">Harga Jual (Rp) *</label>
              <div class="input-group"><span class="input-group-text">Rp</span>
              <input type="number" name="price" class="form-control" min="1" step="1000" required placeholder="contoh: 250000" autofocus /></div>
              <div class="text-muted-2 mt-1">Masukkan harga dalam rupiah tanpa titik/koma.</div></div>
            <div class="mb-3"><label class="form-label">Status</label>
              <input class="form-control" value="Aktif — langsung tampil di katalog customer" disabled /></div>
            <div class="d-flex gap-2">
              <button class="btn-accent" type="submit"><i class="bi bi-cart-plus me-1"></i> Tambahkan ke Katalog</button>
              <a href="admin-katalog-tambah.html" class="btn-soft">Batal</a>
            </div>
          </form>
        </div>
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-flower1"></i> Data Anggrek Terpilih</div>
          <div class="panel-sub">Dibuat oleh tenaga perawatan</div>
          ${o.image ? `<img src="${e(o.image)}" alt="" style="width:100%;height:200px;object-fit:cover;border-radius:14px;margin-bottom:14px" />` : ''}
          <h5 style="font-weight:800;margin-bottom:8px">${e(o.name)}</h5>
          <div class="mb-2">${U.faseBadge(o.fase)}</div>
          <table class="table table-sm mb-0" style="font-size:13.5px">
            <tr><td class="text-muted-2">Jenis</td><td class="text-end"><b>${e(o.jenis)}</b></td></tr>
            <tr><td class="text-muted-2">Varietas</td><td class="text-end"><b>${e(o.varietas || '-')}</b></td></tr>
            <tr><td class="text-muted-2">Stok</td><td class="text-end"><b>${o.stock} pot</b></td></tr>
            <tr><td class="text-muted-2">Terdaftar</td><td class="text-end"><b>${e(S.fmtDateOnly(o.created_at))}</b></td></tr>
          </table>
          ${o.description ? `<div class="text-muted-2 mt-3">${e(o.description)}</div>` : ''}
        </div>
      </div>`;

    return {
      title: 'Tentukan Harga', nav: 'admin', active: 'admin-katalog.html', content: html,
      after: function (root) {
        root.querySelector('[data-form="harga"]').onsubmit = function (ev) {
          ev.preventDefault();
          var price = Number(root.querySelector('[name=price]').value);
          if (!price || price <= 0) return U.toast('Harga harus lebih dari 0.', 'err');
          S.state.catalog.push({
            id: S.nextId(S.state.catalog), orchid_id: o.id, price: price, is_active: 1,
            created_at: S.now(0, 0), updated_at: S.now(0, 0)
          });
          S.save();
          U.flash('success', '"' + o.name + '" berhasil ditambahkan ke katalog dengan harga ' + S.rp(price) + '.');
          location.href = 'admin-katalog.html';
        };
      }
    };
  };

  V.catalogEdit = function (query, id) {
    var c = S.catalogById(id);
    var o = c ? S.orchidById(c.orchid_id) : null;
    if (!c || !o) {
      U.flash('warning', 'Data katalog tidak ditemukan.');
      return { redirect: 'admin-katalog.html' };
    }
    var html = U.pageHead('Ubah Harga Katalog',
      `<a class="link-plain" href="admin-katalog.html"><i class="bi bi-arrow-left"></i> Kembali ke katalog</a>`) + `
      <div class="panel panel-pad" style="max-width:640px">
        <div class="d-flex align-items-center gap-3 mb-4 pb-3" style="border-bottom:1px solid var(--line)">
          ${U.thumb(o.image, 'cell-thumb')}
          <div><div class="cell-title" style="font-size:16px">${e(o.name)}</div>
          <div class="cell-sub">${e(o.jenis)} · ${e(o.varietas || '-')}</div></div>
        </div>
        <form data-form="ubah">
          <div class="mb-3"><label class="form-label">Harga Jual (Rp) *</label>
            <div class="input-group"><span class="input-group-text">Rp</span>
            <input type="number" name="price" class="form-control" min="1" step="1000" required value="${Math.round(c.price)}" /></div>
            <div class="text-muted-2 mt-1">Saat ini: <b>${e(S.rp(c.price))}</b></div></div>
          <div class="mb-4"><label class="form-label">Status Katalog</label>
            <select name="is_active" class="form-select">
              <option value="1" ${c.is_active ? 'selected' : ''}>Aktif — tampil di katalog customer</option>
              <option value="0" ${c.is_active ? '' : 'selected'}>Nonaktif — sembunyikan dari customer</option>
            </select></div>
          <div class="d-flex gap-2">
            <button class="btn-accent" type="submit"><i class="bi bi-check2-circle me-1"></i> Simpan Perubahan</button>
            <a href="admin-katalog.html" class="btn-soft">Batal</a>
          </div>
        </form>
      </div>`;
    return {
      title: 'Ubah Harga Katalog', nav: 'admin', active: 'admin-katalog.html', content: html,
      after: function (root) {
        root.querySelector('[data-form="ubah"]').onsubmit = function (ev) {
          ev.preventDefault();
          var price = Number(root.querySelector('[name=price]').value);
          if (!price || price <= 0) return U.toast('Harga harus lebih dari 0.', 'err');
          c.price = price;
          c.is_active = root.querySelector('[name=is_active]').value === '1' ? 1 : 0;
          c.updated_at = S.now(0, 0);
          S.save();
          U.flash('success', 'Harga katalog berhasil diperbarui.');
          location.href = 'admin-katalog.html';
        };
      }
    };
  };

  /* ============ PESANAN (tanpa pembuatan — hanya lihat & update status) ============ */
  V.orders = function (query) {
    var status = ['pending', 'diproses', 'selesai', 'dibatalkan'].includes(query.status) ? query.status : '';
    var list = S.state.orders.filter(function (o) { return !status || o.status === status; })
      .sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
    var counts = { all: S.state.orders.length };
    ['pending', 'diproses', 'selesai', 'dibatalkan'].forEach(function (s) {
      counts[s] = S.state.orders.filter(function (o) { return o.status === s; }).length;
    });

    var html = U.pageHead('Pesanan', 'Lihat data pesanan, buat pesanan baru, dan perbarui statusnya',
      '<a class="btn-accent" href="admin-pesanan-tambah.html"><i class="bi bi-plus-lg me-1"></i> Buat Pesanan</a>') +
      U.demoBanner('Versi prototipe UI — <b>checkout customer dinonaktifkan</b>; pesanan dapat dibuat admin. Data disimpan di browser ini.') + `
      <div class="panel" style="margin-bottom:18px">
        <div class="panel-pad d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div class="pill-tabs">
            <a href="admin-pesanan.html" class="${status === '' ? 'active' : ''}">Semua <span class="qty-pill">${counts.all}</span></a>
            <a href="admin-pesanan.html?status=pending" class="${status === 'pending' ? 'active' : ''}">Menunggu <span class="qty-pill">${counts.pending}</span></a>
            <a href="admin-pesanan.html?status=diproses" class="${status === 'diproses' ? 'active' : ''}">Diproses <span class="qty-pill">${counts.diproses}</span></a>
            <a href="admin-pesanan.html?status=selesai" class="${status === 'selesai' ? 'active' : ''}">Selesai <span class="qty-pill">${counts.selesai}</span></a>
            <a href="admin-pesanan.html?status=dibatalkan" class="${status === 'dibatalkan' ? 'active' : ''}">Dibatalkan <span class="qty-pill">${counts.dibatalkan}</span></a>
          </div>
        </div>
        <div class="table-responsive mt-3">
          <table class="table table-them align-middle">
            <thead><tr><th>No.</th><th>Tanggal</th><th>Customer</th><th>Item</th><th>Total</th><th>Status</th><th class="text-end">Aksi</th></tr></thead>
            <tbody>
            ${list.length ? list.map(o => {
              var items = S.itemsOf(o.id);
              return `
              <tr>
                <td><b>#${o.id}</b></td>
                <td class="cell-sub">${e(S.fmtDate(o.created_at))}</td>
                <td><div class="cell-title">${e(o.customer_name)}</div>
                  ${o.metode ? `<div class="cell-sub"><i class="bi bi-credit-card me-1"></i>${e(o.metode)}${o.alamat ? ' · ' + e(o.alamat) : ''}</div>` : ''}
                  ${o.note ? `<div class="cell-sub"><i class="bi bi-sticky me-1"></i>${e(o.note)}</div>` : ''}</td>
                <td style="max-width:280px">${items.map((i, idx) =>
                  `<div class="cell-sub">${idx + 1}. ${e(i.item_name)} <span class="qty-pill">×${i.qty}</span></div>`).join('')}</td>
                <td class="price-tag">${e(S.rp(o.total))}</td>
                <td>${U.statusBadge(o.status)}</td>
                <td class="text-end">
                  <a class="btn-icon b-eye" href="admin-pesanan-detail.html?id=${o.id}" title="Detail & ubah status"><i class="bi bi-eye"></i></a>
                </td>
              </tr>`;
            }).join('')
            : `<tr><td colspan="7">${U.emptyState('bi-bag-x', 'Tidak ada pesanan dengan status ini')}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
    return { title: 'Pesanan', nav: 'admin', active: 'admin-pesanan.html', content: html };
  };

  V.orderDetail = function (query, id) {
    var o = S.orderById(id);
    if (!o) {
      U.flash('warning', 'Pesanan tidak ditemukan.');
      return { redirect: 'admin-pesanan.html' };
    }
    var items = S.itemsOf(o.id);
    var customer = o.customer_id ? S.userById(o.customer_id) : null;

    var html = U.pageHead(`Detail Pesanan #${o.id}`,
      `<a class="link-plain" href="admin-pesanan.html"><i class="bi bi-arrow-left"></i> Kembali ke daftar pesanan</a>`,
      U.statusBadge(o.status)) + `
      <div class="grid-2-1">
        <div class="panel">
          <div class="panel-pad pb-2">
            <div class="panel-title"><i class="bi bi-bag-check"></i> Item Pesanan</div>
            <div class="panel-sub">Dipesan pada ${e(S.fmtDate(o.created_at))}</div>
          </div>
          <div class="table-responsive">
            <table class="table table-them align-middle">
              <thead><tr><th>Produk</th><th>Harga Satuan</th><th>Jumlah</th><th class="text-end">Subtotal</th></tr></thead>
              <tbody>${items.map(i => `
                <tr><td class="cell-title">${e(i.item_name)}</td>
                <td>${e(S.rp(i.price))}</td>
                <td><span class="qty-pill">×${i.qty}</span></td>
                <td class="text-end price-tag">${e(S.rp(i.price * i.qty))}</td></tr>`).join('')}</tbody>
              <tfoot><tr><th colspan="3" class="text-end">Total</th>
                <th class="text-end price-tag" style="font-size:17px">${e(S.rp(o.total))}</th></tr></tfoot>
            </table>
          </div>
          ${o.note ? `<div class="panel-pad pt-0"><div class="note-box"><i class="bi bi-sticky me-1"></i> <b>Catatan:</b> ${e(o.note)}</div></div>` : ''}
          <div class="panel-pad pt-0 pb-3">
            <table class="table table-sm mb-0" style="font-size:13.5px">
              <tr><td class="text-muted-2">Alamat Pengiriman</td><td class="text-end"><b>${e(o.alamat || '-')}</b></td></tr>
              <tr><td class="text-muted-2">Metode Pembayaran</td><td class="text-end"><b>${e(o.metode || '-')}</b></td></tr>
            </table>
          </div>
        </div>
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-person"></i> Informasi Customer</div>
          <div class="panel-sub">Data pembeli pesanan ini</div>
          ${customer ? `
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="avatar">${e(customer.name.trim().charAt(0).toUpperCase())}</div>
              <div><div class="cell-title">${e(customer.name)}</div><div class="cell-sub">${e(customer.email)}</div></div>
            </div>
            <table class="table table-sm mb-4" style="font-size:13.5px">
              <tr><td class="text-muted-2">No. HP</td><td class="text-end"><b>${e(customer.phone || '-')}</b></td></tr>
              <tr><td class="text-muted-2">Alamat</td><td class="text-end"><b>${e(customer.address || '-')}</b></td></tr>
            </table>`
          : `<div class="note-box mb-4">Akun customer ini sudah dihapus. Nama snapshot: <b>${e(o.customer_name)}</b></div>`}
          <div class="panel-title mt-2"><i class="bi bi-arrow-repeat"></i> Update Status</div>
          <div class="panel-sub">Terakhir diubah: ${e(S.fmtDate(o.updated_at))}</div>
          <form data-form="status">
            <div class="mb-3"><select name="status" class="form-select">
              ${['pending', 'diproses', 'selesai', 'dibatalkan'].map(s =>
                `<option value="${s}" ${o.status === s ? 'selected' : ''}>${e(S.statusInfo(s).label)}</option>`).join('')}
            </select></div>
            <button class="btn-accent w-100" type="submit"><i class="bi bi-check2-circle me-1"></i> Simpan Status</button>
            <div class="text-muted-2 mt-2"><i class="bi bi-info-circle me-1"></i> Status hanya mengubah data demo di browser ini.</div>
          </form>
        </div>
      </div>`;

    return {
      title: `Pesanan #${o.id}`, nav: 'admin', active: 'admin-pesanan.html', content: html,
      after: function (root) {
        root.querySelector('[data-form="status"]').onsubmit = function (ev) {
          ev.preventDefault();
          o.status = root.querySelector('[name=status]').value;
          o.updated_at = S.now(0, 0);
          S.save();
          U.flash('success', `Status pesanan #${o.id} diperbarui menjadi "${S.statusInfo(o.status).label}".`);
          App.render();
        };
      }
    };
  };

  /* ============ BUAT PESANAN (admin — UC24) ============ */
  V.orderNew = function () {
    var customers = S.state.users.filter(function (u) { return u.role === 'customer'; });
    var cat = S.activeCatalog();
    var html = U.pageHead('Buat Pesanan', 'Isi data pesanan untuk customer',
      '<a class="link-plain" href="admin-pesanan.html"><i class="bi bi-arrow-left"></i> Kembali ke daftar pesanan</a>') + `
      <form data-form="pesanan" class="row g-3">
        <div class="col-12"><div id="formError" role="alert"></div></div>
        <div class="col-lg-7"><div class="panel panel-pad h-100">
          <div class="panel-title"><i class="bi bi-cart-plus"></i> Item Pesanan</div>
          <div class="panel-sub">Pilih produk katalog dan jumlahnya — stok otomatis berkurang</div>
          <div id="itemRows"></div>
          <button type="button" class="btn-soft mt-2" id="addRowBtn"><i class="bi bi-plus-lg"></i> Tambah Item</button>
          <div class="d-flex justify-content-between align-items-center mt-4 pt-3" style="border-top:2px dashed #e4dafb">
            <div class="fw-bold">Total</div>
            <div class="price-tag" style="font-size:20px" id="totalDisplay">Rp 0</div>
          </div>
        </div></div>
        <div class="col-lg-5"><div class="panel panel-pad h-100">
          <div class="panel-title"><i class="bi bi-person"></i> Customer & Data Pengiriman</div>
          <div class="panel-sub">Pesanan langsung berstatus <b>Menunggu</b></div>
          <div class="mb-3"><label class="form-label">Customer *</label>
            <select name="customer_id" class="form-select" required>
              <option value="">— Pilih customer —</option>
              ${customers.map(u => `<option value="${u.id}">${e(u.name)} (${e(u.email)})</option>`).join('')}
            </select></div>
          <div class="mb-3"><label class="form-label">Alamat Pengiriman</label>
            <input type="text" name="alamat" class="form-control" placeholder="Jl., kecamatan, kota (opsional)" /></div>
          <div class="mb-3"><label class="form-label">Metode Pembayaran *</label>
            <select name="metode" class="form-select" required>
              <option value="">— Pilih metode —</option>
              <option value="Transfer Bank">Transfer Bank</option>
              <option value="QRIS">QRIS</option>
            </select></div>
          <div class="mb-3"><label class="form-label">Catatan</label>
            <textarea name="note" class="form-control" rows="3" placeholder="Catatan opsional untuk pesanan ini..."></textarea></div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn-accent" type="submit"><i class="bi bi-check2-circle me-1"></i> Simpan Pesanan</button>
            <a class="btn-soft text-decoration-none" href="admin-pesanan.html"><i class="bi bi-x-lg me-1"></i> Batal</a>
          </div>
        </div></div>
      </form>`;

    return {
      title: 'Buat Pesanan', nav: 'admin', active: 'admin-pesanan.html', content: html,
      after: function (root) {
        var rowsBox = root.querySelector('#itemRows');
        var totalEl = root.querySelector('#totalDisplay');
        var errBox = root.querySelector('#formError');

        function rowHTML() {
          return '<div class="d-flex gap-2 mb-2 item-row" style="flex-wrap:wrap">' +
            '<select name="catalog_id" class="form-select" style="flex:2;min-width:220px" required>' +
            '<option value="">— Pilih produk katalog —</option>' +
            cat.map(c => '<option value="' + c.catalog_id + '">' + e(c.name) + ' — ' + e(S.rp(c.price)) + ' (stok ' + c.stock + ')</option>').join('') +
            '</select>' +
            '<input type="number" name="qty" class="form-control" style="max-width:96px" min="1" value="1" required />' +
            '<button type="button" class="btn-icon b-del" title="Hapus baris"><i class="bi bi-x-lg"></i></button>' +
            '</div>';
        }
        function recalc() {
          var total = 0;
          rowsBox.querySelectorAll('.item-row').forEach(function (row) {
            var cid = Number(row.querySelector('select').value);
            var qty = parseInt(row.querySelector('input[name=qty]').value, 10) || 0;
            var c = cat.find(x => x.catalog_id === cid);
            if (c && qty > 0) total += c.price * qty;
          });
          totalEl.textContent = S.rp(total);
        }
        function bindRow(row) {
          row.querySelector('.b-del').onclick = function () {
            if (rowsBox.querySelectorAll('.item-row').length <= 1) return;
            row.parentNode.removeChild(row);
            recalc();
          };
          row.querySelector('select').onchange = recalc;
          row.querySelector('input[name=qty]').oninput = recalc;
        }
        function showErrorRow(msg) {
          if (errBox) errBox.innerHTML = '<div class="alert alert-danger" role="alert">' + e(msg) + '</div>';
          U.toast(msg, 'err');
        }
        rowsBox.innerHTML = rowHTML();
        rowsBox.querySelectorAll('.item-row').forEach(bindRow);
        recalc();
        root.querySelector('#addRowBtn').onclick = function () {
          rowsBox.insertAdjacentHTML('beforeend', rowHTML());
          bindRow(rowsBox.lastElementChild);
          recalc();
        };

        var f = root.querySelector('[data-form="pesanan"]');
        f.onsubmit = function (ev) {
          ev.preventDefault();
          if (errBox) errBox.innerHTML = '';
          var customerId = Number(f.querySelector('[name=customer_id]').value);
          var customer = S.userById(customerId);
          if (!customer || customer.role !== 'customer') return showErrorRow('Customer harus dipilih.');
          var metode = f.querySelector('[name=metode]').value;
          if (!metode) return showErrorRow('Metode pembayaran wajib dipilih.');
          var lines = [];
          rowsBox.querySelectorAll('.item-row').forEach(function (row) {
            var cid = Number(row.querySelector('select').value);
            var qty = parseInt(row.querySelector('input[name=qty]').value, 10) || 0;
            if (!cid || qty <= 0) return;
            var c = cat.find(x => x.catalog_id === cid);
            if (c) lines.push({ c: c, qty: qty });
          });
          if (!lines.length) return showErrorRow('Pesanan minimal berisi 1 item.');
          for (var i = 0; i < lines.length; i++) {
            if (lines[i].c.stock < lines[i].qty) {
              return showErrorRow('Stok "' + lines[i].c.name + '" tidak mencukupi (tersisa ' + lines[i].c.stock + ').');
            }
          }
          var total = lines.reduce(function (s2, l) { return s2 + l.c.price * l.qty; }, 0);
          var order = {
            id: S.nextId(S.state.orders), customer_id: customer.id, customer_name: customer.name,
            total: total, status: 'pending', note: f.querySelector('[name=note]').value.trim(),
            alamat: f.querySelector('[name=alamat]').value.trim(), metode: metode,
            created_at: S.now(0, 0), updated_at: S.now(0, 0)
          };
          S.state.orders.push(order);
          lines.forEach(function (l) {
            S.state.order_items.push({
              id: S.nextId(S.state.order_items), order_id: order.id, catalog_id: l.c.catalog_id,
              item_name: l.c.name, price: l.c.price, qty: l.qty
            });
            var catRow = S.catalogById(l.c.catalog_id);
            var orchid = catRow ? S.orchidById(catRow.orchid_id) : null;
            if (orchid) orchid.stock -= l.qty;
          });
          S.save();
          U.flash('success', 'Pesanan #' + order.id + ' untuk ' + customer.name + ' berhasil dibuat.');
          U.go('admin-pesanan.html');
        };
      }
    };
  };

  /* ============ ULASAN ============ */
  V.reviews = function () {
    var rows = S.state.reviews.slice().sort(function (a, b) { return b.created_at.localeCompare(a.created_at); })
      .map(function (r) {
        var u = S.userById(r.customer_id);
        var c = S.catalogById(r.catalog_id);
        var o = c ? S.orchidById(c.orchid_id) : null;
        return { r: r, name: u ? u.name : 'Akun dihapus', orchid: o ? o.name : 'Produk dihapus' };
      });

    var html = U.pageHead('Ulasan', 'Lihat, balas, dan hapus ulasan customer');
    if (!rows.length) {
      html += `<div class="panel">${U.emptyState('bi-star', 'Belum ada ulasan', 'Ulasan customer akan muncul di sini.')}</div>`;
    }
    html += rows.map(x => `
      <div class="panel panel-pad mb-4">
        <div class="d-flex flex-wrap justify-content-between gap-3">
          <div class="d-flex gap-3 align-items-center">
            <div class="avatar">${e(x.name.trim().charAt(0).toUpperCase())}</div>
            <div><div class="cell-title">${e(x.name)}</div>
            <div class="review-meta">${e(S.fmtDate(x.r.created_at))}</div></div>
          </div>
          <div class="text-end">
            <div>${U.stars(x.r.rating)} <b>${x.r.rating}/5</b></div>
            <div class="review-meta">untuk <b>${e(x.orchid)}</b></div>
          </div>
        </div>
        <p class="mt-3 mb-3" style="font-size:14.5px">${e(x.r.comment)}</p>
        <div class="d-flex gap-2">
          <form data-form="balas:${x.r.id}" class="d-flex gap-2 flex-grow-1">
            <input type="text" name="reply" class="form-control" value="${e(x.r.reply)}"
              placeholder="${x.r.reply ? 'Ubah balasan...' : 'Tulis balasan untuk customer...'}" required />
            <button class="${x.r.reply ? 'btn-soft' : 'btn-accent'}" type="submit">
              <i class="bi ${x.r.reply ? '' : 'bi-send me-1'}"></i>${x.r.reply ? 'Ubah' : 'Balas'}</button>
          </form>
          <button class="btn-icon b-del" title="Hapus ulasan" data-del="${x.r.id}"><i class="bi bi-trash3"></i></button>
        </div>
        ${x.r.reply ? `<div class="reply-box mt-3"><b><i class="bi bi-reply me-1"></i>Balasan Admin</b>
          <span class="review-meta">· ${e(x.r.replied_at ? S.fmtDate(x.r.replied_at) : '')}</span>
          <div class="mt-1">${e(x.r.reply)}</div></div>` : ''}
      </div>`).join('');

    return {
      title: 'Ulasan', nav: 'admin', active: 'admin-ulasan.html', content: html,
      after: function (root) {
        root.querySelectorAll('[data-form^="balas:"]').forEach(function (f) {
          f.onsubmit = function (ev) {
            ev.preventDefault();
            var id = Number(f.getAttribute('data-form').split(':')[1]);
            var r = S.state.reviews.find(function (x) { return x.id === id; });
            var val = f.querySelector('[name=reply]').value.trim();
            if (!r || !val) return U.toast('Balasan tidak boleh kosong.', 'err');
            r.reply = val;
            r.replied_at = S.now(0, 0);
            S.save();
            U.flash('success', 'Balasan ulasan berhasil disimpan.');
            App.render();
          };
        });
        root.querySelectorAll('[data-del]').forEach(function (btn) {
          btn.onclick = function () {
            var id = Number(btn.getAttribute('data-del'));
            if (!confirm('Hapus ulasan ini?')) return;
            S.state.reviews = S.state.reviews.filter(function (x) { return x.id !== id; });
            S.save();
            U.flash('success', 'Ulasan berhasil dihapus.');
            App.render();
          };
        });
      }
    };
  };

  /* ============ GALERI ============ */
  V.gallery = function () {
    var items = S.state.gallery.slice().sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
    var html = U.pageHead('Galeri', 'Foto-foto anggrek yang tampil untuk customer',
      `<a href="admin-galeri-tambah.html" class="btn-accent"><i class="bi bi-plus-lg me-1"></i> Tambah Foto</a>`);
    if (!items.length) {
      html += `<div class="panel">${U.emptyState('bi-images', 'Galeri masih kosong', 'Tambahkan foto pertama lewat tombol <b>Tambah Foto</b>.')}</div>`;
    } else {
      html += '<div class="gal-grid">' + items.map(f => `
        <div class="panel gal-card">
          ${f.image ? `<img class="gal-img" src="${e(f.image)}" alt="${e(f.title)}" loading="lazy" />`
            : '<div class="gal-img empty">🖼️</div>'}
          <div class="gal-body">
            <div class="gal-title">${e(f.title)}</div>
            <div class="gal-cap">${e(f.caption || 'Tanpa keterangan')}</div>
            <div class="gal-cap mt-1">${e(S.fmtDateOnly(f.created_at))}</div>
            <div class="d-flex gap-2 mt-3">
              <a class="btn-icon b-edit" href="admin-galeri-ubah.html?id=${f.id}" title="Ubah"><i class="bi bi-pencil"></i></a>
              <button class="btn-icon b-del" title="Hapus" data-del="${f.id}"><i class="bi bi-trash3"></i></button>
            </div>
          </div>
        </div>`).join('') + '</div>';
    }
    return {
      title: 'Galeri', nav: 'admin', active: 'admin-galeri.html', content: html,
      after: function (root) {
        root.querySelectorAll('[data-del]').forEach(function (btn) {
          btn.onclick = function () {
            var id = Number(btn.getAttribute('data-del'));
            if (!confirm('Hapus foto galeri ini?')) return;
            S.state.gallery = S.state.gallery.filter(function (x) { return x.id !== id; });
            S.save();
            U.flash('success', 'Foto berhasil dihapus dari galeri.');
            App.render();
          };
        });
      }
    };
  };

  function galleryFormView(query, id) {
    var foto = id ? S.state.gallery.find(function (f) { return f.id === id; }) : null;
    if (id && !foto) {
      U.flash('warning', 'Foto tidak ditemukan.');
      return { redirect: 'admin-galeri.html' };
    }
    var html = U.pageHead(`${foto ? 'Ubah' : 'Tambah'} Foto Galeri`,
      `<a class="link-plain" href="admin-galeri.html"><i class="bi bi-arrow-left"></i> Kembali ke galeri</a>`) + `
      <div class="panel panel-pad" style="max-width:720px">
        <form data-form="foto">
          <div class="mb-3"><label class="form-label">Judul Foto *</label>
            <input type="text" name="title" class="form-control" required value="${e(foto ? foto.title : '')}"
              placeholder="contoh: Kebun Anggrek D'Orchid" /></div>
          <div class="mb-3"><label class="form-label">Keterangan</label>
            <textarea name="caption" class="form-control" rows="3" placeholder="Deskripsi singkat foto...">${e(foto ? foto.caption : '')}</textarea></div>
          <div class="mb-3"><label class="form-label">File Gambar ${foto ? '(kosongkan untuk mempertahankan foto lama)' : '*'}</label>
            <input type="file" name="image" class="form-control" accept="image/*" ${foto ? '' : 'required'} />
            <div class="file-note">Format jpg/png/webp/gif — <b>maks 700 KB</b> (disimpan sebagai data di browser).</div></div>
          ${foto && foto.image ? `<div class="mb-3"><img src="${e(foto.image)}" alt="" style="max-height:220px;border-radius:14px;border:1px solid var(--line)" /></div>` : ''}
          <div class="d-flex gap-2">
            <button class="btn-accent" type="submit"><i class="bi bi-check2-circle me-1"></i> Simpan</button>
            <a href="admin-galeri.html" class="btn-soft">Batal</a>
          </div>
        </form>
      </div>`;
    return {
      title: foto ? 'Ubah Foto Galeri' : 'Tambah Foto Galeri', nav: 'admin', active: 'admin-galeri.html', content: html,
      after: function (root) {
        root.querySelector('[data-form="foto"]').onsubmit = function (ev) {
          ev.preventDefault();
          var title = root.querySelector('[name=title]').value.trim();
          var caption = root.querySelector('[name=caption]').value.trim();
          var file = root.querySelector('[name=image]').files[0];
          if (!title) return U.toast('Judul foto wajib diisi.', 'err');
          function commit(imageVal) {
            if (foto) {
              foto.title = title; foto.caption = caption;
              if (imageVal) foto.image = imageVal;
            } else {
              S.state.gallery.push({
                id: S.nextId(S.state.gallery), title: title, caption: caption,
                image: imageVal || '', created_at: S.now(0, 0)
              });
            }
            S.save();
            U.flash('success', foto ? 'Foto galeri berhasil diperbarui.' : 'Foto berhasil ditambahkan ke galeri.');
            location.href = 'admin-galeri.html';
          }
          if (file) {
            window.readFileData(file, function (dataUrl, err) {
              if (err) return U.toast(err, 'err');
              commit(dataUrl);
            });
          } else if (foto) {
            commit(null);
          } else {
            U.toast('File gambar wajib dipilih.', 'err');
          }
        };
      }
    };
  }
  V.galleryForm = galleryFormView;

  /* ============ LAPORAN ============ */
  V.report = function (query) {
    var from = /^\d{4}-\d{2}-\d{2}$/.test(query.from || '') ? query.from : S.firstOfMonth();
    var to = /^\d{4}-\d{2}-\d{2}$/.test(query.to || '') ? query.to : S.today();
    var orders = S.state.orders.filter(function (o) {
      var d = o.created_at.slice(0, 10);
      return d >= from && d <= to;
    }).sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
    var valid = orders.filter(function (o) { return o.status !== 'dibatalkan'; });
    var revenue = valid.reduce(function (s, o) { return s + o.total; }, 0);
    var summary = {
      count: orders.length, revenue: revenue,
      avg: valid.length ? Math.round(revenue / valid.length) : 0,
      cancelled: orders.length - valid.length
    };

    var html = U.pageHead('Laporan Penjualan', 'Lihat dan unduh laporan penjualan berdasarkan periode tertentu',
      `<button class="btn-accent" data-action="unduh"><i class="bi bi-file-earmark-arrow-down me-1"></i> Unduh CSV</button>`) + `
      <div class="panel panel-pad mb-4">
        <form class="row g-3 align-items-end" data-form="periode">
          <div class="col-md-3"><label class="form-label">Dari Tanggal</label>
            <input type="date" name="from" class="form-control" value="${e(from)}" /></div>
          <div class="col-md-3"><label class="form-label">Sampai Tanggal</label>
            <input type="date" name="to" class="form-control" value="${e(to)}" /></div>
          <div class="col-md-4 d-flex gap-2">
            <button class="btn-accent" type="submit"><i class="bi bi-funnel me-1"></i> Terapkan Periode</button>
            <a class="btn-soft" href="admin-laporan.html">Reset (bulan ini)</a>
          </div>
          <div class="col-md-2"><div class="text-muted-2" style="text-align:right">
            <i class="bi bi-calendar3 me-1"></i> ${e(S.fmtDateOnly(from))}<br>s.d. ${e(S.fmtDateOnly(to))}</div></div>
        </form>
      </div>

      <div class="stat-grid">
        <div class="stat-card"><div class="stat-icon i-violet"><i class="bi bi-receipt"></i></div>
          <div><div class="stat-label">Total Transaksi</div><div class="stat-value">${summary.count}</div>
          <div class="stat-note">${summary.cancelled} dibatalkan</div></div></div>
        <div class="stat-card"><div class="stat-icon i-pink"><i class="bi bi-cash-stack"></i></div>
          <div><div class="stat-label">Total Pendapatan</div><div class="stat-value">${e(S.rp(summary.revenue))}</div>
          <div class="stat-note">tidak termasuk yang dibatalkan</div></div></div>
        <div class="stat-card"><div class="stat-icon i-teal"><i class="bi bi-graph-up"></i></div>
          <div><div class="stat-label">Rata-rata / Pesanan</div><div class="stat-value">${e(S.rp(summary.avg))}</div>
          <div class="stat-note">pesanan valid</div></div></div>
        <div class="stat-card"><div class="stat-icon i-amber"><i class="bi bi-pie-chart-fill"></i></div>
          <div><div class="stat-label">Selesai</div>
          <div class="stat-value">${orders.filter(function (o) { return o.status === 'selesai'; }).length}</div>
          <div class="stat-note">dari ${summary.count} pesanan</div></div></div>
      </div>

      <div class="panel">
        <div class="panel-pad pb-2">
          <div class="panel-title"><i class="bi bi-table"></i> Rincian Pesanan Periode Terpilih</div>
          <div class="panel-sub">${['pending', 'diproses', 'selesai', 'dibatalkan'].map(function (s) {
            var n = orders.filter(function (o) { return o.status === s; }).length;
            return `<span class="badge ${S.statusInfo(s).cls} me-1">${e(S.statusInfo(s).label)}: ${n}</span>`;
          }).join('')}</div>
        </div>
        <div class="table-responsive">
          <table class="table table-them align-middle">
            <thead><tr><th>No.</th><th>Tanggal</th><th>Customer</th><th>Item</th><th>Status</th><th class="text-end">Total</th></tr></thead>
            <tbody>
            ${orders.length ? orders.map(o => {
              var items = S.itemsOf(o.id);
              return `
              <tr>
                <td><a class="link-plain" href="admin-pesanan-detail.html?id=${o.id}">#${o.id}</a></td>
                <td class="cell-sub">${e(S.fmtDate(o.created_at))}</td>
                <td>${e(o.customer_name)}</td>
                <td style="max-width:300px">${items.map((i, idx) =>
                  `<div class="cell-sub">${idx + 1}. ${e(i.item_name)} <span class="qty-pill">×${i.qty}</span></div>`).join('')}</td>
                <td>${U.statusBadge(o.status)}</td>
                <td class="text-end price-tag">${e(S.rp(o.total))}</td>
              </tr>`;
            }).join('')
            : `<tr><td colspan="6">${U.emptyState('bi-inbox', 'Tidak ada pesanan pada periode ini', 'Ubah periode tanggal untuk melihat laporan lain.')}</td></tr>`}
            </tbody>
            ${orders.length ? `<tfoot><tr style="background:#f7f4fd">
              <th colspan="5" class="text-end">Total Pendapatan (tanpa dibatalkan)</th>
              <th class="text-end price-tag" style="font-size:16px">${e(S.rp(summary.revenue))}</th></tr></tfoot>` : ''}
          </table>
        </div>
        <div class="panel-pad pt-0 text-muted-2">
          <i class="bi bi-download me-1"></i> Klik <b>Unduh CSV</b> untuk mengunduh laporan sesuai periode yang sedang dipilih.
        </div>
      </div>`;

    return {
      title: 'Laporan Penjualan', nav: 'admin', active: 'admin-laporan.html', content: html,
      after: function (root) {
        root.querySelector('[data-form="periode"]').onsubmit = function (ev) {
          ev.preventDefault();
          var f = root.querySelector('[name=from]').value, t = root.querySelector('[name=to]').value;
          location.href = 'admin-laporan.html?from=' + f + '&to=' + t;
        };
        root.querySelector('[data-action="unduh"]').onclick = function () {
          var rows = [['ID Pesanan', 'Tanggal', 'Customer', 'Item', 'Jumlah Item', 'Status', 'Total (Rp)']];
          orders.forEach(function (o) {
            var items = S.itemsOf(o.id);
            rows.push([
              o.id, o.created_at, o.customer_name,
              items.map(function (i) { return i.item_name + ' x' + i.qty; }).join('; '),
              items.reduce(function (s, i) { return s + i.qty; }, 0),
              o.status, o.total
            ]);
          });
          rows.push([]);
          rows.push(['Periode ' + from + ' s.d. ' + to, '', '', '', '', 'Total Pendapatan', summary.revenue]);
          S.downloadCSV('laporan-penjualan-' + from + '-sd-' + to + '.csv', rows);
          U.toast('Laporan CSV diunduh. 📄');
        };
      }
    };
  };

  window.VAdmin = V;
})();
