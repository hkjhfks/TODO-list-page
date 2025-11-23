const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'todos.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function readTodos() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeTodos([]);
      return [];
    }
    throw err;
  }
}

async function writeTodos(todos) {
  await fs.writeFile(DATA_FILE, JSON.stringify(todos, null, 2), 'utf8');
}

app.get('/api/todos', async (req, res) => {
  try {
    const todos = await readTodos();
    res.json({ todos });
  } catch (err) {
    console.error('Failed to read todos', err);
    res.status(500).json({ error: 'Failed to load todos' });
  }
});

app.post('/api/todos', async (req, res) => {
  const { title, note = '', url = '' } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const todos = await readTodos();
    const todo = {
      id: randomUUID(),
      title: title.trim(),
      note: typeof note === 'string' ? note.trim() : '',
      url: typeof url === 'string' ? url.trim() : '',
      completed: false,
      createdAt: new Date().toISOString(),
    };

    todos.push(todo);
    await writeTodos(todos);
    res.status(201).json({ todo });
  } catch (err) {
    console.error('Failed to create todo', err);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.patch('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const updates = {};

  if (typeof req.body.title === 'string') {
    updates.title = req.body.title.trim();
  }
  if (typeof req.body.note === 'string') {
    updates.note = req.body.note.trim();
  }
  if (typeof req.body.url === 'string') {
    updates.url = req.body.url.trim();
  }
  if (typeof req.body.completed === 'boolean') {
    updates.completed = req.body.completed;
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const todos = await readTodos();
    const idx = todos.findIndex((t) => t.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    todos[idx] = { ...todos[idx], ...updates };
    await writeTodos(todos);
    res.json({ todo: todos[idx] });
  } catch (err) {
    console.error('Failed to update todo', err);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const todos = await readTodos();
    const nextTodos = todos.filter((t) => t.id !== id);

    if (nextTodos.length === todos.length) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    await writeTodos(nextTodos);
    res.status(204).end();
  } catch (err) {
    console.error('Failed to delete todo', err);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// Serve SPA for non-API routes; let unknown API routes 404 naturally
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TODO list server running at http://localhost:${PORT}`);
});
