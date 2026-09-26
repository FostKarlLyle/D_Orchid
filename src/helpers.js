// Helper utilitas untuk format tampilan
const rpFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatRp(n) {
  return rpFormatter.format(Number(n) || 0);
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// '2026-09-26 14:30:00' -> '26 Sep 2026, 14:30'
function formatDate(s) {
  if (!s) return '-';
  const [d, t = ''] = String(s).split(' ');
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return s;
  const time = t.slice(0, 5);
  return `${Number(day)} ${BULAN[Number(m) - 1]} ${y}${time ? ', ' + time : ''}`;
}

// '2026-09-26 14:30:00' -> '26 Sep 2026'
function formatDateOnly(s) {
  if (!s) return '-';
  const [d] = String(s).split(' ');
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return s;
  return `${Number(day)} ${BULAN[Number(m) - 1]} ${y}`;
}

const STATUS = {
  pending: { label: 'Menunggu', cls: 'bg-warning text-dark' },
  diproses: { label: 'Diproses', cls: 'bg-info text-dark' },
  selesai: { label: 'Selesai', cls: 'bg-success' },
  dibatalkan: { label: 'Dibatalkan', cls: 'bg-secondary' },
};

const FASE_LIST = ['Bibit', 'Anakan', 'Remaja', 'Dewasa', 'Berbunga'];
const JENIS_LIST = ['Dendrobium', 'Phalaenopsis', 'Cattleya', 'Vanda', 'Cymbidium', 'Paphiopedilum', 'Lainnya'];

const FASE_BADGE = {
  Bibit: 'fase-bibit',
  Anakan: 'fase-anakan',
  Remaja: 'fase-remaja',
  Dewasa: 'fase-dewasa',
  Berbunga: 'fase-berbunga',
};

function statusInfo(status) {
  return STATUS[status] || { label: status, cls: 'bg-secondary' };
}

function stockInfo(stock) {
  const s = Number(stock) || 0;
  if (s <= 0) return { label: 'Habis', cls: 'bg-danger' };
  if (s <= 5) return { label: 'Menipis', cls: 'bg-warning text-dark' };
  return { label: 'Aman', cls: 'bg-success' };
}

function formatDateInput(s) {
  return String(s || '').slice(0, 10);
}

module.exports = {
  formatRp,
  formatDate,
  formatDateOnly,
  formatDateInput,
  statusInfo,
  stockInfo,
  STATUS,
  FASE_LIST,
  JENIS_LIST,
  FASE_BADGE,
};
