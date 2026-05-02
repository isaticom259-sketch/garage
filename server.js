const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// connexion MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "garage"
});

db.connect(err => {
  if (err) {
    console.log("DB error", err);
  } else {
    console.log("MySQL connected");
    app.listen(PORT, () => {
      console.log(`Server démarré sur http://localhost:${PORT}`);
    });
  }
});

async function dbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Une erreur serveur est survenue.' });
    }
  };
}

// test route
app.get("/test", wrap(async (req, res) => {
  const rows = await dbQuery('SELECT 1 as test');
  res.json(rows);
}));

app.get('/api/dashboard', wrap(async (req, res) => {
  const [clientCountRow] = await dbQuery('SELECT COUNT(*) AS count FROM clients');
  const [vehicleCountRow] = await dbQuery('SELECT COUNT(*) AS count FROM vehicles');
  const [repairCountRow] = await dbQuery('SELECT COUNT(*) AS count FROM repairs');
  const transactions = await dbQuery('SELECT type, amount, created_at FROM transactions ORDER BY created_at');
  const repairsByMonth = await dbQuery('SELECT created_at, status FROM repairs ORDER BY created_at');
  res.json({
    clientCount: clientCountRow.count,
    vehicleCount: vehicleCountRow.count,
    repairCount: repairCountRow.count,
    transactions,
    repairsByMonth,
  });
}));

