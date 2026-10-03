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
              <div class="d-flex gap-2 align-items-center flex-wrap justify-content-end">
                <a class="btn-soft d-inline-block text-decoration-none" href="customer-katalog-detail.html?id=${it.catalog_id}"><i class="bi bi-eye me-1"></i> Detail</a>
                ${it.stock > 0
                  ? `<button class="btn-accent" data-cart="${it.catalog_id}"><i class="bi bi-cart-plus"></i> Keranjang</button>`
                  : '<span class="badge bg-danger">Habis</span>'}
              </div>
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

  /* ============ DETAIL KATALOG + ULASAN PRODUK ============ */
  V.katalogDetail = function (query, id) {
    var c = id ? S.catalogById(id) : null;
    var o = c ? S.orchidById(c.orchid_id) : null;
    if (!c || !c.is_active || !o) {
      U.flash('warning', 'Produk katalog tidak ditemukan.');
      return { redirect: 'customer-katalog.html' };
    }
    var me = S.currentUser();
    var revs = S.state.reviews.filter(function (r) { return r.catalog_id === c.id; })
      .sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
    var avg = revs.length
      ? Math.round((revs.reduce(function (s, r) { return s + r.rating; }, 0) / revs.length) * 10) / 10 : 0;
    var myRev = revs.find(function (r) { return r.customer_id === me.id; });

    var reviewList = revs.length ? revs.map(function (r) {
      var who = S.userById(r.customer_id);
      return `
        <div class="panel panel-pad" style="margin-bottom:12px">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div class="fw-bold">${e(who ? who.name : 'Pembeli')} <span class="cell-sub fw-normal">· ${e(S.fmtDate(r.created_at))}</span></div>
            <div>${U.stars(r.rating)}</div>
          </div>
          <div class="mt-2">${e(r.comment)}</div>
          ${r.reply ? `<div class="demo-box mt-2 mb-0"><i class="bi bi-shop me-1"></i><b>Balasan penjual:</b> ${e(r.reply)}</div>` : ''}
        </div>`;
    }).join('') : `<div class="panel">${U.emptyState('bi-star', 'Belum ada ulasan',
        'Jadilah yang pertama mengulas produk ini — klik tombol <b>Beri Ulasan</b> di atas.')}</div>`;

    var html = `
      <a class="btn-soft d-inline-block text-decoration-none mb-3" href="customer-katalog.html"><i class="bi bi-arrow-left me-1"></i> Kembali ke Katalog</a>
      <div class="panel panel-pad mb-3">
        <div class="row g-4 align-items-center">
          <div class="col-md-5">
            ${o.image ? `<img src="${e(o.image)}" alt="${e(o.name)}" style="width:100%;height:260px;object-fit:cover;border-radius:12px" />`
              : '<div style="width:100%;height:260px;border-radius:12px;background:#efe9fb;display:grid;place-items:center;font-size:56px">🌱</div>'}
          </div>
          <div class="col-md-7">
            <div class="prod-name" style="font-size:23px">${e(o.name)}</div>
            <div class="prod-meta mt-2">${U.faseBadge(o.fase)}
              <span class="badge bg-light text-dark border">${e(o.jenis)}</span>
              ${o.varietas ? `<span class="badge bg-light text-dark border">${e(o.varietas)}</span>` : ''}</div>
            <div class="mt-2">
              ${revs.length
                ? `<span class="stars" style="font-size:17px">★ ${avg}</span> <span class="cell-sub">(${revs.length} ulasan)</span> <a href="#ulasan" class="link-plain">lihat isi ulasan ↓</a>`
                : '<span class="cell-sub">Belum ada ulasan</span>'}
            </div>
            <div class="prod-desc mt-2" style="font-size:14.5px">${e(o.description || 'Belum ada deskripsi.')}</div>
            <div class="price-tag mt-2" style="font-size:24px">${e(S.rp(c.price))}</div>
            <div class="cell-sub mb-3">Stok: ${o.stock} pot ${o.stock > 0 ? '' : '· <span class="badge bg-danger">Habis</span>'}</div>
            <div class="d-flex gap-2 flex-wrap">
              ${o.stock > 0
                ? `<button class="btn-accent" data-cart="${c.id}"><i class="bi bi-cart-plus"></i> Masukkan Keranjang</button>`
                : ''}
              <a class="btn-soft d-inline-block text-decoration-none" href="customer-ulasan.html">
                <i class="bi bi-pencil-square me-1"></i> ${myRev ? 'Kelola Ulasan Saya' : 'Beri Ulasan'}</a>
            </div>
          </div>
        </div>
      </div>

      <div class="panel panel-pad" id="ulasan">
        <div class="panel-title"><i class="bi bi-chat-square-text"></i> Ulasan Produk <span class="cell-sub">(${revs.length})</span></div>
        <div class="panel-sub">Ditulis oleh customer yang sudah membeli</div>
        ${reviewList}
      </div>`;

    return {
      title: 'Detail Anggrek', nav: 'customer', active: 'customer-katalog.html', content: html,
      after: function (root) {
        root.querySelectorAll('[data-cart]').forEach(function (btn) {
          btn.onclick = function () {
            var cart = S.state.cart;
            var ex = cart.find(function (i) { return i.id === c.id; });
            if (ex) ex.qty += 1;
            else cart.push({ id: c.id, qty: 1 });
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
  V.account = function (query) {
    var akun = S.currentUser();
    var mode = query && (query.mode === 'edit' || query.mode === 'password') ? query.mode : 'view';
    var HERE = 'customer-akun.html';
    var myOrders = S.state.orders.filter(function (o) { return o.customer_id === akun.id; });
    var spent = myOrders.filter(function (o) { return o.status !== 'dibatalkan'; })
      .reduce(function (s, o) { return s + o.total; }, 0);
    var myReviews = S.state.reviews.filter(function (r) { return r.customer_id === akun.id; }).length;

    function detailRow(label, value) {
      return '<div class="detail-row"><div class="dr-label">' + e(label) + '</div>' +
        '<div class="dr-value">' + (value ? e(value) : '<span class="text-muted-2">—</span>') + '</div></div>';
    }

    var panelBody;
    if (mode === 'edit') {
      panelBody = `
        <form data-form="profil" class="row g-3">
          <div class="col-12"><div id="formError" role="alert"></div></div>
          <div class="col-md-6"><label class="form-label">Nama Lengkap *</label>
            <input type="text" name="name" class="form-control" required value="${e(akun.name)}" /></div>
          <div class="col-md-6"><label class="form-label">Email *</label>
            <input type="email" name="email" class="form-control" required value="${e(akun.email)}" /></div>
          <div class="col-md-6"><label class="form-label">No. HP</label>
            <input type="text" name="phone" class="form-control" value="${e(akun.phone)}" placeholder="08xx-xxxx-xxxx" /></div>
          <div class="col-md-6"><label class="form-label">Alamat Pengiriman</label>
            <input type="text" name="address" class="form-control" value="${e(akun.address)}" placeholder="Alamat lengkap" /></div>
          <div class="col-12 d-flex gap-2 flex-wrap">
            <button class="btn-accent" type="submit"><i class="bi bi-check2-circle me-1"></i> Simpan Perubahan</button>
            <a class="btn-soft text-decoration-none" href="${HERE}"><i class="bi bi-x-lg me-1"></i> Batal</a>
          </div>
        </form>`;
    } else if (mode === 'password') {
      panelBody = `
        <form data-form="password" class="row g-3">
          <div class="col-12"><div id="formError" role="alert"></div></div>
          <div class="col-md-6"><label class="form-label">Password Saat Ini *</label>
            <input type="password" name="current" class="form-control" required autocomplete="current-password" /></div>
          <div class="col-md-6"><label class="form-label">Password Baru *</label>
            <input type="password" name="newpw" class="form-control" required minlength="8" autocomplete="new-password" />
            <div class="pw-rules" aria-live="polite">
              <span id="pwLen">min. 8 karakter</span>
              <span id="pwLetter">ada huruf</span>
              <span id="pwDigit">ada angka</span>
            </div></div>
          <div class="col-md-6"><label class="form-label">Konfirmasi Password Baru *</label>
            <input type="password" name="confirmpw" class="form-control" required minlength="8" autocomplete="new-password" /></div>
          <div class="col-12 d-flex gap-2 flex-wrap">
            <button class="btn-accent" type="submit"><i class="bi bi-shield-lock me-1"></i> Simpan Password</button>
            <a class="btn-soft text-decoration-none" href="${HERE}"><i class="bi bi-x-lg me-1"></i> Batal</a>
          </div>
        </form>`;
    } else {
      panelBody = `
        <div class="akun-detail">
          ${detailRow('Nama Lengkap', akun.name)}
          ${detailRow('Email', akun.email)}
          ${detailRow('No. HP', akun.phone)}
          ${detailRow('Alamat Pengiriman', akun.address)}
          ${detailRow('Terdaftar', S.fmtDateOnly(akun.created_at))}
        </div>
        <div class="d-flex gap-2 flex-wrap mt-3">
          <a class="btn-accent" href="${HERE}?mode=edit"><i class="bi bi-pencil-square me-1"></i> Edit Profil</a>
          <a class="btn-soft text-decoration-none" href="${HERE}?mode=password"><i class="bi bi-key me-1"></i> Ganti Password</a>
        </div>`;
    }

    var sub = mode === 'edit' ? 'Mode edit — ubah data profil lalu simpan'
      : mode === 'password' ? 'Ganti password — wajib isi password saat ini'
      : 'Lihat data akun kamu';

    var html = U.pageHead('Data Akun', sub) + `
      <div class="grid-2-1">
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-person-badge"></i> Profil Saya</div>
          <div class="panel-sub">Role: <span class="badge bg-success">Customer</span> · terdaftar ${e(S.fmtDateOnly(akun.created_at))}</div>
          ${panelBody}
        </div>
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-graph-up"></i> Aktivitas Belanja</div>
          <div class="panel-sub">Ringkasan akun kamu</div>
          <div class="stat-card mb-3" style="box-shadow:none;border-style:dashed">
            <div class="stat-icon i-violet"><i class="bi bi-bag-check"></i></div>
            <div><div class="stat-label">Total Pesanan</div><div class="stat-value">${myOrders.length}</div></div></div>
          <div class="stat-card mb-3" style="box-shadow:none;border-style:dashed">
            <div class="stat-icon i-pink"><i class="bi bi-cash-stack"></i></div>
            <div><div class="stat-label">Total Belanja</div><div class="stat-value" style="font-size:18px">${e(S.rp(spent))}</div></div></div>
          <div class="stat-card mb-0" style="box-shadow:none;border-style:dashed">
            <div class="stat-icon i-teal"><i class="bi bi-star-fill"></i></div>
            <div><div class="stat-label">Ulasan Diberikan</div><div class="stat-value">${myReviews}</div></div></div>
        </div>
      </div>`;

    return {
      title: 'Data Akun', nav: 'customer', active: 'customer-akun.html', content: html,
      after: function (root) {
        function showError(msg, field) {
          var box = root.querySelector('#formError');
          if (!box) return;
          box.innerHTML = '<div class="alert alert-danger alert-dismissible fade show app-alert" role="alert">' +
            '<i class="bi bi-exclamation-triangle-fill me-2"></i>' + e(msg) +
            '<button type="button" class="btn-close" data-dismiss="1" aria-label="Tutup"></button></div>';
          var close = box.querySelector('[data-dismiss]');
          if (close) close.onclick = function () { box.innerHTML = ''; };
          if (field) field.focus();
        }

        var profil = root.querySelector('[data-form="profil"]');
        if (profil) {
          profil.onsubmit = function (ev) {
            ev.preventDefault();
            var nameF = profil.querySelector('[name=name]'), emailF = profil.querySelector('[name=email]');
            var name = nameF.value.trim(), email = emailF.value.trim().toLowerCase();
            if (!name || !email) return showError('Nama dan email wajib diisi.', !name ? nameF : emailF);
            if (name.length < 2) return showError('Nama lengkap minimal 2 karakter.', nameF);
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showError('Format email tidak valid. Contoh: nama@email.com', emailF);
            var dup = S.state.users.find(function (u) { return u.email.toLowerCase() === email && u.id !== akun.id; });
            if (dup) return showError('Email sudah digunakan akun lain.', emailF);
            akun.name = name; akun.email = email;
            akun.phone = profil.querySelector('[name=phone]').value.trim();
            akun.address = profil.querySelector('[name=address]').value.trim();
            S.save();
            U.flash('success', 'Data akun berhasil diperbarui.');
            location.href = HERE;
          };
        }

        var pwForm = root.querySelector('[data-form="password"]');
        if (pwForm) {
          var newF = pwForm.querySelector('[name=newpw]');
          function tickPw() {
            var v = newF.value;
            var L = pwForm.querySelector('#pwLen'), H = pwForm.querySelector('#pwLetter'), D = pwForm.querySelector('#pwDigit');
            if (L) L.classList.toggle('ok', v.length >= 8);
            if (H) H.classList.toggle('ok', /[A-Za-z]/.test(v));
            if (D) D.classList.toggle('ok', /\d/.test(v));
          }
          if (newF) newF.addEventListener('input', tickPw);
          pwForm.onsubmit = function (ev) {
            ev.preventDefault();
            var curF = pwForm.querySelector('[name=current]'), cfF = pwForm.querySelector('[name=confirmpw]');
            var cur = curF.value, nv = newF.value, cf = cfF.value;
            if (!cur || !nv || !cf) return showError('Semua kolom password wajib diisi.');
            if (cur !== akun.password) return showError('Password saat ini salah.', curF);
            if (nv.length < 8) return showError('Password minimal 8 karakter.', newF);
            if (!/[A-Za-z]/.test(nv) || !/\d/.test(nv)) return showError('Password harus mengandung huruf dan angka.', newF);
            if (nv === akun.password) return showError('Password baru tidak boleh sama dengan password lama.', newF);
            if (nv !== cf) return showError('Konfirmasi password tidak sama.', cfF);
            akun.password = nv;
            S.save();
            U.flash('success', 'Password berhasil diganti. Gunakan password baru saat login berikutnya.');
            location.href = HERE;
          };
        }
      }
    };
  };

  window.VCustomer = V;
})();
