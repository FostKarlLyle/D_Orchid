/* ============================================================
   D'Orchid — Views Customer (versi static)
   ============================================================ */
(function () {
  'use strict';
  var S = window.Store, U = window.UI, e = U.e;
  var V = {};

  /* ============ KATALOG (+ pencarian) ============ */
  V.catalog = function (query) {
    var q = (query.q || '').trim();
    var lq = q.toLowerCase();
    var all = S.activeCatalog();
    var items = all.filter(function (it) {
      if (!lq) return true;
      return (it.name + ' ' + it.jenis + ' ' + it.varietas).toLowerCase().includes(lq);
    });

    var html = U.pageHead('Katalog Anggrek 🌸', 'Cari berdasarkan nama, jenis, atau varietas — lalu masukkan ke keranjang',
      '') + `
      <form class="d-flex gap-2 mb-3" data-form="cari" style="min-width:min(420px,100%)">
        <div class="search-box" style="flex:1"><i class="bi bi-search"></i>
          <input class="form-control" type="text" name="q" value="${e(q)}"
            placeholder="Cari nama, jenis, atau varietas..." autofocus /></div>
        <button class="btn-accent" type="submit"><i class="bi bi-search me-1"></i> Cari</button>
        ${q ? '<a href="customer-katalog.html" class="btn-soft">Reset</a>' : ''}
      </form>`;

    if (q) {
      html += `<div class="text-muted-2 mb-3">Hasil pencarian <b>"${e(q)}"</b> — ${items.length} anggrek ditemukan.</div>`;
    }

    if (!items.length) {
      html += `<div class="panel">${U.emptyState('bi-emoji-frown', 'Anggrek tidak ditemukan',
        'Coba kata kunci lain, misalnya <i>Dendrobium</i>, <i>Phalaenopsis</i>, atau nama varietasnya.')}</div>`;
    } else {
      html += '<div class="prod-grid">' + items.map(it => `
        <div class="panel prod-card">
          ${it.image ? `<img class="prod-img" src="${e(it.image)}" alt="${e(it.name)}" loading="lazy" />`
            : '<div class="prod-img empty">🌱</div>'}
          <div class="prod-body">
            <div class="prod-name">${e(it.name)}</div>
            <div class="prod-meta">${U.faseBadge(it.fase)}
              <span class="badge bg-light text-dark border">${e(it.jenis)}</span>
              ${it.varietas ? `<span class="badge bg-light text-dark border">${e(it.varietas)}</span>` : ''}</div>
            ${it.review_count ? `<div><span class="stars">★ ${it.avg_rating}</span> <span class="cell-sub">(${it.review_count} ulasan)</span></div>` : ''}
            <div class="prod-desc">${e(it.description || '')}</div>
            <div class="prod-foot">
              <div><div class="price-tag" style="font-size:17px">${e(S.rp(it.price))}</div>
              <div class="cell-sub">Stok: ${it.stock} pot</div></div>
              ${it.stock > 0
                ? `<button class="btn-accent" data-cart="${it.catalog_id}"><i class="bi bi-cart-plus"></i> Keranjang</button>`
                : '<span class="badge bg-danger">Habis</span>'}
            </div>
          </div>
        </div>`).join('') + '</div>';
    }

    return {
      title: 'Katalog Anggrek', nav: 'customer', active: 'customer-katalog.html', content: html,
      after: function (root) {
        root.querySelector('[data-form="cari"]').onsubmit = function (ev) {
          ev.preventDefault();
          var v = root.querySelector('[name=q]').value.trim();
          location.href = 'customer-katalog.html' + (v ? '?q=' + encodeURIComponent(v) : '');
        };
        root.querySelectorAll('[data-cart]').forEach(function (btn) {
          btn.onclick = function () {
            var id = Number(btn.getAttribute('data-cart'));
            var cart = S.state.cart;
            var ex = cart.find(function (i) { return i.id === id; });
            if (ex) ex.qty += 1;
            else cart.push({ id: id, qty: 1 });
            S.save();
            U.toast('Ditambahkan ke keranjang 🛒');
            App.render();
          };
        });
      }
    };
  };

  /* ============ KERANJANG (checkout = demo, tanpa transaksi) ============ */
  V.cart = function () {
    var catalogMap = {};
    S.activeCatalog().forEach(function (c) { catalogMap[c.catalog_id] = c; });
    var cart = S.state.cart.filter(function (i) { return catalogMap[i.id]; });
    var total = cart.reduce(function (s, i) { return s + catalogMap[i.id].price * i.qty; }, 0);

    var html = U.pageHead('Keranjang Belanja 🛒', 'Keranjang sementara tersimpan di browser ini',
      `<a href="customer-katalog.html" class="btn-soft"><i class="bi bi-flower1 me-1"></i> Lanjut Belanja</a>`) +
      U.demoBanner('Versi prototipe UI — <b>checkout & transaksi antar customer–penjual dinonaktifkan</b>. Keranjang hanya mendemonstrasikan alur fiturnya saja.') + `
      <div class="panel">
        <div class="table-responsive">
          <table class="table table-them align-middle mb-0">
            <thead><tr><th>Produk</th><th>Harga</th><th style="width:170px">Jumlah</th><th class="text-end">Subtotal</th><th></th></tr></thead>
            <tbody>
            ${cart.length ? cart.map(line => {
              var c = catalogMap[line.id];
              return `
              <tr>
                <td><div class="d-flex align-items-center gap-2">
                  ${c.image ? `<img src="${e(c.image)}" class="cart-row-img" alt="" />`
                    : '<div class="cart-row-img" style="display:grid;place-items:center;background:#f3eefe">🌱</div>'}
                  <div><div class="cell-title">${e(c.name)}</div>
                  <div class="cell-sub">${e(c.jenis)} · stok ${c.stock}</div></div></div></td>
                <td class="price-tag">${e(S.rp(c.price))}</td>
                <td><div class="qty-stepper">
                  <button type="button" data-qty="${line.id}:-1">−</button>
                  <input type="text" value="${line.qty}" readonly />
                  <button type="button" data-qty="${line.id}:1">+</button>
                </div></td>
                <td class="text-end price-tag">${e(S.rp(c.price * line.qty))}</td>
                <td class="text-end"><button class="btn-icon b-del" data-del="${line.id}" title="Hapus"><i class="bi bi-trash3"></i></button></td>
              </tr>`;
            }).join('') : ''}
            </tbody>
            ${cart.length ? `<tfoot><tr style="background:#f7f4fd">
              <th colspan="3" class="text-end">Total</th>
              <th class="text-end price-tag" style="font-size:17px">${e(S.rp(total))}</th><th></th></tr></tfoot>` : ''}
          </table>
        </div>
        ${!cart.length ? U.emptyState('bi-cart-x', 'Keranjang masih kosong',
          'Pilih anggrek favoritmu di <a class="link-plain" href="customer-katalog.html">katalog</a>.') : ''}
        ${cart.length ? `
        <div class="panel-pad d-flex flex-wrap gap-3 justify-content-between align-items-center" style="border-top:1px solid var(--line)">
          <div style="flex:1;min-width:240px">
            <label class="form-label">Catatan pesanan (opsional)</label>
            <input type="text" id="cartNote" class="form-control" placeholder="contoh: tolong dikemas aman..." />
          </div>
          <button class="btn-accent" style="font-size:15px;padding:12px 26px" data-action="checkout">
            <i class="bi bi-bag-check me-1"></i> Checkout Pesanan</button>
        </div>` : ''}
      </div>`;

    return {
      title: 'Keranjang Belanja', nav: 'customer', active: 'customer-keranjang.html', content: html,
      after: function (root) {
        root.querySelectorAll('[data-qty]').forEach(function (btn) {
          btn.onclick = function () {
            var parts = btn.getAttribute('data-qty').split(':');
            var id = Number(parts[0]), delta = Number(parts[1]);
            var line = S.state.cart.find(function (i) { return i.id === id; });
            var c = catalogMap[id];
            if (!line) return;
            line.qty += delta;
            if (line.qty < 1) line.qty = 1;
            if (c && line.qty > c.stock) {
              line.qty = c.stock;
              U.toast('Stok tidak mencukupi (tersisa ' + c.stock + ').', 'err');
            }
            S.save();
            App.render();
          };
        });
        root.querySelectorAll('[data-del]').forEach(function (btn) {
          btn.onclick = function () {
            var id = Number(btn.getAttribute('data-del'));
            S.state.cart = S.state.cart.filter(function (i) { return i.id !== id; });
            S.save();
            U.toast('Item dihapus dari keranjang.');
            App.render();
          };
        });
        var co = root.querySelector('[data-action="checkout"]');
        if (co) co.onclick = function () {
          U.toast('Mode prototipe: proses transaksi checkout dinonaktifkan.', 'err');
        };
      }
    };
  };

  /* ============ PESANAN SAYA (lihat saja) ============ */
  V.orders = function () {
    var me = S.currentUser();
    var orders = S.state.orders.filter(function (o) { return o.customer_id === me.id; })
      .sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });

    var html = U.pageHead('Pesanan Saya', 'Riwayat pesanan beserta status terkininya',
      `<a href="customer-katalog.html" class="btn-accent"><i class="bi bi-cart-plus me-1"></i> Belanja Lagi</a>`);

    if (!orders.length) {
      html += `<div class="panel">${U.emptyState('bi-bag-x', 'Belum ada pesanan',
        'Mulai belanja dari <a class="link-plain" href="customer-katalog.html">katalog anggrek</a>.')}</div>`;
    } else {
      html += orders.map(o => {
        var items = S.itemsOf(o.id);
        return `
        <div class="panel panel-pad mb-4">
          <div class="order-head mb-3">
            <div><div class="cell-title" style="font-size:16px">Pesanan #${o.id}</div>
            <div class="cell-sub">${e(S.fmtDate(o.created_at))}</div></div>
            ${U.statusBadge(o.status)}
          </div>
          <div class="table-responsive">
            <table class="table table-them align-middle mb-0">
              <thead><tr><th>Produk</th><th>Harga</th><th>Jumlah</th><th class="text-end">Subtotal</th></tr></thead>
              <tbody>${items.map(i => `
                <tr><td class="cell-title">${e(i.item_name)}</td>
                <td>${e(S.rp(i.price))}</td>
                <td><span class="qty-pill">×${i.qty}</span></td>
                <td class="text-end price-tag">${e(S.rp(i.price * i.qty))}</td></tr>`).join('')}</tbody>
              <tfoot><tr><th colspan="3" class="text-end">Total</th>
                <th class="text-end price-tag">${e(S.rp(o.total))}</th></tr></tfoot>
            </table>
          </div>
          ${o.note ? `<div class="note-box mt-3"><i class="bi bi-sticky me-1"></i> <b>Catatan:</b> ${e(o.note)}</div>` : ''}
        </div>`;
      }).join('');
    }
    return { title: 'Pesanan Saya', nav: 'customer', active: 'customer-pesanan.html', content: html };
  };

  /* ============ GALERI ============ */
  V.gallery = function () {
    var items = S.state.gallery.slice().sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
    var html = U.pageHead('Galeri Anggrek 📸', 'Koleksi foto anggrek dan kebun D\'Orchid');
    if (!items.length) {
      html += `<div class="panel">${U.emptyState('bi-images', 'Galeri masih kosong', 'Foto akan segera menyusul.')}</div>`;
    } else {
      html += '<div class="gal-grid">' + items.map(f => `
        <div class="panel gal-card">
          ${f.image ? `<img class="gal-img" src="${e(f.image)}" alt="${e(f.title)}" loading="lazy" />`
            : '<div class="gal-img empty">🖼️</div>'}
          <div class="gal-body">
            <div class="gal-title">${e(f.title)}</div>
            <div class="gal-cap">${e(f.caption || 'Tanpa keterangan')}</div>
            <div class="gal-cap mt-1">${e(S.fmtDateOnly(f.created_at))}</div>
          </div>
        </div>`).join('') + '</div>';
    }
    return { title: 'Galeri Anggrek', nav: 'customer', active: 'customer-galeri.html', content: html };
  };

  /* ============ ULASAN ============ */
  V.reviews = function () {
    var me = S.currentUser();
    var mine = S.state.reviews.filter(function (r) { return r.customer_id === me.id; })
      .sort(function (a, b) { return b.created_at.localeCompare(a.created_at); })
      .map(function (r) {
        var c = S.catalogById(r.catalog_id);
        var o = c ? S.orchidById(c.orchid_id) : null;
        return { r: r, orchid: o ? o.name : 'Produk dihapus' };
      });
    var candidates = S.activeCatalog().filter(function (it) {
      return !S.state.reviews.some(function (r) { return r.catalog_id === it.catalog_id && r.customer_id === me.id; });
    });
    var avg = mine.length ? (mine.reduce(function (s, x) { return s + x.r.rating; }, 0) / mine.length).toFixed(1) : '-';

    var html = U.pageHead('Ulasan Saya ⭐', 'Beri ulasan untuk anggrek yang kamu beli, dan kelola ulasan lama') + `
      <div class="grid-2-1">
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-pencil-square"></i> Tulis Ulasan Baru</div>
          <div class="panel-sub">Satu ulasan untuk setiap produk katalog</div>
          ${candidates.length ? `
          <form data-form="ulasan">
            <div class="mb-3"><label class="form-label">Pilih Anggrek *</label>
              <select name="catalog_id" class="form-select" required>
                <option value="">— Pilih produk katalog —</option>
                ${candidates.map(c => `<option value="${c.catalog_id}">${e(c.name)} — ${e(c.jenis)}${c.varietas ? ' · ' + e(c.varietas) : ''}</option>`).join('')}
              </select></div>
            <div class="mb-3"><label class="form-label">Rating *</label>
              <select name="rating" class="form-select" required>
                <option value="5">★★★★★ (5) — Sangat Puas</option>
                <option value="4">★★★★ (4) — Puas</option>
                <option value="3">★★★ (3) — Cukup</option>
                <option value="2">★★ (2) — Kurang</option>
                <option value="1">★ (1) — Sangat Kurang</option>
              </select></div>
            <div class="mb-3"><label class="form-label">Ulasan *</label>
              <textarea name="comment" class="form-control" rows="4" required
                placeholder="Ceritakan pengalamanmu dengan anggrek ini..."></textarea></div>
            <button class="btn-accent" type="submit"><i class="bi bi-send me-1"></i> Kirim Ulasan</button>
          </form>`
          : `<div class="demo-box mb-0"><i class="bi bi-check-circle text-success me-1"></i>
             Semua produk sudah kamu ulas (atau belum ada produk di katalog). Terima kasih! 🌸</div>`}
        </div>
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-emoji-smile"></i> Ringkasan</div>
          <div class="panel-sub">Aktivitas ulasan kamu</div>
          <div class="stat-card mb-3" style="box-shadow:none;border-style:dashed">
            <div class="stat-icon i-violet"><i class="bi bi-star-fill"></i></div>
            <div><div class="stat-label">Ulasan Diberikan</div><div class="stat-value">${mine.length}</div>
            <div class="stat-note">rata-rata rating ${avg}</div></div></div>
          <div class="demo-box mb-0"><i class="bi bi-shield-check me-1"></i>
            Ulasanmu membantu customer lain memilih anggrek terbaik.</div>
        </div>
      </div>

      <div class="page-head" style="margin-top:8px">
        <div><h1 style="font-size:17px">Ulasan yang Sudah Diberikan</h1></div>
      </div>`;

    if (!mine.length) {
      html += `<div class="panel">${U.emptyState('bi-star', 'Belum ada ulasan darimu', 'Tulis ulasan pertama di formulir di atas.')}</div>`;
    } else {
      html += mine.map(x => `
        <div class="panel panel-pad review-card mb-4">
          <div class="d-flex flex-wrap justify-content-between gap-3">
            <div><div class="cell-title">${e(x.orchid)}</div>
            <div class="review-meta">${e(S.fmtDate(x.r.created_at))}</div></div>
            <div class="text-end">
              <div>${U.stars(x.r.rating)} <b>${x.r.rating}/5</b></div>
              <button class="btn-icon b-del mt-1" title="Hapus ulasan" data-del="${x.r.id}"><i class="bi bi-trash3"></i></button>
            </div>
          </div>
          <p class="mt-3 mb-0" style="font-size:14.5px">${e(x.r.comment)}</p>
          ${x.r.reply ? `<div class="reply-box"><b><i class="bi bi-reply me-1"></i>Balasan Admin</b>
            <span class="review-meta">· ${e(x.r.replied_at ? S.fmtDate(x.r.replied_at) : '')}</span>
            <div class="mt-1">${e(x.r.reply)}</div></div>` : ''}
        </div>`).join('');
    }

    return {
      title: 'Ulasan Saya', nav: 'customer', active: 'customer-ulasan.html', content: html,
      after: function (root) {
        var f = root.querySelector('[data-form="ulasan"]');
        if (f) f.onsubmit = function (ev) {
          ev.preventDefault();
          var catalogId = Number(f.querySelector('[name=catalog_id]').value);
          var rating = parseInt(f.querySelector('[name=rating]').value, 10);
          var comment = f.querySelector('[name=comment]').value.trim();
          if (!catalogId) return U.toast('Pilih anggrek yang mau diulas.', 'err');
          if (!rating || rating < 1 || rating > 5) return U.toast('Rating harus antara 1–5.', 'err');
          if (!comment) return U.toast('Tulis ulasan kamu terlebih dahulu.', 'err');
          S.state.reviews.push({
            id: S.nextId(S.state.reviews), customer_id: me.id, catalog_id: catalogId,
            rating: rating, comment: comment, reply: '', replied_at: '', created_at: S.now(0, 0)
          });
          S.save();
          U.flash('success', 'Terima kasih atas ulasanmu! 🌸');
          App.render();
        };
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

  /* ============ DATA AKUN ============ */
  V.account = function () {
    var akun = S.currentUser();
    var myOrders = S.state.orders.filter(function (o) { return o.customer_id === akun.id; });
    var spent = myOrders.filter(function (o) { return o.status !== 'dibatalkan'; })
      .reduce(function (s, o) { return s + o.total; }, 0);
    var myReviews = S.state.reviews.filter(function (r) { return r.customer_id === akun.id; }).length;

    var html = U.pageHead('Data Akun', 'Lihat dan ubah data akun kamu') + `
      <div class="grid-2-1">
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-person-badge"></i> Profil Saya</div>
          <div class="panel-sub">Role: <span class="badge bg-success">Customer</span> · terdaftar ${e(S.fmtDateOnly(akun.created_at))}</div>
          <form data-form="akun" class="row g-3">
            <div class="col-md-6"><label class="form-label">Nama Lengkap *</label>
              <input type="text" name="name" class="form-control" required value="${e(akun.name)}" /></div>
            <div class="col-md-6"><label class="form-label">Email *</label>
              <input type="email" name="email" class="form-control" required value="${e(akun.email)}" /></div>
            <div class="col-md-6"><label class="form-label">No. HP</label>
              <input type="text" name="phone" class="form-control" value="${e(akun.phone)}" placeholder="08xx-xxxx-xxxx" /></div>
            <div class="col-md-6"><label class="form-label">Ganti Password <span class="text-muted-2">(opsional)</span></label>
              <input type="password" name="password" class="form-control" minlength="6" placeholder="Kosongkan jika tidak diganti" /></div>
            <div class="col-12"><label class="form-label">Alamat Pengiriman</label>
              <input type="text" name="address" class="form-control" value="${e(akun.address)}" placeholder="Alamat lengkap" /></div>
            <div class="col-12"><button class="btn-accent" type="submit"><i class="bi bi-check2-circle me-1"></i> Simpan Perubahan</button></div>
          </form>
        </div>
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-graph-up"></i> Aktivitas Belanja</div>
          <div class="panel-sub">Ringkasan akun kamu</div>
          <div class="stat-card mb-3" style="box-shadow:none;border-style:dashed">
            <div class="stat-icon i-violet"><i class="bi bi-bag-check"></i></div>
            <div><div class="stat-label">Total Pesanan</div><div class="stat-value">${myOrders.length}</div></div></div>
          <div class="stat-card mb-3" style="box-shadow:none;border-style:dashed">
            <div class="stat-icon i-pink"><i class="bi bi-cash-stack"></i></div>
            <div><div class="stat-label">Total Belanja</div>
            <div class="stat-value" style="font-size:18px">${e(S.rp(spent))}</div></div></div>
          <div class="stat-card mb-0" style="box-shadow:none;border-style:dashed">
            <div class="stat-icon i-teal"><i class="bi bi-star-fill"></i></div>
            <div><div class="stat-label">Ulasan Diberikan</div><div class="stat-value">${myReviews}</div></div></div>
        </div>
      </div>`;

    return {
      title: 'Data Akun', nav: 'customer', active: 'customer-akun.html', content: html,
      after: function (root) {
        root.querySelector('[data-form="akun"]').onsubmit = function (ev) {
          ev.preventDefault();
          var name = root.querySelector('[name=name]').value.trim();
          var email = root.querySelector('[name=email]').value.trim().toLowerCase();
          if (!name || !email) return U.toast('Nama dan email wajib diisi.', 'err');
          var dup = S.state.users.find(function (u) { return u.email.toLowerCase() === email && u.id !== akun.id; });
          if (dup) return U.toast('Email sudah digunakan akun lain.', 'err');
          akun.name = name; akun.email = email;
          akun.phone = root.querySelector('[name=phone]').value.trim();
          akun.address = root.querySelector('[name=address]').value.trim();
          var pw = root.querySelector('[name=password]').value;
          if (pw) {
            if (pw.length < 6) return U.toast('Password minimal 6 karakter.', 'err');
            akun.password = pw;
          }
          S.save();
          U.flash('success', 'Data akun berhasil diperbarui.');
          App.render();
        };
      }
    };
  };

  window.VCustomer = V;
})();
