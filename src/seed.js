// Seed data awal: akun, data anggrek, katalog, pesanan, ulasan, galeri
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('./db');

const IMG_SRC = path.join(__dirname, '..', 'images');
const IMG_DEST = path.join(__dirname, '..', 'public', 'uploads');

function copySeedImages() {
  fs.mkdirSync(IMG_DEST, { recursive: true });
  if (!fs.existsSync(IMG_SRC)) return {};
  const map = {};
  for (const f of fs.readdirSync(IMG_SRC)) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(f)) continue;
    const dest = path.join(IMG_DEST, f);
    try {
      fs.copyFileSync(path.join(IMG_SRC, f), dest);
      map[f] = '/public/uploads/' + f;
    } catch (e) {
      console.warn('Gagal copy gambar seed:', f, e.message);
    }
  }
  return map;
}

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;

  console.log('Menyiapkan data awal D\'Orchid...');
  const imgs = copySeedImages();
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // ---- Akun ----
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password, role, phone, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const adminId = insertUser.run(
    'Administrator', 'admin@d-orchid.id', hash('admin123'), 'admin',
    '0811-1111-1111', 'Jl. Melati No. 1, Bandung',
    datetimeAgo(0, 120)
  ).lastInsertRowid;
  const karyawanId = insertUser.run(
    'Rina Perawat', 'karyawan@d-orchid.id', hash('karyawan123'), 'karyawan',
    '0822-2222-2222', 'Jl. Kembang No. 2, Bandung',
    datetimeAgo(0, 100)
  ).lastInsertRowid;
  const cust1 = insertUser.run(
    'Sari Wulandari', 'sari@mail.com', hash('customer123'), 'customer',
    '0813-3333-3333', 'Jl. Kenanga No. 10, Bandung',
    datetimeAgo(0, 80)
  ).lastInsertRowid;
  const cust2 = insertUser.run(
    'Budi Santoso', 'budi@mail.com', hash('customer123'), 'customer',
    '0814-4444-4444', 'Jl. Dahlia No. 5, Jakarta',
    datetimeAgo(0, 60)
  ).lastInsertRowid;
  const cust3 = insertUser.run(
    'Citra Lestari', 'citra@mail.com', hash('customer123'), 'customer',
    '0815-5555-5555', 'Jl. Mawar No. 7, Bogor',
    datetimeAgo(0, 40)
  ).lastInsertRowid;

  // ---- Data anggrek (dibuat oleh karyawan) ----
  const insertOrchid = db.prepare(
    `INSERT INTO orchids (name, jenis, varietas, fase, stock, description, image, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const orchids = [
    ['Dendrobium Violet Queen', 'Dendrobium', 'Violet Queen', 'Berbunga', 12,
      'Anggrek Dendrobium ungu dengan bunga padat dan wangi lembut. Cocok untuk hadiah dan koleksi.',
      imgs['orchid-dendrobium.jpg'] || '', karyawanId, datetimeAgo(0, 45)],
    ['Phalaenopsis Snow White', 'Phalaenopsis', 'Snow White', 'Berbunga', 8,
      'Phalaenopsis putih salju dengan sentuhan pink di pusat bunga. Tahan lama hingga 8 minggu.',
      imgs['orchid-phalaenopsis.jpg'] || '', karyawanId, datetimeAgo(0, 42)],
    ['Cattleya Pink Splash', 'Cattleya', 'Pink Splash', 'Dewasa', 6,
      'Cattleya merah muda dengan bibir kuning keemasan, aromanya harum di pagi hari.',
      imgs['orchid-cattleya.jpg'] || '', karyawanId, datetimeAgo(0, 40)],
    ['Dendrobium Solar Flare', 'Dendrobium', 'Solar Flare', 'Remaja', 15,
      'Varietas baru dengan gradasi oranye-merah yang mencolok, cepat beranak.',
      imgs['orchid-dendrobium.jpg'] || '', karyawanId, datetimeAgo(0, 35)],
    ['Phalaenopsis Golden Wave', 'Phalaenopsis', 'Golden Wave', 'Anakan', 20,
      'Anakan Phalaenopsis kuning keemasan, ideal untuk pemula karena mudah dirawat.',
      imgs['orchid-phalaenopsis.jpg'] || '', karyawanId, datetimeAgo(0, 30)],
    ['Vanda Royal Blue', 'Vanda', 'Royal Blue', 'Dewasa', 5,
      'Vanda biru langka dengan pola jaring yang unik. Ditanam tanpa media (suspended).',
      imgs['hero-login.jpg'] || '', karyawanId, datetimeAgo(0, 25)],
    ['Anggrek Bulan Putih', 'Phalaenopsis', 'Anggrek Bulan', 'Bibit', 30,
      'Bibit anggrek bulan putih klasik, siap tanam dalam pot kecil.',
      imgs['orchid-phalaenopsis.jpg'] || '', karyawanId, datetimeAgo(0, 20)],
    ['Cattleya Sunset', 'Cattleya', 'Sunset', 'Bibit', 25,
      'Bibit Cattleya warna jingga senja, langka dan banyak dicari kolektor.',
      imgs['orchid-cattleya.jpg'] || '', karyawanId, datetimeAgo(0, 15)],
    ['Dendrobium Moonlight', 'Dendrobium', 'Moonlight', 'Remaja', 10,
      'Dendrobium kuning pucat yang mekar di malam hari dengan aroma vanilla.',
      '', karyawanId, datetimeAgo(0, 10)],
    ['Vanda Sunset Magic', 'Vanda', 'Sunset Magic', 'Anakan', 18,
      'Anakan Vanda dengan kombinasi merah muda dan kuning yang ceria.',
      '', karyawanId, datetimeAgo(0, 5)],
  ];
  const orchidIds = {};
  for (const o of orchids) {
    const id = insertOrchid.run(...o).lastInsertRowid;
    orchidIds[o[0]] = id;
  }

  // ---- Katalog (dipilih admin dari data anggrek) ----
  const insertCatalog = db.prepare(
    'INSERT INTO catalog (orchid_id, price, is_active, created_at, updated_at) VALUES (?, ?, 1, ?, ?)'
  );
  const catalogSpec = [
    ['Dendrobium Violet Queen', 250000, datetimeAgo(0, 38)],
    ['Phalaenopsis Snow White', 185000, datetimeAgo(0, 36)],
    ['Cattleya Pink Splash', 320000, datetimeAgo(0, 34)],
    ['Phalaenopsis Golden Wave', 95000, datetimeAgo(0, 28)],
    ['Vanda Royal Blue', 450000, datetimeAgo(0, 22)],
    ['Dendrobium Moonlight', 150000, datetimeAgo(0, 8)],
  ];
  const catalogIds = {};
  for (const [name, price, at] of catalogSpec) {
    const id = insertCatalog.run(orchidIds[name], price, at, at).lastInsertRowid;
    catalogIds[name] = id;
  }

  // ---- Pesanan ----
  const insertOrder = db.prepare(
    `INSERT INTO orders (customer_id, customer_name, total, status, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, catalog_id, item_name, price, qty) VALUES (?, ?, ?, ?, ?)'
  );

  const orders = [
    [cust1, 'Sari Wulandari', 'selesai', 'Mohon dikemas aman.', 55, [
      ['Dendrobium Violet Queen', 2], ['Phalaenopsis Snow White', 1]]],
    [cust2, 'Budi Santoso', 'selesai', '', 48, [['Cattleya Pink Splash', 1]]],
    [cust3, 'Citra Lestari', 'selesai', 'Kirim sore hari.', 40, [
      ['Phalaenopsis Golden Wave', 3], ['Dendrobium Moonlight', 1]]],
    [cust1, 'Sari Wulandari', 'selesai', '', 33, [['Vanda Royal Blue', 1]]],
    [cust2, 'Budi Santoso', 'diproses', '', 25, [
      ['Dendrobium Violet Queen', 1], ['Phalaenopsis Golden Wave', 2]]],
    [cust3, 'Citra Lestari', 'selesai', '', 18, [['Phalaenopsis Snow White', 2]]],
    [cust1, 'Sari Wulandari', 'diproses', 'Sertakan kartu ucapan.', 12, [
      ['Cattleya Pink Splash', 1], ['Dendrobium Moonlight', 2]]],
    [cust2, 'Budi Santoso', 'pending', '', 7, [['Dendrobium Violet Queen', 3]]],
    [cust3, 'Citra Lestari', 'selesai', '', 4, [['Phalaenopsis Golden Wave', 1]]],
    [cust1, 'Sari Wulandari', 'pending', 'Butuh invoice.', 2, [
      ['Vanda Royal Blue', 1], ['Phalaenopsis Snow White', 1]]],
    [cust2, 'Budi Santoso', 'dibatalkan', 'Customer membatalkan.', 20,
      [['Cattleya Pink Splash', 2]]],
  ];

  for (const [custId, custName, status, note, daysAgo, items] of orders) {
    let total = 0;
    const rows = items.map(([name, qty]) => {
      const price = catalogSpec.find((c) => c[0] === name)[1];
      total += price * qty;
      return [name, price, qty];
    });
    const at = datetimeAgo(daysAgo, 9 + Math.abs(daysAgo) % 8);
    const oid = insertOrder.run(custId, custName, total, status, note, at, at).lastInsertRowid;
    for (const [name, price, qty] of rows) {
      insertItem.run(oid, catalogIds[name], name, price, qty);
    }
  }

  // ---- Ulasan ----
  const insertReview = db.prepare(
    `INSERT INTO reviews (customer_id, catalog_id, rating, comment, reply, replied_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  insertReview.run(cust1, catalogIds['Dendrobium Violet Queen'], 5,
    'Bunganya lebat sekali sampai sekarang masih mekar. Packing rapi, puas belanja di sini!',
    'Terima kasih Sari! Senang bunga-nya cocok. 🌸', datetimeAgo(1, 0), datetimeAgo(2, 10));
  insertReview.run(cust2, catalogIds['Cattleya Pink Splash'], 4,
    'Cattleya-nya sehat dan wangi, cuma agak lama pengirimannya.', '', null, datetimeAgo(10, 14));
  insertReview.run(cust3, catalogIds['Phalaenopsis Snow White'], 5,
    'Putih bersih seperti di foto, pelayanannya ramah banget.',
    'Terima kasih banyak, Citra!', datetimeAgo(5, 11), datetimeAgo(15, 9));
  insertReview.run(cust1, catalogIds['Vanda Royal Blue'], 5,
    'Vanda birunya cantik! Dikirim dengan akar yang masih basah, langsung sehat.',
    '', null, datetimeAgo(6, 16));
  insertReview.run(cust3, catalogIds['Phalaenopsis Golden Wave'], 4,
    'Anakannya gemuk-gemuk, harga juga terjangkau.', '', null, datetimeAgo(3, 13));

  // ---- Galeri ----
  const insertGallery = db.prepare('INSERT INTO gallery (title, caption, image, created_at) VALUES (?, ?, ?, ?)');
  const gal = [
    ['Kebun Anggrek D\'Orchid', 'Koleksi anggrek yang dirawat langsung oleh tenaga perawatan kami.',
      imgs['gallery-greenhouse.jpg'] || '', datetimeAgo(0, 50)],
    ['Koleksi Dendrobium', 'Dendrobium ungu andalan toko, siap dikirim ke seluruh Indonesia.',
      imgs['orchid-dendrobium.jpg'] || '', datetimeAgo(0, 44)],
    ['Phalaenopsis Premium', 'Phalaenopsis pilihan dengan bunga tahan lama hingga 8 minggu.',
      imgs['orchid-phalaenopsis.jpg'] || '', datetimeAgo(0, 37)],
    ['Cattleya Warna-Warni', 'Cattleya harum yang selalu menjadi favorit kolektor.',
      imgs['orchid-cattleya.jpg'] || '', datetimeAgo(0, 30)],
    ['Sudut Favorit Kolektor', 'Spot foto favorit pengunjung greenhouse kami.',
      imgs['hero-login.jpg'] || '', datetimeAgo(0, 12)],
  ];
  for (const g of gal) insertGallery.run(...g);

  console.log('Data awal berhasil dibuat. Login: admin@d-orchid.id/admin123, karyawan@d-orchid.id/karyawan123, sari@mail.com/customer123');
}

// datetime N hari lalu (opsional jam)
function datetimeAgo(daysAgo, hoursAgo = 0) {
  const d = new Date(Date.now() - daysAgo * 24 * 3600 * 1000 - hoursAgo * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

module.exports = seed;
module.exports.force = () => {
  db.exec('DELETE FROM order_items; DELETE FROM orders; DELETE FROM reviews; DELETE FROM catalog; DELETE FROM gallery; DELETE FROM orchids; DELETE FROM users;');
  seed();
};
