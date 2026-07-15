const express = require('express');
const { pool } = require('./db');

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/todos', async (req, res) => {
  const result = await pool.query(
    'SELECT id, title, completed, created_at FROM todos ORDER BY id ASC',
  );
  res.json(result.rows);
});

app.post('/todos', async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const result = await pool.query(
    'INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed, created_at',
    [title.trim()],
  );
  return res.status(201).json(result.rows[0]);
});

app.put('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;
  const result = await pool.query(
    `UPDATE todos SET
       title = COALESCE($1, title),
       completed = COALESCE($2, completed)
     WHERE id = $3
     RETURNING id, title, completed, created_at`,
    [title, completed, id],
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'todo not found' });
  }
  return res.json(result.rows[0]);
});

app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM todos WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'todo not found' });
  }
  return res.status(204).send();
});

app.listen(port, () => {
  console.log(`todolist-backend listening on port ${port}`);
});
