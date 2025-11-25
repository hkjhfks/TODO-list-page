const listEl = document.getElementById('todoList');
const createForm = document.getElementById('createForm');
const statusText = document.getElementById('statusText');
const resetBtn = document.getElementById('resetBtn');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const createModal = document.getElementById('createModal');
const createGroupBtn = document.getElementById('createGroupBtn');
const groupModal = document.getElementById('groupModal');
const closeGroupModalBtn = document.getElementById('closeGroupModalBtn');
const cancelGroupBtn = document.getElementById('cancelGroupBtn');
const groupForm = document.getElementById('groupForm');

let todos = [];
let activeGroup = 'all';
let groups = [];

const groupSelectCreate = createForm?.querySelector('select[name="group"]');
const deadlineInputCreate = createForm?.querySelector('input[name="deadline"]');
const deadlineFieldCreate = createForm?.querySelector('[data-role="deadline-field"]');
const groupDisplay = document.getElementById('groupDisplay');
const groupDisplayText = document.getElementById('groupDisplayText');
const groupMenu = document.getElementById('groupMenu');
const deadlineDisplay = document.getElementById('deadlineDisplay');
const deadlineDisplayText = document.getElementById('deadlineDisplayText');
const deadlineMenu = document.getElementById('deadlineMenu');
const groupListEl = document.getElementById('groupList');

function getGroups() {
  const set = new Set(groups || []);
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function renderGroupOptions(selectEl, currentValue = '') {
  if (!selectEl) return;
  const current = (currentValue || '').trim();
  const allGroups = getGroups();

  selectEl.innerHTML = '';

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = '不分组';
  selectEl.appendChild(emptyOption);

  allGroups.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === current) opt.selected = true;
    selectEl.appendChild(opt);
  });

  if (current && !allGroups.includes(current)) {
    const opt = document.createElement('option');
    opt.value = current;
    opt.textContent = current;
    opt.selected = true;
    selectEl.appendChild(opt);
  }

  if (selectEl === groupSelectCreate) {
    updateGroupMenu(current);
  }
}

function createGroupSelect(currentValue = '') {
  const select = document.createElement('select');
  select.className = 'group-select';
  renderGroupOptions(select, currentValue);
  return select;
}

function updateGroupMenu(currentValue = '') {
  if (!groupMenu || !groupSelectCreate) return;
  const current = (currentValue || '').trim();
  const allGroups = getGroups();
  groupMenu.innerHTML = '';

  const values = [''].concat(allGroups);

  values.forEach((value) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-item';
    if ((value || '') === current) btn.classList.add('picker-item-active');
    btn.textContent = value || '不分组';
    btn.addEventListener('click', () => {
      groupSelectCreate.value = value;
      if (groupDisplayText) {
        groupDisplayText.textContent = value || '不分组';
      }
      syncCreateDeadlineVisibility();
      groupMenu.classList.remove('open');
    });
    groupMenu.appendChild(btn);
  });
}

