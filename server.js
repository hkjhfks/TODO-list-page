const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');
const { Blob } = require('buffer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'todos.json');

const HF_TOKEN = process.env.HF_TOKEN;
const HF_REPO_ID = process.env.HF_REPO_ID || process.env.SPACE_ID;
const HF_REPO_TYPE = process.env.HF_REPO_TYPE || 'space'; // 'model' | 'dataset' | 'space'
const HF_REPO_FILE = process.env.HF_REPO_FILE || 'data/todos.json';
const USE_HF_HUB = Boolean(HF_TOKEN && HF_REPO_ID);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function loadHubModule() {
  // Dynamic import so this file can stay CommonJS.
  const hub = await import('@huggingface/hub');
  return hub;
}

async function readTodosFromHub() {
  const { downloadFile } = await loadHubModule();
  const repo = { type: HF_REPO_TYPE, name: HF_REPO_ID };

  try {
    const response = await downloadFile({
      repo,
      path: HF_REPO_FILE,
      accessToken: HF_TOKEN,
    });
    const raw = await response.text();
    return JSON.parse(raw);
  } catch (err) {
    // If the file does not exist on Hub yet, treat as empty list.
    if (err && (err.status === 404 || err.response?.status === 404)) {
      return [];
    }
    console.error('Failed to read todos from Hub, falling back to local file', err);
    throw err;
  }
}

async function writeTodosToHub(todos) {
  const { uploadFiles } = await loadHubModule();
  const repo = { type: HF_REPO_TYPE, name: HF_REPO_ID };
  const json = JSON.stringify(todos, null, 2);

  // Blob is available in recent Node versions (including Spaces Node runtimes).
  const content = new Blob([json], { type: 'application/json' });

  await uploadFiles({
    repo,
    accessToken: HF_TOKEN,
    files: [
      {
        path: HF_REPO_FILE,
        content,
      },
    ],
    commitMessage: 'Update todos.json from TODO list app',
  });
}

async function readTodosFromLocal() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function writeTodos(todos) {
  // Prefer persisting to Hugging Face Hub when configured.
  if (USE_HF_HUB) {
    try {
      await writeTodosToHub(todos);
      return;
    } catch (err) {
      console.error('Failed to write todos to Hub, falling back to local file', err);
    }
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(todos, null, 2), 'utf8');
}

async function readTodos() {
  if (USE_HF_HUB) {
    try {
      return await readTodosFromHub();
    } catch (err) {
      // Logged inside readTodosFromHub; fall through to local.
    }
  }
  return readTodosFromLocal();
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
