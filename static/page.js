/* ============================================================
   D'Orchid — page.js: bootstrap tiap halaman (versi multipage)
   - Jaga sesi/role (baca data-role di <body>)
   - Parse query string (?id, ?q, ?role, dst.)
   - Render view ke #view, jalankan after(), siapkan shell statis
   ============================================================ */
(function () {
  'use strict';

  var S = window.Store, U = window.UI;
  var body = document.body;

  function parseQuery() {
    var query = {};
    (location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = i < 0 ? kv : kv.slice(0, i);
      var v = i < 0 ? '' : kv.slice(i + 1);
      query[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    });
    return query;
  }

  /* ---------- jaga sesi & role ---------- */
  var user = S.currentUser();
  var role = body.getAttribute('data-role') || '';
  if (!user) {
    U.flash('warning', 'Silakan login terlebih dahulu.');
    U.go('../index.html');
  } else if (user.role !== role) {
    U.flash('warning', 'Anda tidak punya akses ke halaman ini.');
    U.go('../' + S.roleHome(user.role));
  } else {
    boot();
  }

  function boot() {
    var q = parseQuery();
    var id = q.id !== undefined && q.id !== '' ? Number(q.id) : undefined;
    var viewName = body.getAttribute('data-view') || '';

    /* registry view → fungsi (hanya yang sesuai role yang dimuat) */
    var REG = {};
    if (window.VAdmin) {
      REG['admin.dashboard'] = VAdmin.dashboard;
      REG['admin.accounts'] = VAdmin.accounts;
      REG['admin.accountForm'] = VAdmin.accountForm;
      REG['admin.catalog'] = VAdmin.catalog;
      REG['admin.catalogPick'] = VAdmin.catalogPick;
      REG['admin.catalogPrice'] = VAdmin.catalogPrice;
      REG['admin.catalogEdit'] = VAdmin.catalogEdit;
      REG['admin.orders'] = VAdmin.orders;
      REG['admin.orderDetail'] = VAdmin.orderDetail;
      REG['admin.reviews'] = VAdmin.reviews;
      REG['admin.gallery'] = VAdmin.gallery;
      REG['admin.galleryForm'] = VAdmin.galleryForm;
      REG['admin.report'] = VAdmin.report;
    }
    if (window.VKaryawan) {
      REG['karyawan.orchids'] = VKaryawan.orchids;
      REG['karyawan.orchidForm'] = VKaryawan.orchidForm;
      REG['karyawan.account'] = VKaryawan.account;
    }
    if (window.VCustomer) {
      REG['customer.catalog'] = VCustomer.catalog;
      REG['customer.cart'] = VCustomer.cart;
      REG['customer.orders'] = VCustomer.orders;
      REG['customer.gallery'] = VCustomer.gallery;
      REG['customer.reviews'] = VCustomer.reviews;
      REG['customer.account'] = VCustomer.account;
    }

    var fn = REG[viewName];
    var viewEl = document.getElementById('view');
    var flashSlot = document.getElementById('flashSlot');

    function mount() {
      if (!fn) {
        viewEl.innerHTML = U.emptyState('bi-exclamation-diamond', 'Halaman tidak ditemukan');
        return;
      }
      var view = fn(q, id);
      if (view && view.redirect) { U.go(view.redirect); return; }
      if (!view || !viewEl) return;
      document.title = (view.title || document.title) + " · D'Orchid";
      var topTitle = document.querySelector('.topbar-title');
      if (topTitle && view.title) topTitle.textContent = view.title;
      viewEl.innerHTML = view.content;
      if (view.after) view.after(viewEl);
      if (flashSlot) flashSlot.innerHTML = U.flashHTML();
      U.updateBadges();
      U.bindAlerts();
    }

    /* App.render = render ulang halaman ini (dipakai views setelah aksi) */
    window.App = { render: mount };

    U.bindStaticShell();
    mount();
  }
})();
