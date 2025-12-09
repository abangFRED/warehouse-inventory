const path = require('path');
const fs = require('fs');
const multer = require('multer');
const express = require('express');
const cors = require('cors');
const db = require('./db');


const app = express();
const PORT = process.env.PORT || 4000;

initDb();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({ storage });


// ========== API ROUTES ==========

// GET /api/items?query=&category=
// search barang + list
app.get('/api/items', (req, res) => {
  const { query, category } = req.query;

  let sql = `
    SELECT items.*, locations.name AS location_name
    FROM items
    LEFT JOIN locations ON items.location_id = locations.id
    WHERE 1 = 1
  `;
  const params = [];

  if (query) {
    sql += ` AND (items.name LIKE ? OR items.code LIKE ? OR items.category LIKE ?)`;
    const like = `%${query}%`;
    params.push(like, like, like);
  }

  if (category) {
    sql += ` AND items.category = ?`;
    params.push(category);
  }

  sql += ` ORDER BY items.updated_at DESC LIMIT 100`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/items  (tambah barang baru)
app.post('/api/items', upload.single('image'), (req, res) => {
  try {
    const { code, name, category, description, quantity, location_id } = req.body;

    if (!name || !quantity) {
      return res.status(400).json({ error: 'Name dan quantity wajib diisi' });
    }

    // kalau ada file, simpan path relatifnya
    let imagePath = null;
    if (req.file) {
      // simpan dalam bentuk: uploads/namafile.png
      imagePath = path.posix.join('uploads', req.file.filename);
    }

    const sql = `
      INSERT INTO items (code, name, category, description, quantity, location_id, image_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      code || null,
      name,
      category || null,
      description || null,
      Number(quantity) || 0,
      location_id || null,
      imagePath
    ];

    db.run(sql, params, function (err) {
      if (err) {
        console.error('ERROR INSERT ITEM:', err);
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        id: this.lastID,
        image_path: imagePath
      });
    });
  } catch (err) {
    console.error('UNEXPECTED ERROR /api/items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// PATCH /api/items/:id/stock  (update stok)
app.patch('/api/items/:id/stock', (req, res) => {
  const { id } = req.params;
  const { quantity_change, note, type } = req.body; // type: 'IN' or 'OUT'

  const q = Number(quantity_change || 0);
  if (!q) return res.status(400).json({ error: 'quantity_change required' });

  db.get(`SELECT quantity FROM items WHERE id = ?`, [id], (err, item) => {
    if (err || !item) return res.status(404).json({ error: 'Item not found' });

    const newQty = type === 'OUT' ? item.quantity - q : item.quantity + q;

    db.run(
      `UPDATE items
       SET quantity = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newQty, id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        db.run(
          `INSERT INTO stock_movements (item_id, type, quantity, note)
           VALUES (?, ?, ?, ?)`,
          [id, type || 'ADJUST', q, note || null]
        );

        res.json({ message: 'Stock updated', quantity: newQty });
      }
    );
  });
});

// GET /api/locations  (list lokasi)
app.get('/api/locations', (_, res) => {
  db.all(`SELECT * FROM locations ORDER BY name ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/locations  (tambah lokasi gudang)
app.post('/api/locations', (req, res) => {
  const { name, description } = req.body;
  db.run(
    `INSERT INTO locations (name, description) VALUES (?, ?)`,
    [name, description || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Location created' });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Inventory backend running on http://localhost:${PORT}`);
});
