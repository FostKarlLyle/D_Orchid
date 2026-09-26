const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    if (ALLOWED.includes(ext)) return cb(null, true);
    cb(new Error('Format file harus gambar (jpg, jpeg, png, webp, gif).'));
  },
});

// Hapus file lama dari uploads (aman jika bukan milik aplikasi)
function removeUploadedImage(filename) {
  if (!filename) return;
  const base = path.basename(filename);
  const full = path.join(uploadsDir, base);
  if (full.startsWith(uploadsDir)) {
    fs.unlink(full, () => {});
  }
}

module.exports = { upload, uploadsDir, removeUploadedImage };
