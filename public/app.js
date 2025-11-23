const listEl = document.getElementById('todoList');
const createForm = document.getElementById('createForm');
const statusText = document.getElementById('statusText');
const resetBtn = document.getElementById('resetBtn');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const createModal = document.getElementById('createModal');

let todos = [];

const API = {
  list: () => fetch('/api/todos').then((r) => r.json()),
  create: (payload) =>
    fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => r.json()),
  update: (id, payload) =>
    fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  remove: (id) =>
    fetch(`/api/todos/${id}`, {
      method: 'DELETE',
    }),
};

function openCreateModal() {
  if (!createModal) return;
  createModal.classList.add('open');
  createModal.setAttribute('aria-hidden', 'false');
  const titleInput = createForm?.querySelector('input[name="title"]');
  setTimeout(() => titleInput?.focus(), 30);
}

function closeCreateModal() {
  if (!createModal) return;
  createModal.classList.remove('open');
  createModal.setAttribute('aria-hidden', 'true');
}

openModalBtn?.addEventListener('click', openCreateModal);
closeModalBtn?.addEventListener('click', closeCreateModal);
createModal?.addEventListener('click', (e) => {
  if (e.target === createModal) closeCreateModal();
});

function setStatus(message, tone = 'muted') {
  const icon = tone === 'ok' ? 'ri-check-line' : tone === 'warn' ? 'ri-error-warning-line' : 'ri-loader-4-line';
  statusText.innerHTML = `<i class="${icon}"></i> ${message}`;
  statusText.style.color = tone === 'ok' ? 'var(--success)' : tone === 'warn' ? 'var(--danger)' : 'var(--text-dim)';
}

function createBadge(label, iconClass, extraClass = '') {
  const badge = document.createElement('span');
  badge.className = `badge ${extraClass}`.trim();
  badge.innerHTML = `<i class="${iconClass}"></i> ${label}`;
  return badge;
}

function renderTodos() {
  listEl.innerHTML = '';

  if (!todos.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.innerHTML = `<i class="ri-inbox-line"></i><p>暂无待办，开始添加吧。</p>`;
    listEl.appendChild(empty);
    return;
  }

  todos.forEach((todo) => {
    const item = document.createElement('li');
    item.className = `todo-card${todo.completed ? ' completed' : ''}`;

    const head = document.createElement('div');
    head.className = 'todo-head';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'title-wrap';
    
    const title = document.createElement('h3');
    title.className = 'title';
    title.textContent = todo.title;

    const meta = document.createElement('div');
    meta.className = 'meta';
    if (todo.completed) meta.appendChild(createBadge('已完成', 'ri-checkbox-circle-line', 'done'));
    if (todo.url) meta.appendChild(createBadge('含网址', 'ri-link', 'link'));
    if (todo.note) meta.appendChild(createBadge('有备注', 'ri-sticky-note-line'));

    titleWrap.appendChild(title);
    titleWrap.appendChild(meta);

    const controls = document.createElement('div');
    controls.className = 'controls';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = `icon-btn ${todo.completed ? 'success' : ''}`;
    toggleBtn.title = todo.completed ? '标记未完成' : '标记完成';
    toggleBtn.innerHTML = `<i class="${todo.completed ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}"></i>`;
    toggleBtn.addEventListener('click', () => handleUpdate(todo.id, { completed: !todo.completed }));

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn edit-toggle';
    editBtn.title = '编辑';
    editBtn.innerHTML = '<i class="ri-edit-line"></i>';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn danger';
    deleteBtn.title = '删除';
    deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
    deleteBtn.addEventListener('click', () => handleDelete(todo.id));

    controls.append(toggleBtn, editBtn, deleteBtn);
    head.append(titleWrap, controls);

    const contentWrap = document.createElement('div');
    
    if (todo.note) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = todo.note;
      contentWrap.appendChild(note);
    }

    if (todo.url) {
      const anchor = document.createElement('a');
      anchor.href = todo.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'link-btn';
      anchor.innerHTML = '<i class="ri-external-link-line"></i> 打开链接';
      contentWrap.appendChild(anchor);
    }

    const editForm = buildEditForm(todo, () => {
      editForm.classList.add('hidden');
      editBtn.innerHTML = '<i class="ri-edit-line"></i>';
      item.classList.remove('editing');
    });

    editBtn.addEventListener('click', () => {
      const isHidden = editForm.classList.contains('hidden');
      document.querySelectorAll('.edit-form').forEach((form) => form.classList.add('hidden'));
      document.querySelectorAll('.edit-toggle').forEach((btn) => {
         btn.innerHTML = '<i class="ri-edit-line"></i>';
      });
      
      editForm.classList.toggle('hidden', !isHidden);
      editBtn.innerHTML = isHidden ? '<i class="ri-arrow-up-s-line"></i>' : '<i class="ri-edit-line"></i>';
    });

    if (contentWrap.childElementCount) {
      item.append(head, contentWrap, editForm);
    } else {
      item.append(head, editForm);
    }
    listEl.appendChild(item);
  });
}

