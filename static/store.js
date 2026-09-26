/* ============================================================
   D'Orchid — Store (data demo + localStorage)
   Versi static tanpa server: semua data disimpan di browser.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'dorchid_state_v1';

  var FASE_LIST = ['Bibit', 'Anakan', 'Remaja', 'Dewasa', 'Berbunga'];
  var JENIS_LIST = ['Dendrobium', 'Phalaenopsis', 'Cattleya', 'Vanda', 'Cymbidium', 'Paphiopedilum', 'Lainnya'];
  var FASE_BADGE = {
    Bibit: 'fase-bibit', Anakan: 'fase-anakan', Remaja: 'fase-remaja',
    Dewasa: 'fase-dewasa', Berbunga: 'fase-berbunga'
  };
  var STATUS = {
    pending: { label: 'Menunggu', cls: 'bg-warning text-dark' },
    diproses: { label: 'Diproses', cls: 'bg-info text-dark' },
    selesai: { label: 'Selesai', cls: 'bg-success' },
    dibatalkan: { label: 'Dibatalkan', cls: 'bg-secondary' }
  };
  var ROLES = { admin: 'Administrator', karyawan: 'Karyawan', customer: 'Customer' };

  /* ---------- util ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function dt(daysAgo, hoursAgo) {
    var d = new Date(Date.now() - (daysAgo || 0) * 864e5 - (hoursAgo || 0) * 36e5);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function firstOfMonth() { return today().slice(0, 8) + '01'; }

  var rpFmt = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  });
  function rp(n) { return rpFmt.format(Number(n) || 0); }
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function fmtDate(s) {
    if (!s) return '-';
    var p = String(s).split(' '), d = p[0].split('-');
    if (d.length < 3) return s;
    return Number(d[2]) + ' ' + BULAN[Number(d[1]) - 1] + ' ' + d[0] + (p[1] ? ', ' + p[1].slice(0, 5) : '');
  }
  function fmtDateOnly(s) {
    if (!s) return '-';
    var d = String(s).split(' ')[0].split('-');
    if (d.length < 3) return s;
    return Number(d[2]) + ' ' + BULAN[Number(d[1]) - 1] + ' ' + d[0];
  }
  function statusInfo(s) { return STATUS[s] || { label: s, cls: 'bg-secondary' }; }
  function stockInfo(n) {
    n = Number(n) || 0;
    if (n <= 0) return { label: 'Habis', cls: 'bg-danger' };
    if (n <= 5) return { label: 'Menipis', cls: 'bg-warning text-dark' };
    return { label: 'Aman', cls: 'bg-success' };
  }
  function nextId(arr) { return arr.reduce(function (m, x) { return Math.max(m, x.id); }, 0) + 1; }

  /* ---------- seed data demo ---------- */
  function seed() {
    var users = [
      { id: 1, name: 'Administrator', email: 'admin@d-orchid.id', password: 'admin123', role: 'admin', phone: '0811-1111-1111', address: 'Jl. Melati No. 1, Bandung', created_at: dt(120, 0) },
      { id: 2, name: 'Rina Perawat', email: 'karyawan@d-orchid.id', password: 'karyawan123', role: 'karyawan', phone: '0822-2222-2222', address: 'Jl. Kembang No. 2, Bandung', created_at: dt(100, 0) },
      { id: 3, name: 'Sari Wulandari', email: 'sari@mail.com', password: 'customer123', role: 'customer', phone: '0813-3333-3333', address: 'Jl. Kenanga No. 10, Bandung', created_at: dt(80, 0) },
      { id: 4, name: 'Budi Santoso', email: 'budi@mail.com', password: 'customer123', role: 'customer', phone: '0814-4444-4444', address: 'Jl. Dahlia No. 5, Jakarta', created_at: dt(60, 0) },
      { id: 5, name: 'Citra Lestari', email: 'citra@mail.com', password: 'customer123', role: 'customer', phone: '0815-5555-5555', address: 'Jl. Mawar No. 7, Bogor', created_at: dt(40, 0) }
    ];

    var O = function (name, jenis, varietas, fase, stock, description, image, createdAgo) {
      return {
        id: 0, name: name, jenis: jenis, varietas: varietas, fase: fase, stock: stock,
        description: description, image: image, created_by: 2,
        created_at: dt(createdAgo, 0), updated_at: dt(createdAgo, 0)
      };
    };
    var orchids = [
      O('Dendrobium Violet Queen', 'Dendrobium', 'Violet Queen', 'Berbunga', 12,
        'Anggrek Dendrobium ungu dengan bunga padat dan wangi lembut. Cocok untuk hadiah dan koleksi.',
        'images/orchid-dendrobium.jpg', 45),
      O('Phalaenopsis Snow White', 'Phalaenopsis', 'Snow White', 'Berbunga', 8,
        'Phalaenopsis putih salju dengan sentuhan pink di pusat bunga. Tahan lama hingga 8 minggu.',
        'images/orchid-phalaenopsis.jpg', 42),
      O('Cattleya Pink Splash', 'Cattleya', 'Pink Splash', 'Dewasa', 6,
        'Cattleya merah muda dengan bibir kuning keemasan, aromanya harum di pagi hari.',
        'images/orchid-cattleya.jpg', 40),
      O('Dendrobium Solar Flare', 'Dendrobium', 'Solar Flare', 'Remaja', 15,
        'Varietas baru dengan gradasi oranye-merah yang mencolok, cepat beranak.',
        'images/orchid-dendrobium.jpg', 35),
      O('Phalaenopsis Golden Wave', 'Phalaenopsis', 'Golden Wave', 'Anakan', 20,
        'Anakan Phalaenopsis kuning keemasan, ideal untuk pemula karena mudah dirawat.',
        'images/orchid-phalaenopsis.jpg', 30),
      O('Vanda Royal Blue', 'Vanda', 'Royal Blue', 'Dewasa', 5,
        'Vanda biru langka dengan pola jaring yang unik. Ditanam tanpa media (suspended).',
        'images/hero-login.jpg', 25),
      O('Anggrek Bulan Putih', 'Phalaenopsis', 'Anggrek Bulan', 'Bibit', 30,
        'Bibit anggrek bulan putih klasik, siap tanam dalam pot kecil.',
        'images/orchid-phalaenopsis.jpg', 20),
      O('Cattleya Sunset', 'Cattleya', 'Sunset', 'Bibit', 25,
        'Bibit Cattleya warna jingga senja, langka dan banyak dicari kolektor.',
        'images/orchid-cattleya.jpg', 15),
      O('Dendrobium Moonlight', 'Dendrobium', 'Moonlight', 'Remaja', 10,
        'Dendrobium kuning pucat yang mekar di malam hari dengan aroma vanilla.', '', 10),
      O('Vanda Sunset Magic', 'Vanda', 'Sunset Magic', 'Anakan', 18,
        'Anakan Vanda dengan kombinasi merah muda dan kuning yang ceria.', '', 5)
    ];
    orchids.forEach(function (o, i) { o.id = i + 1; });

    var catalogSpec = [
      [1, 250000, 38], [2, 185000, 36], [3, 320000, 34],
      [5, 95000, 28], [6, 450000, 22], [9, 150000, 8]
    ];
    var catalog = catalogSpec.map(function (c, i) {
      return {
        id: i + 1, orchid_id: c[0], price: c[1], is_active: 1,
        created_at: dt(c[2], 0), updated_at: dt(c[2], 0)
      };
    });
    function catId(orchidId) {
      var c = catalog.find(function (x) { return x.orchid_id === orchidId; });
      return c ? c.id : 0;
    }
    function priceOf(orchidId) {
      var c = catalog.find(function (x) { return x.orchid_id === orchidId; });
      return c ? c.price : 0;
    }

    var ordersSpec = [
      [3, 'Sari Wulandari', 'selesai', 'Mohon dikemas aman.', 55, [[1, 2], [2, 1]]],
      [4, 'Budi Santoso', 'selesai', '', 48, [[3, 1]]],
      [5, 'Citra Lestari', 'selesai', 'Kirim sore hari.', 40, [[5, 3], [9, 1]]],
      [3, 'Sari Wulandari', 'selesai', '', 33, [[6, 1]]],
      [4, 'Budi Santoso', 'diproses', '', 25, [[1, 1], [5, 2]]],
      [5, 'Citra Lestari', 'selesai', '', 18, [[2, 2]]],
      [3, 'Sari Wulandari', 'diproses', 'Sertakan kartu ucapan.', 12, [[3, 1], [9, 2]]],
      [4, 'Budi Santoso', 'pending', '', 7, [[1, 3]]],
      [5, 'Citra Lestari', 'selesai', '', 4, [[5, 1]]],
      [3, 'Sari Wulandari', 'pending', 'Butuh invoice.', 2, [[6, 1], [2, 1]]],
      [4, 'Budi Santoso', 'dibatalkan', 'Customer membatalkan.', 20, [[3, 2]]]
    ];
    var orders = [], order_items = [];
    ordersSpec.forEach(function (spec, i) {
      var oid = i + 1, total = 0, at = dt(spec[4], 9);
      var items = spec[5].map(function (it) {
        var name = orchids[it[0] - 1].name, price = priceOf(it[0]);
        total += price * it[1];
        return { item_name: name, price: price, qty: it[1] };
      });
      orders.push({
        id: oid, customer_id: spec[0], customer_name: spec[1], total: total,
        status: spec[2], note: spec[3], created_at: at, updated_at: at
      });
      items.forEach(function (it, j) {
        order_items.push({
          id: (oid - 1) * 10 + j + 1, order_id: oid,
          catalog_id: catId(orchids.findIndex(function (o) { return o.name === it.item_name; }) + 1),
          item_name: it.item_name, price: it.price, qty: it.qty
        });
      });
    });

    var reviews = [
      { id: 1, customer_id: 3, catalog_id: catId(1), rating: 5, comment: 'Bunganya lebat sekali sampai sekarang masih mekar. Packing rapi, puas belanja di sini!', reply: 'Terima kasih Sari! Senang bunga-nya cocok. 🌸', replied_at: dt(1, 0), created_at: dt(2, 10) },
      { id: 2, customer_id: 4, catalog_id: catId(3), rating: 4, comment: 'Cattleya-nya sehat dan wangi, cuma agak lama pengirimannya.', reply: '', replied_at: '', created_at: dt(10, 14) },
      { id: 3, customer_id: 5, catalog_id: catId(2), rating: 5, comment: 'Putih bersih seperti di foto, pelayanannya ramah banget.', reply: 'Terima kasih banyak, Citra!', replied_at: dt(5, 11), created_at: dt(15, 9) },
      { id: 4, customer_id: 3, catalog_id: catId(6), rating: 5, comment: 'Vanda birunya cantik! Dikirim dengan akar yang masih basah, langsung sehat.', reply: '', replied_at: '', created_at: dt(6, 16) },
      { id: 5, customer_id: 5, catalog_id: catId(5), rating: 4, comment: 'Anakannya gemuk-gemuk, harga juga terjangkau.', reply: '', replied_at: '', created_at: dt(3, 13) }
    ];

    var gallery = [
      { id: 1, title: "Kebun Anggrek D'Orchid", caption: 'Koleksi anggrek yang dirawat langsung oleh tenaga perawatan kami.', image: 'images/gallery-greenhouse.jpg', created_at: dt(50, 0) },
      { id: 2, title: 'Koleksi Dendrobium', caption: 'Dendrobium ungu andalan toko, siap dikirim ke seluruh Indonesia.', image: 'images/orchid-dendrobium.jpg', created_at: dt(44, 0) },
      { id: 3, title: 'Phalaenopsis Premium', caption: 'Phalaenopsis pilihan dengan bunga tahan lama hingga 8 minggu.', image: 'images/orchid-phalaenopsis.jpg', created_at: dt(37, 0) },
      { id: 4, title: 'Cattleya Warna-Warni', caption: 'Cattleya harum yang selalu menjadi favorit kolektor.', image: 'images/orchid-cattleya.jpg', created_at: dt(30, 0) },
      { id: 5, title: 'Sudut Favorit Kolektor', caption: 'Spot foto favorit pengunjung greenhouse kami.', image: 'images/hero-login.jpg', created_at: dt(12, 0) }
    ];

    return {
      users: users, orchids: orchids, catalog: catalog, orders: orders,
      order_items: order_items, reviews: reviews, gallery: gallery,
      cart: [], session: null, seq: { user: 5, orchid: 10, catalog: 6, order: 11, item: 110, review: 5, gallery: 5 }
    };
  }

  /* ---------- persistence (fallback in-memory jika localStorage diblokir) ---------- */
  var memory = null;
  var state;

  function readLS() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return memory; }
  }
  function writeLS(s) {
    memory = s;
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* mode memori */ }
  }

  function load() {
    state = readLS();
    if (!state || !state.users || !state.users.length) {
      state = seed();
      writeLS(state);
    }
    if (!state.cart) state.cart = [];
    return state;
  }

  function save() { writeLS(state); }

  function reset() { state = seed(); writeLS(state); }

  /* ---------- auth (demo, plaintext untuk prototipe UI) ---------- */
  function currentUser() {
    if (!state.session) return null;
    return state.users.find(function (u) { return u.id === state.session; }) || null;
  }
  function login(email, password) {
    var u = state.users.find(function (x) {
      return x.email.toLowerCase() === String(email || '').trim().toLowerCase();
    });
    if (!u || u.password !== password) return null;
    state.session = u.id;
    save();
    return u;
  }
  function register(data) {
    if (state.users.some(function (u) { return u.email.toLowerCase() === data.email.toLowerCase(); })) {
      return { error: 'Email sudah terdaftar. Silakan login.' };
    }
    var u = {
      id: nextId(state.users), name: data.name, email: data.email, password: data.password,
      role: 'customer', phone: data.phone || '', address: data.address || '', created_at: dt(0, 0)
    };
    state.users.push(u);
    state.session = u.id;
    save();
    return { user: u };
  }
  function logout() { state.session = null; save(); }

  function roleHome(role) {
    return role === 'admin' ? '#/admin' : role === 'karyawan' ? '#/karyawan' : '#/customer';
  }

  /* ---------- query helpers ---------- */
  function orchidById(id) { return state.orchids.find(function (o) { return o.id === Number(id); }) || null; }
  function catalogById(id) { return state.catalog.find(function (c) { return c.id === Number(id); }) || null; }
  function catalogOfOrchid(orchidId) { return state.catalog.find(function (c) { return c.orchid_id === Number(orchidId); }) || null; }
  function orderById(id) { return state.orders.find(function (o) { return o.id === Number(id); }) || null; }
  function itemsOf(orderId) { return state.order_items.filter(function (i) { return i.order_id === Number(orderId); }); }
  function userById(id) { return state.users.find(function (u) { return u.id === Number(id); }) || null; }

  function activeCatalog() {
    return state.catalog.filter(function (c) { return c.is_active; }).map(function (c) {
      var o = orchidById(c.orchid_id);
      if (!o) return null;
      var revs = state.reviews.filter(function (r) { return r.catalog_id === c.id; });
      var avg = revs.length ? Math.round((revs.reduce(function (s, r) { return s + r.rating; }, 0) / revs.length) * 10) / 10 : null;
      return {
        catalog_id: c.id, price: c.price, name: o.name, jenis: o.jenis, varietas: o.varietas,
        fase: o.fase, stock: o.stock, image: o.image, description: o.description,
        avg_rating: avg, review_count: revs.length
      };
    }).filter(Boolean).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  /* ---------- CSV ---------- */
  function downloadCSV(filename, rows) {
    var esc = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var lines = rows.map(function (r) { return r.map(esc).join(','); });
    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  load();

  window.Store = {
    KEY: KEY,
    FASE_LIST: FASE_LIST, JENIS_LIST: JENIS_LIST, FASE_BADGE: FASE_BADGE,
    STATUS: STATUS, ROLES: ROLES,
    get state() { return state; },
    save: save, reset: reset, load: load,
    seed: seed,
    rp: rp, fmtDate: fmtDate, fmtDateOnly: fmtDateOnly,
    today: today, firstOfMonth: firstOfMonth, now: dt,
    statusInfo: statusInfo, stockInfo: stockInfo, nextId: nextId,
    currentUser: currentUser, login: login, register: register, logout: logout, roleHome: roleHome,
    orchidById: orchidById, catalogById: catalogById, catalogOfOrchid: catalogOfOrchid,
    orderById: orderById, itemsOf: itemsOf, userById: userById, activeCatalog: activeCatalog,
    downloadCSV: downloadCSV
  };
})();
