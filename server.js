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

function normalizeState(raw) {
  if (Array.isArray(raw)) {
    return { todos: raw, groups: [] };
  }
  if (raw && typeof raw === 'object') {
    const todos = Array.isArray(raw.todos) ? raw.todos : [];
    const groups = Array.isArray(raw.groups) ? raw.groups : [];
    return { todos, groups };
  }
  return { todos: [], groups: [] };
}

function ensureDefaultGroups(groups) {
  const set = new Set(Array.isArray(groups) ? groups : []);
  set.add('签到');
  return Array.from(set);
}

async function loadHubModule() {
  // Dynamic import so this file can stay CommonJS.
  const hub = await import('@huggingface/hub');
  return hub;
}

async function readStateFromHub() {
  const { downloadFile } = await loadHubModule();
  const repo = { type: HF_REPO_TYPE, name: HF_REPO_ID };

  try {
    const response = await downloadFile({
      repo,
      path: HF_REPO_FILE,
      accessToken: HF_TOKEN,
    });
    const raw = await response.text();
    return normalizeState(JSON.parse(raw));
  } catch (err) {
    // If the file does not exist on Hub yet, treat as empty list.
    if (err && (err.status === 404 || err.response?.status === 404)) {
      return { todos: [], groups: [] };
    }
    console.error('Failed to read state from Hub, falling back to local file', err);
    throw err;
  }
}

async function writeStateToHub(state) {
  const { uploadFiles } = await loadHubModule();
  const repo = { type: HF_REPO_TYPE, name: HF_REPO_ID };
  const json = JSON.stringify(
    {
      todos: Array.isArray(state.todos) ? state.todos : [],
      groups: ensureDefaultGroups(state.groups),
    },
    null,
    2
  );

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

async function readStateFromLocal() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return normalizeState(JSON.parse(raw));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { todos: [], groups: [] };
    }
    throw err;
  }
}

async function writeState(state) {
  // Prefer persisting to Hugging Face Hub when configured.
  if (USE_HF_HUB) {
    try {
      await writeStateToHub(state);
      return;
    } catch (err) {
      console.error('Failed to write state to Hub, falling back to local file', err);
    }
  }

  const toWrite = {
    todos: Array.isArray(state.todos) ? state.todos : [],
    groups: ensureDefaultGroups(state.groups),
  };
  await fs.writeFile(DATA_FILE, JSON.stringify(toWrite, null, 2), 'utf8');
}

async function readTodos() {
  if (USE_HF_HUB) {
    try {
      const state = await readStateFromHub();
      return state.todos || [];
    } catch (err) {
      // Logged inside readStateFromHub; fall through to local.
    }
  }
  const state = await readStateFromLocal();
  return state.todos || [];
}

async function writeTodos(nextTodos) {
  let state;
  try {
    state = USE_HF_HUB ? await readStateFromHub() : await readStateFromLocal();
  } catch {
    state = { todos: [], groups: [] };
  }
  const baseGroups = new Set(ensureDefaultGroups(state.groups));
  (nextTodos || []).forEach((t) => {
    if (t && typeof t.group === 'string' && t.group.trim()) {
      baseGroups.add(t.group.trim());
    }
  });
  await writeState({ ...state, todos: nextTodos, groups: Array.from(baseGroups) });
}

async function readGroups() {
  let state;
  try {
    state = USE_HF_HUB ? await readStateFromHub() : await readStateFromLocal();
  } catch {
    state = { todos: [], groups: [] };
  }
  let groups = state.groups;
  if (!groups || !groups.length) {
    const set = new Set();
    (state.todos || []).forEach((t) => {
      if (t && typeof t.group === 'string' && t.group.trim()) {
        set.add(t.group.trim());
      }
    });
    groups = Array.from(set);
  }
  return ensureDefaultGroups(groups);
}

async function addGroup(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return await readGroups();
  let state;
  try {
    state = USE_HF_HUB ? await readStateFromHub() : await readStateFromLocal();
  } catch {
    state = { todos: [], groups: [] };
  }
  const groups = ensureDefaultGroups(state.groups);
  if (!groups.includes(trimmed)) {
    groups.push(trimmed);
  }
  await writeState({ ...state, groups });
  return groups;
}

async function removeGroup(name) {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed === '签到') {
    return await readGroups();
  }
  let state;
  try {
    state = USE_HF_HUB ? await readStateFromHub() : await readStateFromLocal();
  } catch {
    state = { todos: [], groups: [] };
  }

  const groups = ensureDefaultGroups((state.groups || []).filter((g) => g !== trimmed));
  const todos = (state.todos || []).map((t) =>
    t && typeof t.group === 'string' && t.group.trim() === trimmed
      ? { ...t, group: '' }
      : t
  );

  await writeState({ ...state, groups, todos });
  return groups;
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

app.get('/api/groups', async (req, res) => {
  try {
    const groups = await readGroups();
    res.json({ groups });
  } catch (err) {
    console.error('Failed to read groups', err);
    res.status(500).json({ error: 'Failed to load groups' });
  }
});

app.post('/api/groups', async (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  const trimmed = name.trim();

  try {
    const groups = await addGroup(trimmed);
    res.status(201).json({ groups, created: trimmed });
  } catch (err) {
    console.error('Failed to create group', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

app.delete('/api/groups/:name', async (req, res) => {
  const rawName = req.params.name || '';
  const name = decodeURIComponent(rawName);
  if (!name || name === '签到') {
    return res.status(400).json({ error: 'This group cannot be deleted' });
  }

  try {
    const groups = await removeGroup(name);
    res.status(200).json({ groups, deleted: name });
  } catch (err) {
    console.error('Failed to delete group', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
}
);

app.post('/api/todos', async (req, res) => {
  const { title, note = '', url = '', group = '', deadline = '' } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const normalizedGroup = typeof group === 'string' ? group.trim() : '';
    const normalizedDeadline = typeof deadline === 'string' ? deadline.trim() : '';
    const needsDeadline = normalizedGroup && normalizedGroup !== '签到';

    if (needsDeadline && !normalizedDeadline) {
      return res.status(400).json({ error: 'This group requires a deadline' });
    }

    const todos = await readTodos();
    const todo = {
      id: randomUUID(),
      title: title.trim(),
      note: typeof note === 'string' ? note.trim() : '',
      url: typeof url === 'string' ? url.trim() : '',
      group: normalizedGroup,
      deadline: needsDeadline ? normalizedDeadline : '',
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
  if (typeof req.body.group === 'string') {
    updates.group = req.body.group.trim();
  }
  if (typeof req.body.deadline === 'string') {
    updates.deadline = req.body.deadline.trim();
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

    const next = { ...todos[idx], ...updates };
    const normalizedGroup = typeof next.group === 'string' ? next.group.trim() : '';
    const needsDeadline = normalizedGroup && normalizedGroup !== '签到';
    const normalizedDeadline = typeof next.deadline === 'string' ? next.deadline.trim() : '';

    if (needsDeadline && !normalizedDeadline) {
      return res.status(400).json({ error: 'This group requires a deadline' });
    }

    todos[idx] = {
      ...next,
      group: normalizedGroup,
      deadline: needsDeadline ? normalizedDeadline : '',
    };

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