function buildEditForm(todo, onDone) {
  const form = document.createElement('form');
  form.className = 'edit-form hidden';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = todo.title;
  titleInput.placeholder = '标题';

  const noteInput = document.createElement('textarea');
  noteInput.rows = 2;
  noteInput.value = todo.note || '';
  noteInput.placeholder = '备注';

  const inlineGrid = document.createElement('div');
  inlineGrid.className = 'inline-grid';

  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.placeholder = 'https://example.com';
  urlInput.value = todo.url || '';

  const completedLabel = document.createElement('label');
  completedLabel.className = 'checkbox-label';
  const completedToggle = document.createElement('input');
  completedToggle.type = 'checkbox';
  completedToggle.checked = todo.completed;
  const completedText = document.createElement('span');
  completedText.textContent = '已完成';
  completedLabel.append(completedToggle, completedText);

  inlineGrid.append(urlInput, completedLabel);

  const formActions = document.createElement('div');
  formActions.className = 'actions';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'primary';
  saveBtn.innerHTML = '<i class="ri-save-line"></i> 保存';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'ghost';
  cancelBtn.innerHTML = '取消';

  formActions.append(saveBtn, cancelBtn);
  form.append(titleInput, noteInput, inlineGrid, formActions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleUpdate(todo.id, {
      title: titleInput.value,
      note: noteInput.value,
      url: urlInput.value,
      completed: completedToggle.checked,
    });
    onDone();
  });

  cancelBtn.addEventListener('click', () => onDone());

  return form;
}

async function handleUpdate(id, updates) {
  try {
    setStatus('更新中...');
    const res = await API.update(id, updates);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '更新失败');
    }
    const data = await res.json();
    todos = todos.map((item) => (item.id === id ? data.todo : item));
    renderTodos();
    setStatus('已更新 ✓', 'ok');
  } catch (err) {
    console.error(err);
    setStatus(err.message || '请求失败', 'warn');
  }
}

async function handleDelete(id) {
  if (!confirm('确定要删除这个待办吗？')) return;
  try {
    setStatus('删除中...');
    const res = await API.remove(id);
    if (!res.ok && res.status !== 204) throw new Error('删除失败');
    todos = todos.filter((item) => item.id !== id);
    renderTodos();
    setStatus('已删除 ✓', 'ok');
  } catch (err) {
    console.error(err);
    setStatus(err.message || '请求失败', 'warn');
  }
}

createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(createForm);
  const payload = {
    title: formData.get('title').trim(),
    note: formData.get('note').trim(),
    url: formData.get('url').trim(),
  };

  if (!payload.title) {
    setStatus('标题不能为空', 'warn');
    return;
  }

  try {
    setStatus('保存中...');
    const data = await API.create(payload);
    if (!data.todo) throw new Error(data.error || '创建失败');
    todos.push(data.todo);
    createForm.reset();
    closeCreateModal();
    renderTodos();
    setStatus('已添加 ✓', 'ok');
  } catch (err) {
    console.error(err);
    setStatus(err.message || '请求失败', 'warn');
  }
});

resetBtn.addEventListener('click', () => {
  setStatus('表单已清空');
});

async function init() {
  try {
    const data = await API.list();
    todos = data.todos || [];
    renderTodos();
    setStatus('已连接后端 ✓', 'ok');
  } catch (err) {
    console.error(err);
    setStatus('无法连接后端', 'warn');
  }
}

init();
