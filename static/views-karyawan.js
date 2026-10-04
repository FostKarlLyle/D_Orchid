/* ============================================================
   D'Orchid — Views Karyawan (versi static)
   ============================================================ */
(function () {
  'use strict';
  var S = window.Store, U = window.UI, e = U.e;
  var V = {};

  /* ============ DATA AKUN ============ */
  V.account = function (query) {
    var akun = S.currentUser();
    var mode = query && (query.mode === 'edit' || query.mode === 'password') ? query.mode : 'view';
    var HERE = 'karyawan-akun.html';
    var myOrchids = S.state.orchids.filter(function (o) { return o.created_by === akun.id; });
    var inCatalog = myOrchids.filter(function (o) { return S.catalogOfOrchid(o.id); }).length;

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
          <div class="col-md-6"><label class="form-label">Alamat</label>
            <input type="text" name="address" class="form-control" value="${e(akun.address)}" /></div>
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
          ${detailRow('Alamat', akun.address)}
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

    var html = U.pageHead('Profil', sub) + `
      <div class="grid-2-1">
        <div class="panel panel-pad">
          <div class="panel-title"><i class="bi bi-person-badge"></i> Profil Saya</div>
          <div class="panel-sub">Role: <span class="badge bg-primary">Karyawan / Tenaga Perawatan Anggrek</span></div>
          ${panelBody}
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
      title: 'Profil', nav: 'karyawan', active: 'karyawan-akun.html', content: html,
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
      `<a href="karyawan-anggrek-tambah.html" class="btn-accent"><i class="bi bi-plus-lg me-1"></i> Buat Data Anggrek</a>`) + `
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
                  <a class="btn-icon b-edit" href="karyawan-anggrek-ubah.html?id=${o.id}" title="Ubah"><i class="bi bi-pencil"></i></a>
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
      title: 'Manajemen Data Anggrek', nav: 'karyawan', active: 'karyawan-anggrek.html', content: html,
      after: function (root) {
        root.querySelector('[data-form="filter"]').onsubmit = function (ev) {
          ev.preventDefault();
          var qq = root.querySelector('[name=q]').value.trim();
          var ff = root.querySelector('[name=fase]').value;
          var parts = [];
          if (qq) parts.push('q=' + encodeURIComponent(qq));
          if (ff) parts.push('fase=' + encodeURIComponent(ff));
          location.href = 'karyawan-anggrek.html' + (parts.length ? '?' + parts.join('&') : '');
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
      return { redirect: 'karyawan-anggrek.html' };
    }
    var html = U.pageHead(`${o ? 'Ubah' : 'Buat'} Data Anggrek`,
      `<a class="link-plain" href="karyawan-anggrek.html"><i class="bi bi-arrow-left"></i> Kembali ke data anggrek</a>`) + `
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
            <a href="karyawan-anggrek.html" class="btn-soft">Batal</a>
          </div>
        </form>
      </div>`;

    return {
      title: o ? 'Ubah Data Anggrek' : 'Buat Data Anggrek', nav: 'karyawan', active: 'karyawan-anggrek.html', content: html,
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

          function commit(imageVal) {
            var oldStock = o ? o.stock : null;
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
            // Sinkronisasi: stok yang tampil di katalog mengikuti data anggrek
            var msg;
            if (!o) {
              msg = 'Data anggrek "' + name + '" berhasil dibuat.';
            } else if (oldStock !== stock && S.catalogOfOrchid(o.id)) {
              msg = 'Data anggrek diperbarui \u2014 stok ' + oldStock + ' \u2192 ' + stock +
                ' pot. Stok di katalog ikut ter-update otomatis. \ud83d\udd04';
            } else {
              msg = 'Data anggrek berhasil diperbarui.';
            }
            U.flash('success', msg);
            location.href = 'karyawan-anggrek.html';
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

  window.VKaryawan = V;
})();
