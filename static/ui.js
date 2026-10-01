/* ============================================================
   D'Orchid — UI helpers (versi multipage HTML/CSS/JS)
   Komponen, escape, toast, flash lintas halaman, shell statis.
   ============================================================ */
(function () {
  'use strict';

  var S = window.Store;
  var FLASH_KEY = 'dorchid_flash_v1';
  var flashMem = null;

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

  /* ---------- flash lintas halaman (tersimpan di localStorage) ---------- */
  function flash(type, msg) {
    flashMem = { type: type, msg: msg };
    try { window.localStorage.setItem(FLASH_KEY, JSON.stringify(flashMem)); } catch (err) { /* mode memori */ }
  }
  function takeFlash() {
    var f = flashMem;
    flashMem = null;
    try {
      var raw = window.localStorage.getItem(FLASH_KEY);
      if (raw) {
        window.localStorage.removeItem(FLASH_KEY);
        f = JSON.parse(raw);
      }
    } catch (err) { /* abaikan */ }
    return f;
  }

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

  /* ---------- util: baca file gambar → dataURL (untuk file://) ---------- */
  function readFileData(file, cb) {
    if (!file) return cb(null, 'File tidak ditemukan.');
    if (file.size > 700 * 1024) return cb(null, 'File terlalu besar (maks 700 KB).');
    var reader = new FileReader();
    reader.onload = function () { cb(reader.result, null); };
    reader.onerror = function () { cb(null, 'Gagal membaca file.'); };
    reader.readAsDataURL(file);
  }
  window.readFileData = readFileData;

  /* ---------- navigasi antar-halaman ---------- */
  function go(url) {
    try { document.dispatchEvent(new CustomEvent('dorchid:go', { detail: url })); } catch (err) { /* opsional */ }
    location.href = url;
  }

  /* ---------- shell statis (sidebar/topbar yang ada di tiap file HTML) ---------- */
  function fillUser() {
    var u = S.currentUser();
    if (!u) return;
    var n = document.getElementById('userName');
    if (n) n.textContent = u.name;
    var r = document.getElementById('userRole');
    if (r) r.textContent = S.ROLES[u.role];
    var a = document.getElementById('userAvatar');
    if (a) a.textContent = u.name.trim().charAt(0).toUpperCase();
  }

  function updateBadges() {
    var pend = S.state.orders.filter(function (o) { return o.status === 'pending'; }).length;
    var b1 = document.querySelector('[data-badge="pending"]');
    if (b1) { b1.textContent = pend; b1.style.display = pend > 0 ? '' : 'none'; }
    var cart = S.state.cart.reduce(function (s, i) { return s + i.qty; }, 0);
    var b2 = document.querySelector('[data-badge="cart"]');
    if (b2) { b2.textContent = cart; b2.style.display = cart > 0 ? '' : 'none'; }
  }

  function bindAlerts() {
    var btns = document.querySelectorAll('.app-alert [data-dismiss]');
    Array.prototype.forEach.call(btns, function (btn) {
      btn.onclick = function () { btn.closest('.alert').remove(); };
    });
  }

  function bindStaticShell() {
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
    var logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
      logoutBtn.onclick = function () {
        var u = S.currentUser();
        if (u && confirm('Keluar dari akun ' + u.name + '?')) {
          S.logout();
          flash('success', 'Berhasil logout. Sampai jumpa! 👋');
          go('../index.html');
        }
      };
    }
    fillUser();
    updateBadges();
    bindAlerts();
  }

  window.UI = {
    e: e, j: j, toast: toast, flash: flash, takeFlash: takeFlash,
    statusBadge: statusBadge, faseBadge: faseBadge, stockBadge: stockBadge,
    thumb: thumb, stars: stars, emptyState: emptyState, pageHead: pageHead,
    flashHTML: flashHTML, demoBanner: demoBanner,
    go: go, fillUser: fillUser, updateBadges: updateBadges, bindAlerts: bindAlerts,
    bindStaticShell: bindStaticShell
  };
})();
