const express = require('express');
const multer = require('multer');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadBuffer } = require('../config/cloudinary');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', protect, adminOnly, upload.array('images', 8), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: 'No files uploaded' });

    const urls = await Promise.all(req.files.map((f) => uploadBuffer(f.buffer)));
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