function toggleMenu(menuEl) {
  if (!menuEl) return;
  const isOpen = menuEl.classList.contains('open');
  document.querySelectorAll('.picker-menu.open').forEach((el) => el.classList.remove('open'));
  if (!isOpen) menuEl.classList.add('open');
}

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
  listGroups: () => fetch('/api/groups').then((r) => r.json()),
  createGroup: (name) =>
    fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then((r) => r.json()),
  deleteGroup: (name) =>
    fetch(`/api/groups/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }).then((r) => r.json()),
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

function openGroupModal() {
  if (!groupModal) return;
  groupModal.classList.add('open');
  groupModal.setAttribute('aria-hidden', 'false');
  const input = groupForm?.querySelector('input[name="name"]');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 30);
  }
}

function closeGroupModal() {
  if (!groupModal) return;
  groupModal.classList.remove('open');
  groupModal.setAttribute('aria-hidden', 'true');
}

closeGroupModalBtn?.addEventListener('click', closeGroupModal);
cancelGroupBtn?.addEventListener('click', closeGroupModal);
groupModal?.addEventListener('click', (e) => {
  if (e.target === groupModal) closeGroupModal();
});

function syncCreateDeadlineVisibility() {
  if (!groupSelectCreate || !deadlineInputCreate || !deadlineFieldCreate) return;
  const name = (groupSelectCreate.value || '').trim();
  const isCheckin = name === '签到';
  const needsDeadline = name && !isCheckin;

  deadlineInputCreate.required = Boolean(needsDeadline);

  if (isCheckin) {
    deadlineInputCreate.value = '';
    deadlineFieldCreate.classList.add('hidden');
    if (deadlineDisplayText) {
      deadlineDisplayText.textContent = '无截止日期';
    }
  } else {
    deadlineFieldCreate.classList.remove('hidden');
  }
}

groupSelectCreate?.addEventListener('change', syncCreateDeadlineVisibility);
groupDisplay?.addEventListener('click', () => toggleMenu(groupMenu));

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

function formatDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function updateDeadlineDisplayFromValue(value) {
  if (!deadlineDisplayText) return;
  if (!value) {
    deadlineDisplayText.textContent = '无截止日期';
    return;
  }
  deadlineDisplayText.textContent = value;
}

function buildDeadlineMenu() {
  if (!deadlineMenu || !deadlineInputCreate) return;
  deadlineMenu.innerHTML = '';

  const addItem = (label, getValue) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker-item';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      const value = getValue();
      deadlineInputCreate.value = value;
      updateDeadlineDisplayFromValue(value);
      syncCreateDeadlineVisibility();
      deadlineMenu.classList.remove('open');
    });
    deadlineMenu.appendChild(btn);
  };

  addItem('无截止日期', () => '');
  addItem('今天', () => formatDate(new Date()));
  addItem('明天', () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDate(d);
  });
  addItem('一周后', () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatDate(d);
  });

  const divider = document.createElement('div');
  divider.className = 'picker-divider';
  deadlineMenu.appendChild(divider);

  const manual = document.createElement('div');
  manual.className = 'picker-manual';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'YYYY-MM-DD';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ghost compact';
  btn.textContent = '确定';

  btn.addEventListener('click', () => {
    const value = input.value.trim();
    // 简单校验：长度为 10 且有 2 个 '-'
    if (value && !(value.length === 10 && value.split('-').length === 3)) {
      setStatus('日期格式应为 YYYY-MM-DD', 'warn');
      return;
    }
    deadlineInputCreate.value = value;
    updateDeadlineDisplayFromValue(value);
    syncCreateDeadlineVisibility();
    deadlineMenu.classList.remove('open');
  });

  manual.append(input, btn);
  deadlineMenu.appendChild(manual);
}

function renderGroupListForManage() {
  if (!groupListEl) return;
  const allGroups = getGroups().filter((name) => name !== '签到');
  groupListEl.innerHTML = '';

  if (!allGroups.length) {
    const empty = document.createElement('p');
    empty.className = 'field-hint';
    empty.textContent = '暂无可删除的分组。';
    groupListEl.appendChild(empty);
    return;
  }

  allGroups.forEach((name) => {
    const row = document.createElement('div');
    row.className = 'group-row';

    const label = document.createElement('div');
    label.className = 'group-row-label';
    label.innerHTML = `<i class="ri-folder-2-line"></i><span>${name}</span>`;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'ghost compact';
    delBtn.innerHTML = '<i class="ri-delete-bin-line"></i> 删除';
    delBtn.addEventListener('click', () => handleDeleteGroup(name));

    row.append(label, delBtn);
    groupListEl.appendChild(row);
  });
}

function renderGroupFilter() {
  let filterBar = document.getElementById('groupFilterBar');
  if (!filterBar) {
    filterBar = document.createElement('div');
    filterBar.id = 'groupFilterBar';
    filterBar.className = 'group-filter';
    listEl.parentElement.insertBefore(filterBar, listEl);
  }

  const groups = getGroups();
  filterBar.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = `chip ${activeGroup === 'all' ? 'chip-active' : ''}`;
  allBtn.textContent = '全部';
  allBtn.addEventListener('click', () => {
    activeGroup = 'all';
    renderTodos();
  });
  filterBar.appendChild(allBtn);

  getGroups().forEach((group) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip ${activeGroup === group ? 'chip-active' : ''}`;
    btn.textContent = group;
    btn.addEventListener('click', () => {
      activeGroup = group;
      renderTodos();
    });
    filterBar.appendChild(btn);
  });
}

