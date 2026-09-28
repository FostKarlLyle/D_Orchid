/* ============================================================
   D'Orchid — UI helpers (shell, komponen, escape, toast)
   ============================================================ */
(function () {
  'use strict';

  var S = window.Store;

  /* Escape teks sebelum dimasukkan ke HTML (pengganti <%= %> EJS) */
  function e(v) {
    if (v == null) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* attribute-safe untuk onsubmit confirm */
  function j(v) { return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

  function toast(msg, type) {
    var box = document.getElementById('toastApp');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast-item ' + (type || 'ok');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .3s';
      setTimeout(function () { el.remove(); }, 320);
    }, 2800);
  }

  var flashMsg = null;
  function flash(type, msg) { flashMsg = { type: type, msg: msg }; }
  function takeFlash() { var f = flashMsg; flashMsg = null; return f; }

  /* ---------- komponen ---------- */
  function statusBadge(s) {
    var i = S.statusInfo(s);
    return '<span class="badge ' + i.cls + '">' + e(i.label) + '</span>';
  }
  function faseBadge(f) {
    return '<span class="badge badge-fase ' + e(S.FASE_BADGE[f] || '') + '">' + e(f) + '</span>';
  }
  function stockBadge(n) {
    var i = S.stockInfo(n);
    return '<span class="badge ' + i.cls + '">' + e(i.label) + '</span>';
  }
  function thumb(src, cls) {
    cls = cls || 'cell-thumb';
    if (src) return '<img src="' + e(src) + '" class="' + cls + '" alt="" />';
    return '<div class="' + cls + ' empty">🌱</div>';
  }
  function stars(n) {
    var out = '<span class="stars">';
    for (var i = 1; i <= 5; i++) out += '<span class="' + (i <= n ? '' : 'dim') + '">★</span>';
    return out + '</span>';
  }
  function emptyState(icon, title, sub) {
    return '<div class="empty-state"><i class="bi ' + e(icon) + '"></i>' +
      '<div class="title">' + e(title) + '</div>' +
      (sub ? '<div>' + sub + '</div>' : '') + '</div>';
  }
  function pageHead(title, sub, rightHTML) {
    return '<div class="page-head"><div><h1>' + title + '</h1>' +
      (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' +
      (rightHTML || '') + '</div>';
  }
  function flashHTML() {
    var f = takeFlash();
    if (!f) return '';
    var icon = f.type === 'success' ? 'bi-check-circle-fill'
      : f.type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';
    return '<div class="alert alert-' + f.type + ' alert-dismissible fade show app-alert" role="alert">' +
      '<i class="bi ' + icon + ' me-2"></i>' + e(f.msg) +
      '<button type="button" class="btn-close" data-dismiss="1" aria-label="Tutup"></button></div>';
  }
  function demoBanner(text) {
    return '<div class="demo-banner"><i class="bi bi-info-circle-fill me-1"></i>' + text + '</div>';
  }

  /* ---------- navigasi sidebar ---------- */
  function link(href, active, icon, label, extra) {
    return '<a class="side-link' + (active === href ? ' active' : '') + '" href="' + href + '">' +
      '<i class="bi ' + icon + '"></i><span>' + label + '</span>' + (extra || '') + '</a>';
  }
  function navAdmin(active) {
    var pending = S.state.orders.filter(function (o) { return o.status === 'pending'; }).length;
    var pendingBadge = pending > 0 ? '<span class="side-count">' + pending + '</span>' : '';
    return '<nav class="side-nav">' +
      link('#/admin', active, 'bi-grid-1x2-fill', 'Dashboard') +
      '<div class="side-label">Manajemen</div>' +
      link('#/admin/akun', active, 'bi-people-fill', 'Data Akun') +
      link('#/admin/katalog', active, 'bi-shop', 'Katalog Anggrek') +
      link('#/admin/pesanan', active, 'bi-bag-check-fill', 'Pesanan', pendingBadge) +
      link('#/admin/ulasan', active, 'bi-star-fill', 'Ulasan') +
      link('#/admin/galeri', active, 'bi-images', 'Galeri') +
      '<div class="side-label">Analitik</div>' +
      link('#/admin/laporan', active, 'bi-file-earmark-bar-graph-fill', 'Laporan Penjualan') +
      '</nav>';
  }
  function navKaryawan(active) {
    return '<nav class="side-nav">' +
      link('#/karyawan/anggrek', active, 'bi-flower2', 'Manajemen Data Anggrek') +
      '<div class="side-label">Akun</div>' +
      link('#/karyawan/akun', active, 'bi-person-circle', 'Data Akun') +
      '</nav>';
  }
  function navCustomer(active) {
    var n = S.state.cart.reduce(function (s, i) { return s + i.qty; }, 0);
    var badge = n > 0 ? '<span class="side-count">' + n + '</span>' : '';
    return '<nav class="side-nav">' +
      link('#/customer/katalog', active, 'bi-flower1', 'Katalog Anggrek') +
      link('#/customer/keranjang', active, 'bi-cart3', 'Keranjang', badge) +
      link('#/customer/pesanan', active, 'bi-bag-check-fill', 'Pesanan Saya') +
      link('#/customer/galeri', active, 'bi-images', 'Galeri') +
      link('#/customer/ulasan', active, 'bi-star-fill', 'Ulasan') +
      '<div class="side-label">Akun</div>' +
      link('#/customer/akun', active, 'bi-person-circle', 'Data Akun') +
      '</nav>';
  }

  /* ---------- shell ---------- */
  function shell(opts, bodyHTML) {
    var user = S.currentUser();
    var navHTML = opts.nav === 'admin' ? navAdmin(opts.active)
      : opts.nav === 'karyawan' ? navKaryawan(opts.active)
      : navCustomer(opts.active);
    return '<div class="layout">' +
      '<aside class="sidebar" id="sidebar">' +
        '<div class="brand"><div class="brand-badge">🌸</div><div>' +
          '<div class="brand-name">D\'Orchid</div><div class="brand-sub">Orchid Shop</div>' +
        '</div></div>' + navHTML +
        '<div class="sidebar-foot"><i class="bi bi-flower1"></i> © 2026 D\'Orchid</div>' +
      '</aside>' +
      '<div class="sidebar-overlay" id="sidebarOverlay"></div>' +
      '<div class="main"><header class="topbar">' +
        '<button class="icon-btn" id="sidebarToggle" aria-label="Buka menu"><i class="bi bi-list"></i></button>' +
        '<div class="topbar-title">' + e(opts.title) + '</div>' +
        '<div class="topbar-user">' +
          '<div class="topbar-meta"><div class="topbar-name">' + e(user.name) + '</div>' +
          '<div class="topbar-role">' + e(S.ROLES[user.role]) + '</div></div>' +
          '<div class="avatar">' + e(user.name.trim().charAt(0).toUpperCase()) + '</div>' +
          '<button class="btn-logout" title="Log Out" data-action="logout"><i class="bi bi-box-arrow-right"></i></button>' +
        '</div></header>' +
      '<main class="content">' + flashHTML() + bodyHTML + '</main></div></div>';
  }

  function bindShell() {
    var toggle = document.getElementById('sidebarToggle');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (toggle && sidebar) {
      toggle.onclick = function () {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show', sidebar.classList.contains('open'));
      };
    }
    if (overlay && sidebar) {
      overlay.onclick = function () {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
      };
    }
    var logoutBtn = document.querySelector('[data-action="logout"]');
    if (logoutBtn) {
      logoutBtn.onclick = function () {
        if (confirm('Keluar dari akun ' + S.currentUser().name + '?')) {
          S.logout();
          toast('Berhasil logout. Sampai jumpa! 👋');
          location.hash = '#/login';
        }
      };
    }
    var closeAlert = document.querySelector('.app-alert [data-dismiss]');
    if (closeAlert) closeAlert.onclick = function () { closeAlert.closest('.alert').remove(); };
  }

  window.UI = {
    e: e, j: j, toast: toast, flash: flash, takeFlash: takeFlash,
    statusBadge: statusBadge, faseBadge: faseBadge, stockBadge: stockBadge,
    thumb: thumb, stars: stars, emptyState: emptyState, pageHead: pageHead,
    flashHTML: flashHTML, demoBanner: demoBanner,
    shell: shell, bindShell: bindShell
  };
})();
