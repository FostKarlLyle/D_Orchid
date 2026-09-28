/* ============================================================
   D'Orchid — Views Karyawan (versi static)
   ============================================================ */
(function () {
  'use strict';
  var S = window.Store, U = window.UI, e = U.e;
  var V = {};

  /* ============ DATA AKUN ============ */
  V.account = function () {
    var akun = S.currentUser();
    var myOrchids = S.state.orchids.filter(function (o) { return o.created_by === akun.id; });
    var inCatalog = myOrchids.filter(function (o) { return S.catalogOfOrchid(o.id); }).length;

    var html = U.pageHead('Data Akun', 'Lihat dan ubah data akun kamu') + `
      <div class="grid-2-1">
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-person-badge"></i> Profil Saya</div>
          <div class="panel-sub">Role: <span class="badge bg-primary">Karyawan / Tenaga Perawatan Anggrek</span></div>
          <form data-form="akun" class="row g-3">
            <div class="col-md-6"><label class="form-label">Nama Lengkap *</label>
              <input type="text" name="name" class="form-control" required value="${e(akun.name)}" /></div>
            <div class="col-md-6"><label class="form-label">Email *</label>
              <input type="email" name="email" class="form-control" required value="${e(akun.email)}" /></div>
            <div class="col-md-6"><label class="form-label">No. HP</label>
              <input type="text" name="phone" class="form-control" value="${e(akun.phone)}" placeholder="08xx-xxxx-xxxx" /></div>
            <div class="col-md-6"><label class="form-label">Ganti Password <span class="text-muted-2">(opsional)</span></label>
              <input type="password" name="password" class="form-control" minlength="6" placeholder="Kosongkan jika tidak diganti" /></div>
            <div class="col-12"><label class="form-label">Alamat</label>
              <input type="text" name="address" class="form-control" value="${e(akun.address)}" /></div>
            <div class="col-12"><button class="btn-accent" type="submit"><i class="bi bi-check2-circle me-1"></i> Simpan Perubahan</button></div>
          </form>
        </div>
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-bar-chart-fill"></i> Aktivitas Saya</div>
          <div class="panel-sub">Ringkasan data yang kamu kelola</div>
          <div class="stat-card mb-3" style="box-shadow:none;border-style:dashed">
            <div class="stat-icon i-violet"><i class="bi bi-flower2"></i></div>
            <div><div class="stat-label">Data Anggrek Dibuat</div><div class="stat-value">${myOrchids.length}</div></div></div>
          <div class="stat-card mb-3" style="box-shadow:none;border-style:dashed">
            <div class="stat-icon i-pink"><i class="bi bi-shop"></i></div>
            <div><div class="stat-label">Masuk Katalog</div><div class="stat-value">${inCatalog}</div></div></div>
          <div class="demo-box mb-0"><i class="bi bi-info-circle me-1"></i>
            Data anggrek yang kamu buat bisa dipilih <b>Admin</b> untuk dijadikan produk katalog.</div>
        </div>
      </div>`;

    return {
      title: 'Data Akun', nav: 'karyawan', active: '#/karyawan/akun', content: html,
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

  /* ============ MANAJEMEN DATA ANGGREK ============ */
  V.orchids = function (query) {
    var q = (query.q || '').toLowerCase();
    var fase = S.FASE_LIST.includes(query.fase) ? query.fase : '';
    var me = S.currentUser();
    var rows = S.state.orchids.filter(function (o) {
      if (q && !(o.name + ' ' + o.jenis + ' ' + o.varietas).toLowerCase().includes(q)) return false;
      if (fase && o.fase !== fase) return false;
      return true;
    }).sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });

    var html = U.pageHead('Manajemen Data Anggrek', 'Buat, lihat, ubah, dan hapus data anggrek yang dirawat',
      `<a href="#/karyawan/anggrek/tambah" class="btn-accent"><i class="bi bi-plus-lg me-1"></i> Buat Data Anggrek</a>`) + `
      <div class="panel" style="margin-bottom:18px">
        <div class="panel-pad pb-0 d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div class="text-muted-2"><i class="bi bi-lightbulb text-warning me-1"></i>
            Data yang dibuat di sini menjadi kandidat produk katalog pilihan <b>Admin</b>.</div>
          <form class="d-flex gap-2 mb-3" data-form="filter">
            <div class="search-box"><i class="bi bi-search"></i>
              <input class="form-control" type="text" name="q" value="${e(query.q || '')}" placeholder="Cari nama / jenis / varietas..." /></div>
            <select name="fase" class="form-select" style="max-width:150px">
              <option value="">Semua fase</option>
              ${S.FASE_LIST.map(f => `<option value="${f}" ${fase === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
            <button class="btn-soft" type="submit">Filter</button>
          </form>
        </div>
        <div class="table-responsive mt-3">
          <table class="table table-them align-middle">
            <thead><tr><th>Anggrek</th><th>Jenis</th><th>Fase</th><th>Stok</th><th>Status Katalog</th><th>Terakhir Diubah</th><th class="text-end">Aksi</th></tr></thead>
            <tbody>
            ${rows.length ? rows.map(o => {
              var cat = S.catalogOfOrchid(o.id);
              var creator = S.userById(o.created_by);
              return `
              <tr>
                <td><div class="d-flex align-items-center gap-2">${U.thumb(o.image)}
                  <div><div class="cell-title">${e(o.name)}</div>
                  <div class="cell-sub">${e(o.varietas || 'Tanpa varietas')} · oleh ${e(creator ? creator.name : '-')}</div></div></div></td>
                <td>${e(o.jenis)}</td>
                <td>${U.faseBadge(o.fase)}</td>
                <td><b>${o.stock}</b> pot</td>
                <td>${cat ? '<span class="badge bg-success"><i class="bi bi-check-lg"></i> Di katalog</span>'
                  : '<span class="badge bg-secondary">Belum dipilih admin</span>'}</td>
                <td class="cell-sub">${e(S.fmtDate(o.updated_at))}</td>
                <td class="text-end">
                  <a class="btn-icon b-edit" href="#/karyawan/anggrek/${o.id}/ubah" title="Ubah"><i class="bi bi-pencil"></i></a>
                  <button class="btn-icon b-del" title="Hapus" data-del="${o.id}"><i class="bi bi-trash3"></i></button>
                </td>
              </tr>`;
            }).join('')
            : `<tr><td colspan="7">${U.emptyState('bi-flower2', 'Belum ada data anggrek', 'Tekan <b>Buat Data Anggrek</b> untuk menambahkan data pertama.')}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;

    return {
      title: 'Manajemen Data Anggrek', nav: 'karyawan', active: '#/karyawan/anggrek', content: html,
      after: function (root) {
        root.querySelector('[data-form="filter"]').onsubmit = function (ev) {
          ev.preventDefault();
          var qq = root.querySelector('[name=q]').value.trim();
          var ff = root.querySelector('[name=fase]').value;
          var parts = [];
          if (qq) parts.push('q=' + encodeURIComponent(qq));
          if (ff) parts.push('fase=' + encodeURIComponent(ff));
          location.hash = '#/karyawan/anggrek' + (parts.length ? '?' + parts.join('&') : '');
        };
        root.querySelectorAll('[data-del]').forEach(function (btn) {
          btn.onclick = function () {
            var id = Number(btn.getAttribute('data-del'));
            var o = S.orchidById(id);
            if (!o || !confirm('Hapus data "' + o.name + '"? Jika sedang di katalog, produk ikut terhapus.')) return;
            S.state.orchids = S.state.orchids.filter(function (x) { return x.id !== id; });
            S.state.catalog = S.state.catalog.filter(function (c) { return c.orchid_id !== id; });
            S.save();
            U.flash('success', 'Data anggrek "' + o.name + '" berhasil dihapus.');
            App.render();
          };
        });
      }
    };
  };

  V.orchidForm = function (query, id) {
    var o = id ? S.orchidById(id) : null;
    if (id && !o) {
      U.flash('warning', 'Data anggrek tidak ditemukan.');
      return { redirect: '#/karyawan/anggrek' };
    }
    var html = U.pageHead(`${o ? 'Ubah' : 'Buat'} Data Anggrek`,
      `<a class="link-plain" href="#/karyawan/anggrek"><i class="bi bi-arrow-left"></i> Kembali ke data anggrek</a>`) + `
      <div class="panel panel-pad" style="max-width:820px">
        <form data-form="anggrek">
          <div class="row g-3">
            <div class="col-md-7"><label class="form-label">Nama Anggrek *</label>
              <input type="text" name="name" class="form-control" required value="${e(o ? o.name : '')}" placeholder="contoh: Dendrobium Violet Queen" /></div>
            <div class="col-md-5"><label class="form-label">Jenis *</label>
              <select name="jenis" class="form-select" required>
                <option value="">— Pilih jenis —</option>
                ${S.JENIS_LIST.map(j => `<option value="${j}" ${o && o.jenis === j ? 'selected' : ''}>${j}</option>`).join('')}
              </select></div>
            <div class="col-md-5"><label class="form-label">Varietas</label>
              <input type="text" name="varietas" class="form-control" value="${e(o ? o.varietas : '')}" placeholder="contoh: Violet Queen" /></div>
            <div class="col-md-4"><label class="form-label">Fase Pertumbuhan *</label>
              <select name="fase" class="form-select" required>
                <option value="">— Pilih fase —</option>
                ${S.FASE_LIST.map(f => `<option value="${f}" ${o && o.fase === f ? 'selected' : ''}>${f}</option>`).join('')}
              </select></div>
            <div class="col-md-3"><label class="form-label">Stok (pot) *</label>
              <input type="number" name="stock" class="form-control" min="0" required value="${o ? o.stock : ''}" placeholder="0" /></div>
            <div class="col-12"><label class="form-label">Deskripsi</label>
              <textarea name="description" class="form-control" rows="4" placeholder="Deskripsi kondisi, karakter bunga, tips perawatan...">${e(o ? o.description : '')}</textarea></div>
            <div class="col-12"><label class="form-label">Foto Anggrek ${o ? '(kosongkan untuk mempertahankan foto lama)' : ''}</label>
              <input type="file" name="image" class="form-control" accept="image/*" />
              <div class="file-note">Format jpg/png/webp/gif — <b>maks 700 KB</b>.</div></div>
            ${o && o.image ? `
            <div class="col-12"><div class="d-flex align-items-center gap-3">
              <img src="${e(o.image)}" alt="" style="width:120px;height:120px;object-fit:cover;border-radius:14px;border:1px solid var(--line)" />
              <label class="d-flex align-items-center gap-2 text-muted-2" style="font-size:13.5px">
                <input type="checkbox" name="remove_image" value="1" /> Hapus foto ini</label>
            </div></div>` : ''}
          </div>
          <div class="d-flex gap-2 mt-4">
            <button class="btn-accent" type="submit"><i class="bi bi-check2-circle me-1"></i> ${o ? 'Simpan Perubahan' : 'Buat Data Anggrek'}</button>
            <a href="#/karyawan/anggrek" class="btn-soft">Batal</a>
          </div>
        </form>
      </div>`;

    return {
      title: o ? 'Ubah Data Anggrek' : 'Buat Data Anggrek', nav: 'karyawan', active: '#/karyawan/anggrek', content: html,
      after: function (root) {
        root.querySelector('[data-form="anggrek"]').onsubmit = function (ev) {
          ev.preventDefault();
          var name = root.querySelector('[name=name]').value.trim();
          var jenis = root.querySelector('[name=jenis]').value;
          var varietas = root.querySelector('[name=varietas]').value.trim();
          var fase = root.querySelector('[name=fase]').value;
          var stock = parseInt(root.querySelector('[name=stock]').value, 10);
          var description = root.querySelector('[name=description]').value.trim();
          if (!name) return U.toast('Nama anggrek wajib diisi.', 'err');
          if (!S.JENIS_LIST.includes(jenis)) return U.toast('Jenis anggrek tidak valid.', 'err');
          if (!S.FASE_LIST.includes(fase)) return U.toast('Fase pertumbuhan tidak valid.', 'err');
          if (isNaN(stock) || stock < 0) return U.toast('Stok harus angka >= 0.', 'err');
          var file = root.querySelector('[name=image]').files[0];
          var removeImg = root.querySelector('[name=remove_image]') && root.querySelector('[name=remove_image]').checked;

          function commit(imageVal, keepOld) {
            if (o) {
              o.name = name; o.jenis = jenis; o.varietas = varietas; o.fase = fase;
              o.stock = stock; o.description = description; o.updated_at = S.now(0, 0);
              if (imageVal) o.image = imageVal;
              else if (removeImg) o.image = '';
            } else {
              S.state.orchids.push({
                id: S.nextId(S.state.orchids), name: name, jenis: jenis, varietas: varietas,
                fase: fase, stock: stock, description: description,
                image: imageVal || '', created_by: S.currentUser().id,
                created_at: S.now(0, 0), updated_at: S.now(0, 0)
              });
            }
            S.save();
            U.flash('success', o ? 'Data anggrek berhasil diperbarui.' : 'Data anggrek "' + name + '" berhasil dibuat.');
            location.hash = '#/karyawan/anggrek';
          }
          if (file) {
            window.readFileData(file, function (dataUrl, err) {
              if (err) return U.toast(err, 'err');
              commit(dataUrl);
            });
          } else {
            commit(null);
          }
        };
      }
    };
  };

  /* ============ KATALOG (lihat & ubah) ============ */
  V.catalog = function (query) {
    var q = (query.q || '').toLowerCase();
    var rows = S.state.catalog.map(function (c) {
      var o = S.orchidById(c.orchid_id);
      return o ? { c: c, o: o } : null;
    }).filter(Boolean).filter(function (r) {
      if (!q) return true;
      return (r.o.name + ' ' + r.o.jenis + ' ' + r.o.varietas).toLowerCase().includes(q);
    }).sort(function (a, b) { return b.c.created_at.localeCompare(a.c.created_at); });

    var html = U.pageHead('Katalog Anggrek', 'Lihat dan ubah data katalog yang dipilih admin') + `
      <div class="panel" style="margin-bottom:18px">
        <div class="panel-pad pb-0 d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div class="text-muted-2"><i class="bi bi-info-circle me-1"></i>
            Penambahan katalog dilakukan oleh <b>Admin</b>. Di sini kamu bisa mengubah harga & status.</div>
          <form class="d-flex gap-2 mb-3" data-form="cari">
            <div class="search-box"><i class="bi bi-search"></i>
              <input class="form-control" type="text" name="q" value="${e(query.q || '')}" placeholder="Cari nama / jenis / varietas..." /></div>
            <button class="btn-soft" type="submit">Cari</button>
          </form>
        </div>
        <div class="table-responsive mt-3">
          <table class="table table-them align-middle">
            <thead><tr><th>Produk</th><th>Fase</th><th>Harga</th><th>Stok</th><th>Status</th><th class="text-end">Aksi</th></tr></thead>
            <tbody>
            ${rows.length ? rows.map(r => `
              <tr>
                <td><div class="d-flex align-items-center gap-2">${U.thumb(r.o.image)}
                  <div><div class="cell-title">${e(r.o.name)}</div>
                  <div class="cell-sub">${e(r.o.jenis)} · ${e(r.o.varietas || '-')}</div></div></div></td>
                <td>${U.faseBadge(r.o.fase)}</td>
                <td class="price-tag">${e(S.rp(r.c.price))}</td>
                <td><b>${r.o.stock}</b> pot</td>
                <td>${r.c.is_active ? '<span class="badge bg-success">Aktif</span>' : '<span class="badge bg-secondary">Nonaktif</span>'}</td>
                <td class="text-end">
                  <a class="btn-icon b-edit" href="#/karyawan/katalog/${r.c.id}/ubah" title="Ubah data katalog"><i class="bi bi-pencil"></i></a>
                </td>
              </tr>`).join('')
            : `<tr><td colspan="6">${U.emptyState('bi-shop', 'Belum ada data di katalog', 'Admin akan memilih data anggrekmu ke katalog.')}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;

    return {
      title: 'Katalog Anggrek', nav: 'karyawan', active: '#/karyawan/katalog', content: html,
      after: function (root) {
        root.querySelector('[data-form="cari"]').onsubmit = function (ev) {
          ev.preventDefault();
          var v = root.querySelector('[name=q]').value.trim();
          location.hash = '#/karyawan/katalog' + (v ? '?q=' + encodeURIComponent(v) : '');
        };
      }
    };
  };

  V.catalogEdit = function (query, id) {
    var c = S.catalogById(id);
    var o = c ? S.orchidById(c.orchid_id) : null;
    if (!c || !o) {
      U.flash('warning', 'Data katalog tidak ditemukan.');
      return { redirect: '#/karyawan/katalog' };
    }
    var html = U.pageHead('Ubah Data Katalog',
      `<a class="link-plain" href="#/karyawan/katalog"><i class="bi bi-arrow-left"></i> Kembali ke katalog</a>`) + `
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
            <a href="#/karyawan/katalog" class="btn-soft">Batal</a>
          </div>
        </form>
      </div>`;
    return {
      title: 'Ubah Data Katalog', nav: 'karyawan', active: '#/karyawan/katalog', content: html,
      after: function (root) {
        root.querySelector('[data-form="ubah"]').onsubmit = function (ev) {
          ev.preventDefault();
          var price = Number(root.querySelector('[name=price]').value);
          if (!price || price <= 0) return U.toast('Harga harus lebih dari 0.', 'err');
          c.price = price;
          c.is_active = root.querySelector('[name=is_active]').value === '1' ? 1 : 0;
          c.updated_at = S.now(0, 0);
          S.save();
          U.flash('success', 'Data katalog berhasil diperbarui.');
          location.hash = '#/karyawan/katalog';
        };
      }
    };
  };

  window.VKaryawan = V;
})();
