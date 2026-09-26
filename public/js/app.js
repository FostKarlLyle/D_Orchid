/* D'Orchid — client side helpers (keranjang, toast, sidebar) */
(function () {
  var CART_KEY = 'dorchid_cart_v1';

  function readCart() {
    try {
      var v = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    paintBadge();
  }

  function paintBadge() {
    var n = readCart().reduce(function (s, i) { return s + (i.qty || 0); }, 0);
    document.querySelectorAll('.cart-badge').forEach(function (el) {
      el.textContent = n;
      el.style.display = n > 0 ? 'inline-flex' : 'none';
    });
  }

  function addToCart(id, qty) {
    qty = qty || 1;
    var cart = readCart();
    var ex = null;
    for (var i = 0; i < cart.length; i++) if (cart[i].id === id) ex = cart[i];
    if (ex) ex.qty += qty;
    else cart.push({ id: id, qty: qty });
    writeCart(cart);
    showToast('Ditambahkan ke keranjang 🛒', 'ok');
  }

  function showToast(msg, type) {
    var box = document.getElementById('toastApp');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast-item ' + (type || '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .3s';
      setTimeout(function () { el.remove(); }, 320);
    }, 2600);
  }

  window.DOrchid = {
    readCart: readCart,
    writeCart: writeCart,
    addToCart: addToCart,
    clearCart: function () { writeCart([]); }
  };
  window.showToast = showToast;

  document.addEventListener('DOMContentLoaded', function () {
    paintBadge();

    var toggle = document.getElementById('sidebarToggle');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (toggle && sidebar) {
      toggle.addEventListener('click', function () {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show', sidebar.classList.contains('open'));
      });
    }
    if (overlay && sidebar) {
      overlay.addEventListener('click', function () {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      });
    }
  });
})();