function renderTodos() {
  listEl.innerHTML = '';

  renderGroupFilter();

  const visibleTodos =
    activeGroup === 'all'
      ? todos
      : todos.filter((t) => (t.group || '').trim() === activeGroup);

  if (!visibleTodos.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.innerHTML = `<i class="ri-inbox-line"></i><p>暂无待办，开始添加吧。</p>`;
    listEl.appendChild(empty);
    return;
  }

  visibleTodos.forEach((todo, index) => {
    const item = document.createElement('li');
    item.className = `todo-card${todo.completed ? ' completed' : ''}`;
    item.style.animationDelay = `${index * 0.05}s`;

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
    if (todo.group) meta.appendChild(createBadge(todo.group, 'ri-folder-2-line'));

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

    const isCheckin = (todo.group || '').trim() === '签到';
    if (todo.deadline && !isCheckin) {
      const deadline = document.createElement('p');
      deadline.className = 'deadline';
      deadline.textContent = `截止日期：${todo.deadline}`;
      contentWrap.appendChild(deadline);
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

function initFlatpickr(input) {
  if (!input) return;
  // 如果已经初始化过，先销毁（避免重复绑定）
  if (input._flatpickr) input._flatpickr.destroy();

  flatpickr(input, {
    locale: 'zh',
    dateFormat: 'Y-m-d',
    disableMobile: 'true', // 强制在移动端也使用 flatpickr 主题，而不是原生控件
    theme: 'dark',
    allowInput: true,
    prevArrow: '<i class="ri-arrow-left-s-line"></i>',
    nextArrow: '<i class="ri-arrow-right-s-line"></i>',
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

  const groupSelect = createGroupSelect(todo.group || '');

  const deadlineInput = document.createElement('input');
  deadlineInput.type = 'text'; // 改为 text 以适配 flatpickr
  deadlineInput.placeholder = '选择日期';
  deadlineInput.value = todo.deadline || '';
  
  // 初始化日期选择器
  setTimeout(() => initFlatpickr(deadlineInput), 0);

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
  form.append(titleInput, noteInput, groupSelect, deadlineInput, inlineGrid, formActions);

  function syncEditDeadlineVisibility() {
    const name = (groupSelect.value || '').trim();
    const isCheckin = name === '签到';
    const needsDeadline = name && !isCheckin;
    deadlineInput.required = Boolean(needsDeadline);
    if (isCheckin) {
      deadlineInput.value = '';
      deadlineInput.classList.add('hidden');
      // 如果是 flatpickr 实例，可能需要额外处理，但 hidden class 应该足够
    } else {
      deadlineInput.classList.remove('hidden');
    }
  }

  groupSelect.addEventListener('change', syncEditDeadlineVisibility);
  syncEditDeadlineVisibility();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleUpdate(todo.id, {
      title: titleInput.value,
      note: noteInput.value,
      url: urlInput.value,
      group: groupSelect.value,
      deadline: deadlineInput.value,
      completed: completedToggle.checked,
    });
    onDone();
  });

  cancelBtn.addEventListener('click', () => onDone());

  return form;
}

function triggerConfetti() {
  if (typeof confetti === 'function') {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 }
    };

    function fire(particleRatio, opts) {
      confetti(Object.assign({}, defaults, opts, {
        particleCount: Math.floor(count * particleRatio)
      }));
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }
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
    
    if (updates.completed === true) {
      triggerConfetti();
    }

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
    group: (formData.get('group') || '').toString().trim(),
    deadline: (formData.get('deadline') || '').toString().trim(),
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

async function handleCreateGroupSubmit(e) {
  e?.preventDefault();
  const input = groupForm?.querySelector('input[name="name"]');
  if (!input) return;
  const trimmed = input.value.trim();
  if (!trimmed) {
    setStatus('分组名称不能为空', 'warn');
    return;
  }

  try {
    setStatus('正在创建分组...');
    const data = await API.createGroup(trimmed);
    if (!data.groups) throw new Error(data.error || '创建分组失败');
    groups = data.groups || [];
    renderGroupOptions(groupSelectCreate, trimmed);
    renderGroupListForManage();
    syncCreateDeadlineVisibility();
    renderTodos();
    setStatus('分组已创建 ✓', 'ok');
    closeGroupModal();
  } catch (err) {
    console.error(err);
    setStatus(err.message || '创建分组失败', 'warn');
  }
}

createGroupBtn?.addEventListener('click', openGroupModal);
groupForm?.addEventListener('submit', handleCreateGroupSubmit);

async function handleDeleteGroup(name) {
  if (!name) return;
  if (!window.confirm(`确定删除分组「${name}」吗？此分组下的任务将变为「不分组」。`)) return;
  try {
    setStatus('正在删除分组...');
    const data = await API.deleteGroup(name);
    if (!data.groups) throw new Error(data.error || '删除分组失败');
    groups = data.groups || [];
    const wasActive = activeGroup === name;
    renderGroupOptions(groupSelectCreate, '');
    if (groupSelectCreate) {
      groupSelectCreate.value = '';
    }
    if (groupDisplayText) {
      groupDisplayText.textContent = '不分组';
    }
    renderGroupListForManage();
    if (wasActive) {
      activeGroup = 'all';
    }
    renderTodos();
    setStatus('分组已删除 ✓', 'ok');
  } catch (err) {
    console.error(err);
    setStatus(err.message || '删除分组失败', 'warn');
  }
}

async function init() {
  try {
    const [todoData, groupData] = await Promise.all([API.list(), API.listGroups()]);
    todos = todoData.todos || [];
    groups = groupData.groups || [];
    renderGroupOptions(groupSelectCreate, '');
    buildDeadlineMenu();
    updateDeadlineDisplayFromValue(deadlineInputCreate?.value || '');
    renderTodos();
    syncCreateDeadlineVisibility();
    renderGroupListForManage();
    setStatus('已连接后端 ✓', 'ok');
  } catch (err) {
    console.error(err);
    setStatus('无法连接后端', 'warn');
  }
  
  // 初始化创建表单的日期选择器
  if (deadlineInputCreate) {
    deadlineInputCreate.type = 'text'; // 覆盖 type="date"
    initFlatpickr(deadlineInputCreate);
  }
}

init();
deadlineDisplay?.addEventListener('click', () => toggleMenu(deadlineMenu));

document.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;
  if (!target.closest('.pill-input-wrapper')) {
    document.querySelectorAll('.picker-menu.open').forEach((el) => el.classList.remove('open'));
  }
});