app.get('/api/clients', wrap(async (req, res) => {
  const search = req.query.search || '';
  let sql = 'SELECT id, name, phone, created_at FROM clients';
  const params = [];
  if (search) {
    sql += ' WHERE name LIKE ?';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';
  const rows = await dbQuery(sql, params);
  res.json(rows);
}));

app.post('/api/clients', wrap(async (req, res) => {
  const { name, phone } = req.body;
  const result = await dbQuery('INSERT INTO clients (name, phone) VALUES (?, ?)', [name, phone || null]);
  const [row] = await dbQuery('SELECT id, name, phone, created_at FROM clients WHERE id = ?', [result.insertId]);
  res.json(row);
}));

app.put('/api/clients/:id', wrap(async (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;
  await dbQuery('UPDATE clients SET name = ?, phone = ? WHERE id = ?', [name, phone || null, id]);
  const [row] = await dbQuery('SELECT id, name, phone, created_at FROM clients WHERE id = ?', [id]);
  res.json(row);
}));

app.delete('/api/clients/:id', wrap(async (req, res) => {
  await dbQuery('DELETE FROM clients WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

app.get('/api/vehicles', wrap(async (req, res) => {
  const search = req.query.search || '';
  let sql = `SELECT v.id, v.client_id, v.brand, v.model, v.plate_number, v.created_at,
    c.name AS client_name, c.phone AS client_phone
    FROM vehicles v
    LEFT JOIN clients c ON c.id = v.client_id`;
  const params = [];
  if (search) {
    sql += ' WHERE v.plate_number LIKE ? OR v.brand LIKE ? OR v.model LIKE ?';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY v.created_at DESC';
  const rows = await dbQuery(sql, params);
  res.json(rows);
}));

app.post('/api/vehicles', wrap(async (req, res) => {
  const { client_id, brand, model, plate_number } = req.body;
  const result = await dbQuery(
    'INSERT INTO vehicles (client_id, brand, model, plate_number) VALUES (?, ?, ?, ?)',
    [client_id, brand, model, plate_number]
  );
  const [row] = await dbQuery('SELECT id, client_id, brand, model, plate_number, created_at FROM vehicles WHERE id = ?', [result.insertId]);
  res.json(row);
}));

app.put('/api/vehicles/:id', wrap(async (req, res) => {
  const { id } = req.params;
  const { client_id, brand, model, plate_number } = req.body;
  await dbQuery('UPDATE vehicles SET client_id = ?, brand = ?, model = ?, plate_number = ? WHERE id = ?', [client_id, brand, model, plate_number, id]);
  const [row] = await dbQuery('SELECT id, client_id, brand, model, plate_number, created_at FROM vehicles WHERE id = ?', [id]);
  res.json(row);
}));

app.delete('/api/vehicles/:id', wrap(async (req, res) => {
  await dbQuery('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

app.get('/api/repairs', wrap(async (req, res) => {
  const search = req.query.search || '';
  const status = req.query.status || '';
  let sql = `SELECT r.id, r.vehicle_id, r.description, r.labor_price, r.status, r.created_at,
    v.plate_number, v.brand, v.model, c.name AS client_name
    FROM repairs r
    LEFT JOIN vehicles v ON v.id = r.vehicle_id
    LEFT JOIN clients c ON c.id = v.client_id`;
  const params = [];
  const filters = [];
  if (status) {
    filters.push('r.status = ?');
    params.push(status);
  }
  if (search) {
    filters.push('r.description LIKE ?');
    params.push(`%${search}%`);
  }
  if (filters.length) sql += ' WHERE ' + filters.join(' AND ');
  sql += ' ORDER BY r.created_at DESC';
  const rows = await dbQuery(sql, params);
  res.json(rows);
}));

app.get('/api/repairs/:id', wrap(async (req, res) => {
  const [row] = await dbQuery(`SELECT r.id, r.vehicle_id, r.description, r.labor_price, r.status, r.created_at,
    v.plate_number, v.brand, v.model, c.name AS client_name, c.phone AS client_phone
    FROM repairs r
    LEFT JOIN vehicles v ON v.id = r.vehicle_id
    LEFT JOIN clients c ON c.id = v.client_id
    WHERE r.id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Réparation introuvable.' });
  res.json(row);
}));

app.post('/api/repairs', wrap(async (req, res) => {
  const { vehicle_id, description, labor_price, status } = req.body;
  const result = await dbQuery(
    'INSERT INTO repairs (vehicle_id, description, labor_price, status) VALUES (?, ?, ?, ?)',
    [vehicle_id, description, labor_price || 0, status || 'pending']
  );
  const [row] = await dbQuery('SELECT id, vehicle_id, description, labor_price, status, created_at FROM repairs WHERE id = ?', [result.insertId]);
  res.json(row);
}));

app.put('/api/repairs/:id', wrap(async (req, res) => {
  const { id } = req.params;
  const { vehicle_id, description, labor_price, status } = req.body;
  await dbQuery('UPDATE repairs SET vehicle_id = ?, description = ?, labor_price = ?, status = ? WHERE id = ?', [vehicle_id, description, labor_price || 0, status || 'pending', id]);
  const [row] = await dbQuery('SELECT id, vehicle_id, description, labor_price, status, created_at FROM repairs WHERE id = ?', [id]);
  res.json(row);
}));

app.delete('/api/repairs/:id', wrap(async (req, res) => {
  await dbQuery('DELETE FROM repairs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

app.get('/api/repair_parts', wrap(async (req, res) => {
  const repairId = req.query.repair_id;
  const rows = await dbQuery(`SELECT rp.id, rp.repair_id, rp.part_id, rp.quantity_used, rp.unit_price_at_time,
    p.part_name
    FROM repair_parts rp
    LEFT JOIN parts p ON p.id = rp.part_id
    WHERE rp.repair_id = ?`, [repairId]);
  res.json(rows);
}));

app.post('/api/repair_parts', wrap(async (req, res) => {
  const { repair_id, part_id, quantity_used, unit_price_at_time } = req.body;
  const result = await dbQuery(
    'INSERT INTO repair_parts (repair_id, part_id, quantity_used, unit_price_at_time) VALUES (?, ?, ?, ?)',
    [repair_id, part_id, quantity_used, unit_price_at_time]
  );
  const [row] = await dbQuery('SELECT id, repair_id, part_id, quantity_used, unit_price_at_time FROM repair_parts WHERE id = ?', [result.insertId]);
  res.json(row);
}));

app.delete('/api/repair_parts/:id', wrap(async (req, res) => {
  await dbQuery('DELETE FROM repair_parts WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

app.get('/api/parts', wrap(async (req, res) => {
  const search = req.query.search || '';
  let sql = 'SELECT id, part_name, quantity, unit_price, location, created_at FROM parts';
  const params = [];
  if (search) {
    sql += ' WHERE part_name LIKE ? OR location LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY part_name';
  const rows = await dbQuery(sql, params);
  res.json(rows);
}));

app.post('/api/parts', wrap(async (req, res) => {
  const { part_name, quantity, unit_price, location } = req.body;
  const result = await dbQuery(
    'INSERT INTO parts (part_name, quantity, unit_price, location) VALUES (?, ?, ?, ?)',
    [part_name, quantity || 0, unit_price || 0, location || null]
  );
  const [row] = await dbQuery('SELECT id, part_name, quantity, unit_price, location, created_at FROM parts WHERE id = ?', [result.insertId]);
  res.json(row);
}));

app.put('/api/parts/:id', wrap(async (req, res) => {
  const { id } = req.params;
  const { part_name, quantity, unit_price, location } = req.body;
  await dbQuery('UPDATE parts SET part_name = ?, quantity = ?, unit_price = ?, location = ? WHERE id = ?', [part_name, quantity || 0, unit_price || 0, location || null, id]);
  const [row] = await dbQuery('SELECT id, part_name, quantity, unit_price, location, created_at FROM parts WHERE id = ?', [id]);
  res.json(row);
}));

app.delete('/api/parts/:id', wrap(async (req, res) => {
  await dbQuery('DELETE FROM parts WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

app.get('/api/invoices', wrap(async (req, res) => {
  const rows = await dbQuery(`SELECT i.id, i.repair_id, i.total_amount, i.created_at,
    r.description AS repair_description, r.vehicle_id,
    v.plate_number, v.brand, v.model,
    c.name AS client_name
    FROM invoices i
    LEFT JOIN repairs r ON r.id = i.repair_id
    LEFT JOIN vehicles v ON v.id = r.vehicle_id
    LEFT JOIN clients c ON c.id = v.client_id
    ORDER BY i.created_at DESC`);
  res.json(rows);
}));

app.get('/api/invoices/:id', wrap(async (req, res) => {
  const [row] = await dbQuery(`SELECT i.id, i.repair_id, i.total_amount, i.created_at,
    r.description AS repair_description, r.labor_price, r.status,
    v.plate_number, v.brand, v.model,
    c.name AS client_name, c.phone AS client_phone
    FROM invoices i
    LEFT JOIN repairs r ON r.id = i.repair_id
    LEFT JOIN vehicles v ON v.id = r.vehicle_id
    LEFT JOIN clients c ON c.id = v.client_id
    WHERE i.id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Facture introuvable.' });
  const parts = await dbQuery(`SELECT rp.id, rp.part_id, rp.quantity_used, rp.unit_price_at_time, p.part_name
    FROM repair_parts rp
    LEFT JOIN parts p ON p.id = rp.part_id
    WHERE rp.repair_id = ?`, [row.repair_id]);
  res.json({ ...row, parts });
}));

app.post('/api/invoices', wrap(async (req, res) => {
  const { repair_id, total_amount } = req.body;
  const result = await dbQuery('INSERT INTO invoices (repair_id, total_amount) VALUES (?, ?)', [repair_id, total_amount || 0]);
  const [row] = await dbQuery('SELECT id, repair_id, total_amount, created_at FROM invoices WHERE id = ?', [result.insertId]);
  res.json(row);
}));

app.delete('/api/invoices/:id', wrap(async (req, res) => {
  await dbQuery('DELETE FROM invoices WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

app.get('/api/transactions', wrap(async (req, res) => {
  const type = req.query.type || '';
  let sql = `SELECT t.id, t.type, t.amount, t.description, t.repair_id, t.created_at, r.description AS repair_description
    FROM transactions t
    LEFT JOIN repairs r ON r.id = t.repair_id`;
  const params = [];
  if (type) {
    sql += ' WHERE t.type = ?';
    params.push(type);
  }
  sql += ' ORDER BY t.created_at DESC';
  const rows = await dbQuery(sql, params);
  res.json(rows);
}));

app.post('/api/transactions', wrap(async (req, res) => {
  const { type, amount, description, repair_id } = req.body;
  const result = await dbQuery(
    'INSERT INTO transactions (type, amount, description, repair_id) VALUES (?, ?, ?, ?)',
    [type, amount || 0, description || null, repair_id || null]
  );
  const [row] = await dbQuery('SELECT id, type, amount, description, repair_id, created_at FROM transactions WHERE id = ?', [result.insertId]);
  res.json(row);
}));

app.delete('/api/transactions/:id', wrap(async (req, res) => {
  await dbQuery('DELETE FROM transactions WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

app.get('/api/vehicle-options', wrap(async (req, res) => {
  const rows = await dbQuery(`SELECT v.id, v.plate_number, v.brand, v.model, c.name AS client_name
    FROM vehicles v
    LEFT JOIN clients c ON c.id = v.client_id
    ORDER BY v.plate_number`);
  res.json(rows);
}));

app.get('/api/repairs-options', wrap(async (req, res) => {
  const rows = await dbQuery('SELECT id, description, status FROM repairs ORDER BY created_at DESC');
  res.json(rows);
}));

app.get('/api/clients-options', wrap(async (req, res) => {
  const rows = await dbQuery('SELECT id, name FROM clients ORDER BY name');
  res.json(rows);
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
