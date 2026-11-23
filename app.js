// ==================== CONSTANTS & DEFINITIONS ====================
const STORAGE_KEY = 'anilog_tracker_items_v1';
const USERS_STORAGE_KEY = 'anilog_users_v1';
const SESSION_STORAGE_KEY = 'anilog_session_v1';
const GUEST_USER = { id: 'guest', username: 'guest', displayName: 'ผู้เยี่ยมชม', isGuest: true };

const STATUS_META = {
  watching: {
    label: 'กำลังดู / อ่าน',
    shortLabel: 'กำลังติดตาม',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dotClass: 'bg-sky-400'
  },
  completed: {
    label: 'จบแล้ว',
    shortLabel: 'จบแล้ว',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-400'
  },
  on_hold: {
    label: 'ดองไว้ก่อน',
    shortLabel: 'ดอง',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-400'
  },
  dropped: {
    label: 'เท',
    shortLabel: 'เท',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dotClass: 'bg-rose-400'
  },
  planned: {
    label: 'มีแผนจะดู / อ่าน',
    shortLabel: 'แผนจะดู',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    dotClass: 'bg-violet-400'
  }
};

const COVER_GRADIENTS = [
  { id: 'indigo', label: 'Indigo', css: 'from-indigo-500 via-violet-600 to-slate-900' },
  { id: 'sky', label: 'Ocean', css: 'from-sky-400 via-cyan-600 to-slate-900' },
  { id: 'emerald', label: 'Emerald', css: 'from-emerald-400 via-teal-600 to-slate-900' },
  { id: 'amber', label: 'Sunset', css: 'from-amber-400 via-orange-600 to-slate-900' },
  { id: 'rose', label: 'Crimson', css: 'from-rose-500 via-pink-600 to-slate-900' },
  { id: 'violet', label: 'Amethyst', css: 'from-fuchsia-500 via-purple-600 to-slate-900' },
  { id: 'slate', label: 'Monochrome', css: 'from-slate-500 via-slate-700 to-slate-950' },
  { id: 'teal', label: 'Deep Teal', css: 'from-teal-400 via-emerald-700 to-slate-950' }
];

const POPULAR_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Thriller'
];

// ==================== APPLICATION STATE ====================
let state = {
  currentUser: null,
  items: [],
  currentView: 'dashboard',
  typeFilter: 'all',
  statusFilter: 'all',
  searchQuery: '',
  sortBy: 'updated',
  listViewMode: 'grid',
  editingItemId: null,
  deleteArmed: false,
  clearAllArmed: false,
  addCover: { gradient: 'indigo', image: '' },
  detailCover: { gradient: 'indigo', image: '' },
  editCoverPanelOpen: false
};

// ==================== UTILITIES ====================
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getInitials(title) {
  const clean = (title || '').trim();
  if (!clean) return 'AL';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getGradientClass(gradientId) {
  const found = COVER_GRADIENTS.find(g => g.id === gradientId);
  return found ? found.css : COVER_GRADIENTS[0].css;
}

function getUnitLabel(type) {
  return type === 'manga' ? 'บท' : 'ตอน';
}

function parseGenres(rawStr) {
  return (rawStr || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function renderCoverInnerHTML(title, coverGradient, coverImage, sizeClass = 'text-2xl') {
  if (coverImage) {
    return `<img src="${escapeHtml(coverImage)}" alt="${escapeHtml(title)}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
    <div style="display:none;" class="w-full h-full bg-gradient-to-br ${getGradientClass(coverGradient)} flex items-center justify-center relative overflow-hidden">
      <div class="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 blur-xl"></div>
      <span class="font-display font-extrabold ${sizeClass} text-white/35 tracking-wider select-none">${escapeHtml(getInitials(title))}</span>
    </div>`;
  }
  return `<div class="w-full h-full bg-gradient-to-br ${getGradientClass(coverGradient)} flex items-center justify-center relative overflow-hidden">
    <div class="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 blur-xl"></div>
    <span class="font-display font-extrabold ${sizeClass} text-white/35 tracking-wider select-none">${escapeHtml(getInitials(title))}</span>
  </div>`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const colorMap = {
    success: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
    error: 'bg-rose-500/15 border-rose-500/40 text-rose-200',
    info: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
  };
  toast.className = `pointer-events-auto px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl text-xs font-medium flex items-center gap-2.5 animate-fade-up ${colorMap[type] || colorMap.info}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 260);
  }, 2800);
}

// ==================== AUTHENTICATION & USER ACCOUNTS ====================
async function hashPassword(password) {
  try {
    if (window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode('anilog_salt_v1:' + password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (err) {
    console.warn('Web Crypto unavailable, using fallback hash:', err);
  }
  let h = 2166136261;
  const str = 'anilog_salt_v1:' + password;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'fb_' + (h >>> 0).toString(16);
}

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read users:', err);
    return [];
  }
}

function saveStoredUsers(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    return true;
  } catch (err) {
    console.error('Failed to save users:', err);
    showToast('ไม่สามารถบันทึกข้อมูลบัญชีผู้ใช้ได้', 'error');
    return false;
  }
}

function saveSession(user, remember = true) {
  const payload = JSON.stringify({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    isGuest: Boolean(user.isGuest)
  });
  try {
    if (remember) {
      localStorage.setItem(SESSION_STORAGE_KEY, payload);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, payload);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id) return null;
    if (parsed.isGuest) return { ...GUEST_USER };
    const users = getStoredUsers();
    const found = users.find(u => u.id === parsed.id);
    if (!found) return null;
    return { id: found.id, username: found.username, displayName: found.displayName, isGuest: false };
  } catch (err) {
    console.error('Failed to load session:', err);
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}

function showAuthError(msg) {
  const box = document.getElementById('auth-error-box');
  const text = document.getElementById('auth-error-text');
  if (!msg) {
    box.classList.add('hidden');
    text.textContent = '';
    return;
  }
  text.textContent = msg;
  box.classList.remove('hidden');
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('register-form').classList.toggle('hidden', isLogin);
  document.getElementById('auth-tab-login').className = `py-2 rounded-lg text-xs font-semibold transition-all ${
    isLogin ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
  }`;
  document.getElementById('auth-tab-register').className = `py-2 rounded-lg text-xs font-semibold transition-all ${
    !isLogin ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
  }`;
  showAuthError('');
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

function showAuthScreen(defaultTab = 'login') {
  document.getElementById('login-form').reset();
  document.getElementById('register-form').reset();
  switchAuthTab(defaultTab);
  document.getElementById('auth-screen').classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function hideAuthScreen() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

function completeSignIn(user, remember = true, toastMsg = '') {
  state.currentUser = user;
  saveSession(user, remember);
  hideAuthScreen();
  updateUserProfileUI();
  loadItems();
  state.typeFilter = 'all';
  state.statusFilter = 'all';
  state.searchQuery = '';
  const searchInput = document.getElementById('list-search-input');
  if (searchInput) searchInput.value = '';
  updateNavbarStyles();
  renderAll();
  if (toastMsg) showToast(toastMsg, 'success');
}

async function handleLogin(event) {
  event.preventDefault();
  showAuthError('');
  const username = document.getElementById('login-username').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('login-remember').checked;

  if (!username || !password) {
    showAuthError('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
    return;
  }

  const users = getStoredUsers();
  const user = users.find(u => u.username.toLowerCase() === username);
  if (!user) {
    showAuthError('ไม่พบบัญชีชื่อผู้ใช้นี้ในระบบ กรุณาตรวจสอบหรือสมัครสมาชิกใหม่');
    return;
  }

  const hashed = await hashPassword(password);
  if (user.passwordHash !== hashed) {
    showAuthError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    return;
  }

  completeSignIn(
    { id: user.id, username: user.username, displayName: user.displayName, isGuest: false },
    remember,
    `ยินดีต้อนรับกลับมา, ${user.displayName}!`
  );
}

async function handleRegister(event) {
  event.preventDefault();
  showAuthError('');
  const displayName = document.getElementById('reg-displayname').value.trim();
  const username = document.getElementById('reg-username').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;
  const confirmPw = document.getElementById('reg-confirm').value;

  if (!displayName || !username) {
    showAuthError('กรุณากรอกชื่อที่แสดงและชื่อผู้ใช้ให้ครบถ้วน');
    return;
  }
  if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
    showAuthError('ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือ _ . - ความยาว 3–24 ตัวอักษร');
    return;
  }
  if (password.length < 4) {
    showAuthError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
    return;
  }
  if (password !== confirmPw) {
    showAuthError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
    return;
  }

  const users = getStoredUsers();
  if (users.some(u => u.username.toLowerCase() === username)) {
    showAuthError('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น');
    return;
  }

  const passwordHash = await hashPassword(password);
  const newUser = {
    id: 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    username,
    displayName,
    passwordHash,
    createdAt: Date.now()
  };

  users.push(newUser);
  if (!saveStoredUsers(users)) return;

  completeSignIn(
    { id: newUser.id, username: newUser.username, displayName: newUser.displayName, isGuest: false },
    true,
    `สร้างบัญชีสำเร็จ! ยินดีต้อนรับคุณ ${newUser.displayName}`
  );
}

function loginAsGuest() {
  completeSignIn({ ...GUEST_USER }, true, 'เข้าใช้งานแบบผู้เยี่ยมชม (Guest)');
}

function handleLogout() {
  closeUserMenu();
  clearSession();
  state.currentUser = null;
  state.items = [];
  showAuthScreen('login');
  showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
}

function openAuthFromMenu() {
  closeUserMenu();
  showAuthScreen('login');
}

function toggleUserMenu(event) {
  event.stopPropagation();
  document.getElementById('user-menu-dropdown').classList.toggle('hidden');
}

function closeUserMenu() {
  const dd = document.getElementById('user-menu-dropdown');
  if (dd) dd.classList.add('hidden');
}

function updateUserProfileUI() {
  const user = state.currentUser || GUEST_USER;
  const initial = (user.displayName || user.username || 'U').trim().charAt(0).toUpperCase();
  document.getElementById('nav-user-avatar').textContent = initial;
  document.getElementById('nav-user-name').textContent = user.displayName;
  document.getElementById('dropdown-user-display').textContent = user.displayName;
  document.getElementById('dropdown-user-handle').textContent = user.isGuest ? 'โหมดผู้เยี่ยมชม (Guest)' : '@' + user.username;
  document.getElementById('menu-btn-profile').classList.toggle('hidden', Boolean(user.isGuest));
  document.getElementById('menu-btn-switch-auth').classList.toggle('hidden', !user.isGuest);
}

function openProfileModal() {
  closeUserMenu();
  if (!state.currentUser || state.currentUser.isGuest) return;
  document.getElementById('profile-form').reset();
  document.getElementById('profile-displayname').value = state.currentUser.displayName || '';
  document.getElementById('profile-modal-handle').textContent = '@' + state.currentUser.username;
  document.getElementById('profile-modal').classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeProfileModal() {
  document.getElementById('profile-modal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

async function handleSaveProfile(event) {
  event.preventDefault();
  if (!state.currentUser || state.currentUser.isGuest) return;

  const newDisplayName = document.getElementById('profile-displayname').value.trim();
  const currentPw = document.getElementById('profile-current-pw').value;
  const newPw = document.getElementById('profile-new-pw').value;

  if (!newDisplayName) {
    showToast('กรุณากรอกชื่อที่แสดง', 'error');
    return;
  }

  const users = getStoredUsers();
  const userRecord = users.find(u => u.id === state.currentUser.id);
  if (!userRecord) {
    showToast('ไม่พบข้อมูลบัญชีผู้ใช้', 'error');
    return;
  }

  if (newPw) {
    if (!currentPw) {
      showToast('กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนรหัสผ่าน', 'error');
      return;
    }
    const currentHash = await hashPassword(currentPw);
    if (currentHash !== userRecord.passwordHash) {
      showToast('รหัสผ่านปัจจุบันไม่ถูกต้อง', 'error');
      return;
    }
    if (newPw.length < 4) {
      showToast('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร', 'error');
      return;
    }
    userRecord.passwordHash = await hashPassword(newPw);
  }

  userRecord.displayName = newDisplayName;
  if (!saveStoredUsers(users)) return;

  state.currentUser.displayName = newDisplayName;
  const remembered = Boolean(localStorage.getItem(SESSION_STORAGE_KEY));
  saveSession(state.currentUser, remembered);
  updateUserProfileUI();
  closeProfileModal();
  showToast('อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว', 'success');
}

// ==================== PERSISTENCE (LOCALSTORAGE PER USER) ====================
function getItemsStorageKey() {
  if (!state.currentUser || state.currentUser.isGuest) {
    return STORAGE_KEY;
  }
  return `${STORAGE_KEY}_${state.currentUser.id}`;
}

function loadItems() {
  try {
    const raw = localStorage.getItem(getItemsStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(item => !(item && typeof item.id === 'string' && item.id.startsWith('demo-')));
        state.items = cleaned;
        if (cleaned.length !== parsed.length) {
          saveItems();
        }
        return;
      }
    }
  } catch (err) {
    console.error('Failed to load items:', err);
  }
  state.items = [];
  saveItems();
}

function saveItems() {
  try {
    localStorage.setItem(getItemsStorageKey(), JSON.stringify(state.items));
    return true;
  } catch (err) {
    console.error('Failed to save items:', err);
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      showToast('พื้นที่จัดเก็บ localStorage เต็ม! กรุณาลบรูปปกบางเรื่องหรือใช้ลิงก์รูปแทน', 'error');
    } else {
      showToast('ไม่สามารถบันทึกข้อมูลลงเบราว์เซอร์ได้', 'error');
    }
    return false;
  }
}

// ==================== NAVIGATION & VIEW SWITCHING ====================
function switchView(view) {
  state.currentView = view;
  document.getElementById('view-dashboard').classList.toggle('hidden', view !== 'dashboard');
  document.getElementById('view-list').classList.toggle('hidden', view !== 'list');
  updateNavbarStyles();
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavbarStyles() {
  const isDash = state.currentView === 'dashboard';
  const activeDesktop = 'bg-indigo-500 text-white shadow-sm';
  const inactiveDesktop = 'text-slate-400 hover:text-white';
  document.getElementById('nav-dashboard').className = `px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isDash ? activeDesktop : inactiveDesktop}`;
  document.getElementById('nav-list').className = `px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${!isDash ? activeDesktop : inactiveDesktop}`;

  const activeMobile = 'bg-indigo-500 text-white shadow-sm';
  const inactiveMobile = 'bg-[#1E293B] text-slate-400';
  document.getElementById('mobile-nav-dashboard').className = `flex-1 py-2 rounded-xl text-xs font-semibold transition-all text-center ${isDash ? activeMobile : inactiveMobile}`;
  document.getElementById('mobile-nav-list').className = `flex-1 py-2 rounded-xl text-xs font-semibold transition-all text-center ${!isDash ? activeMobile : inactiveMobile}`;
}

function openListWithFilter(status) {
  state.statusFilter = status;
  switchView('list');
}

// ==================== FILTERING & SORTING ====================
function setTypeFilter(type) {
  state.typeFilter = type;
  renderListView();
}

function setStatusFilter(status) {
  state.statusFilter = status;
  renderListView();
}

function handleSearchInput(val) {
  state.searchQuery = val.trim().toLowerCase();
  renderListView();
}

function setSortBy(sortVal) {
  state.sortBy = sortVal;
  const selectEl = document.getElementById('sort-select');
  if (selectEl && selectEl.value !== sortVal) {
    selectEl.value = sortVal;
  }
  renderListView();
}

function toggleTitleSort() {
  if (state.sortBy === 'title_asc') {
    setSortBy('title_desc');
  } else {
    setSortBy('title_asc');
  }
}

function setListViewMode(mode) {
  state.listViewMode = mode;
  renderListView();
}

function getFilteredAndSortedItems() {
  let list = [...state.items];

  if (state.typeFilter !== 'all') {
    list = list.filter(i => i.type === state.typeFilter);
  }
  if (state.statusFilter !== 'all') {
    list = list.filter(i => i.status === state.statusFilter);
  }
  if (state.searchQuery) {
    const q = state.searchQuery;
    list = list.filter(i => {
      const t1 = (i.title || '').toLowerCase();
      const t2 = (i.thaiTitle || '').toLowerCase();
      const g = (i.genres || []).join(' ').toLowerCase();
      return t1.includes(q) || t2.includes(q) || g.includes(q);
    });
  }

  if (state.sortBy === 'title_asc') {
    list.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
  } else if (state.sortBy === 'title_desc') {
    list.sort((a, b) => (b.title || '').localeCompare(a.title || '', undefined, { sensitivity: 'base' }));
  } else if (state.sortBy === 'score_desc') {
    list.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || (b.updatedAt || 0) - (a.updatedAt || 0));
  } else {
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  return list;
}

// ==================== QUICK ACTIONS ====================
function quickIncrement(id, event) {
  if (event) event.stopPropagation();
  const item = state.items.find(i => i.id === id);
  if (!item) return;

  const current = Number(item.progress) || 0;
  const total = Number(item.total) || 0;
  if (total > 0 && current >= total) {
    showToast(`"${item.title}" ครบจำนวนทั้งหมดแล้ว`, 'info');
    return;
  }

  item.progress = current + 1;
  item.updatedAt = Date.now();

  if (total > 0 && item.progress >= total && item.status !== 'completed') {
    item.status = 'completed';
    showToast(`ยินดีด้วย! "${item.title}" จบครบ ${total} ${getUnitLabel(item.type)}แล้ว`, 'success');
  } else {
    showToast(`อัปเดต "${item.title}" เป็น ${item.progress} ${getUnitLabel(item.type)}`, 'success');
  }

  saveItems();
  renderAll();
}

function handleClearAllData() {
  const btnLabel = document.getElementById('btn-clear-all-label');
  if (state.items.length === 0) {
    showToast('ไม่มีรายการให้ล้างในขณะนี้', 'info');
    return;
  }
  if (!state.clearAllArmed) {
    state.clearAllArmed = true;
    btnLabel.textContent = 'กดอีกครั้งเพื่อยืนยันการล้าง';
    setTimeout(() => {
      state.clearAllArmed = false;
      if (btnLabel) btnLabel.textContent = 'ล้างข้อมูลทั้งหมด';
    }, 3500);
    return;
  }
  state.clearAllArmed = false;
  btnLabel.textContent = 'ล้างข้อมูลทั้งหมด';
  state.items = [];
  saveItems();
  renderAll();
  showToast('ล้างข้อมูลรายการทั้งหมดเรียบร้อยแล้ว', 'info');
}

// ==================== RENDER ALL ====================
function renderAll() {
  renderDashboard();
  renderListView();
}

function renderDashboard() {
  const items = state.items;
  const total = items.length;
  const animeCount = items.filter(i => i.type === 'anime').length;
  const mangaCount = items.filter(i => i.type === 'manga').length;
  const completedCount = items.filter(i => i.status === 'completed').length;
  const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const animeEp = items.filter(i => i.type === 'anime').reduce((sum, i) => sum + (Number(i.progress) || 0), 0);
  const mangaCh = items.filter(i => i.type === 'manga').reduce((sum, i) => sum + (Number(i.progress) || 0), 0);

  const rated = items.filter(i => Number(i.score) > 0);
  const avgScore = rated.length > 0
    ? (rated.reduce((sum, i) => sum + Number(i.score), 0) / rated.length).toFixed(1)
    : '-';

  document.getElementById('stat-total').textContent = total.toLocaleString();
  document.getElementById('stat-total-sub').textContent = `อนิเมะ ${animeCount} • มังงะ ${mangaCount}`;
  document.getElementById('stat-completed').textContent = completedCount.toLocaleString();
  document.getElementById('stat-completed-sub').textContent = `คิดเป็น ${completedPct}% ของทั้งหมด`;
  document.getElementById('stat-progress').textContent = (animeEp + mangaCh).toLocaleString();
  document.getElementById('stat-progress-sub').textContent = `${animeEp.toLocaleString()} ตอน • ${mangaCh.toLocaleString()} บท`;
  document.getElementById('stat-avg-score').textContent = avgScore;
  document.getElementById('stat-avg-sub').textContent = rated.length > 0 ? `จาก ${rated.length} เรื่องที่ให้คะแนน` : 'ยังไม่มีเรื่องที่ให้คะแนน';

  // Continue Watching / Reading
  const watchingGrid = document.getElementById('dashboard-watching-grid');
  const watchingItems = items
    .filter(i => i.status === 'watching')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 6);

  if (watchingItems.length === 0) {
    watchingGrid.innerHTML = `
      <div class="sm:col-span-2 bg-[#1E293B] border border-dashed border-[#334155] rounded-2xl p-8 text-center">
        <p class="text-sm font-medium text-slate-300">ยังไม่มีรายการที่กำลังติดตาม</p>
        <p class="text-xs text-slate-500 mt-1">เริ่มต้นเพิ่มอนิเมะหรือมังงะเรื่องโปรดของคุณได้เลย</p>
        <button type="button" onclick="openAddModal()" class="mt-4 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold transition-colors">
          + เพิ่มเรื่องแรกของคุณ
        </button>
      </div>`;
  } else {
    watchingGrid.innerHTML = watchingItems.map(item => {
      const unit = getUnitLabel(item.type);
      const progress = Number(item.progress) || 0;
      const totalCount = Number(item.total) || 0;
      const pct = totalCount > 0 ? Math.min(100, Math.round((progress / totalCount) * 100)) : 0;
      const typeBadge = item.type === 'anime'
        ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/25">อนิเมะ</span>'
        : '<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/25">มังงะ</span>';
      const scoreBadge = Number(item.score) > 0
        ? `<span class="text-xs font-semibold text-amber-400 flex items-center gap-0.5">★ ${item.score}</span>`
        : '';

      return `
        <div onclick="openDetailModal('${item.id}')" class="group bg-[#1E293B] hover:bg-[#243247] border border-[#334155] hover:border-indigo-500/50 rounded-2xl p-3.5 flex gap-3.5 cursor-pointer transition-all">
          <div class="w-16 sm:w-20 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-[#334155] shadow-md">
            ${renderCoverInnerHTML(item.title, item.coverGradient, item.coverImage, 'text-lg')}
          </div>
          <div class="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2">
                ${typeBadge}
                ${scoreBadge}
              </div>
              <h3 class="text-sm font-bold text-white mt-1.5 line-clamp-1 group-hover:text-indigo-300 transition-colors">${escapeHtml(item.title)}</h3>
              ${item.thaiTitle ? `<p class="text-xs text-slate-400 line-clamp-1">${escapeHtml(item.thaiTitle)}</p>` : ''}
            </div>
            <div class="mt-2 space-y-1.5">
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span>${progress} ${totalCount > 0 ? `/ ${totalCount}` : ''} ${unit}</span>
                ${totalCount > 0 ? `<span class="font-medium text-slate-300">${pct}%</span>` : ''}
              </div>
              <div class="h-1.5 rounded-full bg-[#0F172A] overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all" style="width: ${totalCount > 0 ? pct : 35}%"></div>
              </div>
              <div class="flex justify-end pt-1">
                <button type="button" onclick="quickIncrement('${item.id}', event)" class="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold transition-all">
                  +1 ${unit}
                </button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // Top Genres Chart
  const genreCounts = {};
  items.forEach(item => {
    (item.genres || []).forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const chartEl = document.getElementById('dashboard-genres-chart');

  if (sortedGenres.length === 0) {
    chartEl.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">ยังไม่มีข้อมูลแนวเรื่อง เพิ่มรายการพร้อมระบุแนวเรื่องเพื่อดูสถิติ</p>`;
  } else {
    const maxVal = sortedGenres[0][1];
    chartEl.innerHTML = sortedGenres.map(([genre, count]) => {
      const widthPct = Math.max(12, Math.round((count / maxVal) * 100));
      return `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-slate-200">${escapeHtml(genre)}</span>
            <span class="text-slate-400">${count} เรื่อง</span>
          </div>
          <div class="h-2 rounded-full bg-[#0F172A] overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400" style="width: ${widthPct}%"></div>
          </div>
        </div>`;
    }).join('');
  }
}

function renderListView() {
  // Update type tab counts & styles
  const allCount = state.items.length;
  const animeCount = state.items.filter(i => i.type === 'anime').length;
  const mangaCount = state.items.filter(i => i.type === 'manga').length;

  document.getElementById('count-type-all').textContent = allCount;
  document.getElementById('count-type-anime').textContent = animeCount;
  document.getElementById('count-type-manga').textContent = mangaCount;

  ['all', 'anime', 'manga'].forEach(t => {
    const btn = document.getElementById(`type-tab-${t}`);
    const active = state.typeFilter === t;
    btn.className = `px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
      active ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
    }`;
  });

  // Update view mode buttons
  document.getElementById('btn-view-grid').className = `p-1.5 rounded-lg transition-colors ${
    state.listViewMode === 'grid' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
  }`;
  document.getElementById('btn-view-table').className = `p-1.5 rounded-lg transition-colors ${
    state.listViewMode === 'table' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
  }`;

  // Render Status Pills
  const typeScopedItems = state.typeFilter === 'all'
    ? state.items
    : state.items.filter(i => i.type === state.typeFilter);

  const pills = [
    { key: 'all', label: 'ทั้งหมด', count: typeScopedItems.length },
    ...Object.entries(STATUS_META).map(([key, meta]) => ({
      key,
      label: meta.shortLabel,
      count: typeScopedItems.filter(i => i.status === key).length
    }))
  ];

  document.getElementById('status-filter-pills').innerHTML = pills.map(p => {
    const active = state.statusFilter === p.key;
    return `
      <button type="button" onclick="setStatusFilter('${p.key}')" class="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
        active
          ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
          : 'bg-[#1E293B] border-[#334155] text-slate-400 hover:text-white hover:border-slate-500'
      }">
        <span>${p.label}</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] ${active ? 'bg-indigo-500/40 text-white' : 'bg-[#0F172A] text-slate-400'}">${p.count}</span>
      </button>`;
  }).join('');

  // Render Items
  const filtered = getFilteredAndSortedItems();
  const container = document.getElementById('list-content-container');

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-[#1E293B] border border-dashed border-[#334155] rounded-2xl p-12 text-center">
        <p class="text-base font-semibold text-slate-200">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
        <p class="text-xs text-slate-400 mt-1">ลองเปลี่ยนตัวกรอง คำค้นหา หรือเพิ่มเรื่องใหม่ลงคลังของคุณ</p>
        <button type="button" onclick="openAddModal()" class="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all">
          + เพิ่มเรื่องใหม่
        </button>
      </div>`;
    return;
  }

  if (state.listViewMode === 'grid') {
    container.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        ${filtered.map(item => {
          const unit = getUnitLabel(item.type);
          const status = STATUS_META[item.status] || STATUS_META.watching;
          const progress = Number(item.progress) || 0;
          const total = Number(item.total) || 0;
          const pct = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0;

          return `
            <div onclick="openDetailModal('${item.id}')" class="group bg-[#1E293B] hover:bg-[#243247] border border-[#334155] hover:border-indigo-500/50 rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all hover:-translate-y-0.5 shadow-md">
              <div class="relative aspect-[2/3] w-full overflow-hidden">
                ${renderCoverInnerHTML(item.title, item.coverGradient, item.coverImage, 'text-3xl')}
                <div class="absolute top-2 left-2">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-md bg-slate-950/75 text-white border border-white/10">
                    ${item.type === 'anime' ? 'อนิเมะ' : 'มังงะ'}
                  </span>
                </div>
                ${Number(item.score) > 0 ? `
                  <div class="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-md bg-slate-950/75 text-amber-400 border border-amber-400/25">
                    ★ ${item.score}
                  </div>` : ''}
                <div class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${status.badgeClass} backdrop-blur-sm">
                    <span class="w-1.5 h-1.5 rounded-full ${status.dotClass}"></span>
                    ${status.shortLabel}
                  </span>
                </div>
              </div>
              <div class="p-3 flex-1 flex flex-col justify-between gap-2">
                <div>
                  <h3 class="text-sm font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">${escapeHtml(item.title)}</h3>
                  ${item.thaiTitle ? `<p class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">${escapeHtml(item.thaiTitle)}</p>` : ''}
                </div>
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between text-[11px] text-slate-400">
                    <span>${progress}${total > 0 ? ` / ${total}` : ''} ${unit}</span>
                    <button type="button" onclick="quickIncrement('${item.id}', event)" class="px-2 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500 text-indigo-300 hover:text-white text-[10px] font-semibold transition-colors">
                      +1
                    </button>
                  </div>
                  <div class="h-1 rounded-full bg-[#0F172A] overflow-hidden">
                    <div class="h-full rounded-full bg-indigo-500" style="width: ${total > 0 ? pct : (progress > 0 ? 35 : 0)}%"></div>
                  </div>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  } else {
    const sortArrow = state.sortBy === 'title_asc' ? ' ↑' : state.sortBy === 'title_desc' ? ' ↓' : ' ↕';
    container.innerHTML = `
      <div class="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-[#334155] bg-[#0F172A]/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th class="py-3.5 px-4">
                  <button type="button" onclick="toggleTitleSort()" class="inline-flex items-center gap-1 hover:text-white transition-colors">
                    ชื่อเรื่อง<span class="text-indigo-400">${sortArrow}</span>
                  </button>
                </th>
                <th class="py-3.5 px-3">ประเภท</th>
                <th class="py-3.5 px-3">สถานะ</th>
                <th class="py-3.5 px-3">ความคืบหน้า</th>
                <th class="py-3.5 px-3 text-center">คะแนน</th>
                <th class="py-3.5 px-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#334155]/70 text-sm">
              ${filtered.map(item => {
                const unit = getUnitLabel(item.type);
                const status = STATUS_META[item.status] || STATUS_META.watching;
                const progress = Number(item.progress) || 0;
                const total = Number(item.total) || 0;
                return `
                  <tr onclick="openDetailModal('${item.id}')" class="hover:bg-slate-800/60 cursor-pointer transition-colors">
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <div class="w-9 aspect-[2/3] rounded-lg overflow-hidden shrink-0 border border-[#334155]">
                          ${renderCoverInnerHTML(item.title, item.coverGradient, item.coverImage, 'text-xs')}
                        </div>
                        <div class="min-w-0">
                          <p class="font-semibold text-white line-clamp-1">${escapeHtml(item.title)}</p>
                          ${item.thaiTitle ? `<p class="text-xs text-slate-400 line-clamp-1">${escapeHtml(item.thaiTitle)}</p>` : ''}
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded-md text-xs font-medium ${item.type === 'anime' ? 'bg-sky-500/15 text-sky-300' : 'bg-violet-500/15 text-violet-300'}">
                        ${item.type === 'anime' ? 'อนิเมะ' : 'มังงะ'}
                      </span>
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.badgeClass}">
                        <span class="w-1.5 h-1.5 rounded-full ${status.dotClass}"></span>
                        ${status.shortLabel}
                      </span>
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-300">${progress}${total > 0 ? ` / ${total}` : ''} ${unit}</span>
                        <button type="button" onclick="quickIncrement('${item.id}', event)" class="px-2 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500 text-indigo-300 hover:text-white text-[11px] font-semibold transition-colors">
                          +1
                        </button>
                      </div>
                    </td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                      ${Number(item.score) > 0 ? `<span class="text-xs font-bold text-amber-400">★ ${item.score}</span>` : '<span class="text-xs text-slate-500">-</span>'}
                    </td>
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                      <button type="button" onclick="event.stopPropagation(); openDetailModal('${item.id}')" class="px-3 py-1 rounded-lg bg-[#0F172A] hover:bg-indigo-500/20 border border-[#334155] text-xs text-slate-300 hover:text-indigo-200 transition-colors">
                        แก้ไข
                      </button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }
}

// ==================== COVER EDITOR (GRADIENT / UPLOAD / URL) ====================
function renderGradientSwatches(prefix) {
  const target = prefix === 'add' ? state.addCover : state.detailCover;
  const container = document.getElementById(`${prefix}-cover-pane-gradient`);
  container.innerHTML = COVER_GRADIENTS.map(g => {
    const selected = !target.image && target.gradient === g.id;
    return `
      <button type="button" onclick="selectCoverGradient('${prefix}', '${g.id}')" title="${g.label}" class="w-8 h-8 rounded-lg bg-gradient-to-br ${g.css} transition-all ${
        selected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F172A] scale-105' : 'opacity-80 hover:opacity-100'
      }"></button>`;
  }).join('');
}

function switchCoverTab(prefix, tab) {
  ['gradient', 'upload', 'url'].forEach(t => {
    const btn = document.getElementById(`${prefix}-cover-tab-${t}`);
    const pane = document.getElementById(`${prefix}-cover-pane-${t}`);
    const active = t === tab;
    btn.className = `py-1.5 rounded-lg text-xs font-medium transition-all ${
      active ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
    }`;
    pane.classList.toggle('hidden', !active);
  });
}

function selectCoverGradient(prefix, gradientId) {
  const target = prefix === 'add' ? state.addCover : state.detailCover;
  target.gradient = gradientId;
  target.image = '';
  renderGradientSwatches(prefix);
  if (prefix === 'add') refreshAddCoverPreview();
  else refreshDetailCoverPreview();
}

function resetCoverToGradient(prefix) {
  const target = prefix === 'add' ? state.addCover : state.detailCover;
  target.image = '';
  document.getElementById(`${prefix}-cover-url-input`).value = '';
  renderGradientSwatches(prefix);
  if (prefix === 'add') refreshAddCoverPreview();
  else refreshDetailCoverPreview();
  showToast('สลับกลับไปใช้ปกสี Gradient แล้ว', 'info');
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('border-indigo-400', 'bg-indigo-500/10');
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-500/10');
}

function handleDropFile(event, prefix) {
  event.preventDefault();
  event.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-500/10');
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  if (file) processCoverFile(file, prefix);
}

function handleFileSelect(event, prefix) {
  const file = event.target.files && event.target.files[0];
  if (file) processCoverFile(file, prefix);
  event.target.value = '';
}

function processCoverFile(file, prefix) {
  if (!file.type.startsWith('image/')) {
    showToast('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP)', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 400;
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

      const target = prefix === 'add' ? state.addCover : state.detailCover;
      target.image = compressedDataUrl;
      renderGradientSwatches(prefix);
      if (prefix === 'add') refreshAddCoverPreview();
      else refreshDetailCoverPreview();
      showToast('อัปโหลดและบีบอัดรูปปกเรียบร้อยแล้ว', 'success');
    };
    img.onerror = () => showToast('ไม่สามารถอ่านไฟล์รูปภาพนี้ได้', 'error');
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function applyCoverUrl(prefix) {
  const input = document.getElementById(`${prefix}-cover-url-input`);
  const url = input.value.trim();
  if (!url) {
    showToast('กรุณาวางลิงก์รูปภาพก่อน', 'error');
    return;
  }
  const testImg = new Image();
  testImg.onload = () => {
    const target = prefix === 'add' ? state.addCover : state.detailCover;
    target.image = url;
    renderGradientSwatches(prefix);
    if (prefix === 'add') refreshAddCoverPreview();
    else refreshDetailCoverPreview();
    showToast('โหลดรูปปกจากลิงก์เรียบร้อยแล้ว', 'success');
  };
  testImg.onerror = () => {
    showToast('ไม่สามารถโหลดรูปจากลิงก์นี้ได้ กรุณาตรวจสอบ URL', 'error');
  };
  testImg.src = url;
}

function renderGenreChips(inputId, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = POPULAR_GENRES.map(g => `
    <button type="button" onclick="toggleGenreInInput('${inputId}', '${g}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-indigo-500/20 border border-[#334155] hover:border-indigo-500/50 text-[11px] text-slate-300 hover:text-indigo-200 transition-colors">
      + ${g}
    </button>`).join('');
}

function toggleGenreInInput(inputId, genre) {
  const input = document.getElementById(inputId);
  const current = parseGenres(input.value);
  const idx = current.findIndex(g => g.toLowerCase() === genre.toLowerCase());
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(genre);
  }
  input.value = current.join(', ');
}

// ==================== ADD MODAL ====================
function openAddModal() {
  document.getElementById('add-form').reset();
  state.addCover = { gradient: 'indigo', image: '' };
  switchCoverTab('add', 'gradient');
  renderGradientSwatches('add');
  renderGenreChips('add-genres', 'add-genre-chips');
  updateAddUnitLabels();
  refreshAddCoverPreview();
  document.getElementById('add-modal').classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeAddModal() {
  document.getElementById('add-modal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

function updateAddUnitLabels() {
  const type = document.getElementById('add-type').value;
  const unit = getUnitLabel(type);
  document.getElementById('add-unit-label').textContent = unit;
  document.getElementById('add-total-unit-label').textContent = unit;
}

function refreshAddCoverPreview() {
  const title = document.getElementById('add-title').value || 'NEW';
  document.getElementById('add-cover-preview').innerHTML = renderCoverInnerHTML(
    title,
    state.addCover.gradient,
    state.addCover.image,
    'text-2xl'
  );
}

function handleAddNewItem(event) {
  event.preventDefault();
  const title = document.getElementById('add-title').value.trim();
  if (!title) {
    showToast('กรุณากรอกชื่อเรื่อง', 'error');
    return;
  }

  const newItem = {
    id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    title,
    thaiTitle: document.getElementById('add-thai-title').value.trim(),
    type: document.getElementById('add-type').value,
    status: document.getElementById('add-status').value,
    progress: Math.max(0, Number(document.getElementById('add-progress').value) || 0),
    total: Math.max(0, Number(document.getElementById('add-total').value) || 0),
    score: Math.min(10, Math.max(0, Number(document.getElementById('add-score').value) || 0)),
    genres: parseGenres(document.getElementById('add-genres').value),
    review: document.getElementById('add-review').value.trim(),
    coverGradient: state.addCover.gradient,
    coverImage: state.addCover.image,
    updatedAt: Date.now()
  };

  state.items.unshift(newItem);
  if (!saveItems()) {
    state.items.shift();
    return;
  }
  closeAddModal();
  renderAll();
  showToast(`เพิ่ม "${newItem.title}" ลงในรายการแล้ว`, 'success');
}

// ==================== DETAIL / EDIT MODAL ====================
function openDetailModal(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;

  state.editingItemId = id;
  state.deleteArmed = false;
  state.editCoverPanelOpen = false;
  state.detailCover = {
    gradient: item.coverGradient || 'indigo',
    image: item.coverImage || ''
  };

  document.getElementById('detail-title').value = item.title || '';
  document.getElementById('detail-thai-title').value = item.thaiTitle || '';
  document.getElementById('detail-type').value = item.type || 'anime';
  document.getElementById('detail-status').value = item.status || 'watching';
  document.getElementById('detail-progress').value = Number(item.progress) || 0;
  document.getElementById('detail-total').value = Number(item.total) || 0;
  document.getElementById('detail-score').value = Number(item.score) || 0;
  document.getElementById('detail-genres').value = (item.genres || []).join(', ');
  document.getElementById('detail-review').value = item.review || '';
  document.getElementById('detail-cover-url-input').value = (item.coverImage && item.coverImage.startsWith('http')) ? item.coverImage : '';
  document.getElementById('detail-delete-btn').textContent = 'ลบรายการนี้';
  document.getElementById('detail-cover-editor-panel').classList.add('hidden');

  switchCoverTab('detail', 'gradient');
  renderGradientSwatches('detail');
  renderGenreChips('detail-genres', 'detail-genre-chips');
  updateDetailUnitLabels();
  refreshDetailCoverPreview();

  document.getElementById('detail-modal').classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeDetailModal() {
  state.editingItemId = null;
  state.deleteArmed = false;
  document.getElementById('detail-modal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

function toggleDetailCoverEditor() {
  state.editCoverPanelOpen = !state.editCoverPanelOpen;
  document.getElementById('detail-cover-editor-panel').classList.toggle('hidden', !state.editCoverPanelOpen);
}

function updateDetailUnitLabels() {
  const type = document.getElementById('detail-type').value;
  const unit = getUnitLabel(type);
  document.getElementById('detail-unit-label').textContent = unit;
  document.getElementById('detail-total-unit-label').textContent = unit;
}

function refreshDetailCoverPreview() {
  const title = document.getElementById('detail-title').value || 'AL';
  document.getElementById('detail-cover-preview').innerHTML = renderCoverInnerHTML(
    title,
    state.detailCover.gradient,
    state.detailCover.image,
    'text-3xl'
  );
}

function stepDetailProgress(delta) {
  const input = document.getElementById('detail-progress');
  const total = Number(document.getElementById('detail-total').value) || 0;
  let next = (Number(input.value) || 0) + delta;
  if (next < 0) next = 0;
  if (total > 0 && next > total) next = total;
  input.value = next;
}

function handleSaveDetail(event) {
  event.preventDefault();
  const idx = state.items.findIndex(i => i.id === state.editingItemId);
  if (idx === -1) return;

  const title = document.getElementById('detail-title').value.trim();
  if (!title) {
    showToast('กรุณากรอกชื่อเรื่อง', 'error');
    return;
  }

  const prev = { ...state.items[idx] };
  state.items[idx] = {
    ...prev,
    title,
    thaiTitle: document.getElementById('detail-thai-title').value.trim(),
    type: document.getElementById('detail-type').value,
    status: document.getElementById('detail-status').value,
    progress: Math.max(0, Number(document.getElementById('detail-progress').value) || 0),
    total: Math.max(0, Number(document.getElementById('detail-total').value) || 0),
    score: Math.min(10, Math.max(0, Number(document.getElementById('detail-score').value) || 0)),
    genres: parseGenres(document.getElementById('detail-genres').value),
    review: document.getElementById('detail-review').value.trim(),
    coverGradient: state.detailCover.gradient,
    coverImage: state.detailCover.image,
    updatedAt: Date.now()
  };

  if (!saveItems()) {
    state.items[idx] = prev;
    return;
  }

  closeDetailModal();
  renderAll();
  showToast(`บันทึกการแก้ไข "${title}" เรียบร้อยแล้ว`, 'success');
}

function handleDeleteDetailItem() {
  const btn = document.getElementById('detail-delete-btn');
  if (!state.deleteArmed) {
    state.deleteArmed = true;
    btn.textContent = 'กดอีกครั้งเพื่อยืนยันลบ';
    setTimeout(() => {
      state.deleteArmed = false;
      if (btn) btn.textContent = 'ลบรายการนี้';
    }, 3000);
    return;
  }
  const item = state.items.find(i => i.id === state.editingItemId);
  state.items = state.items.filter(i => i.id !== state.editingItemId);
  saveItems();
  closeDetailModal();
  renderAll();
  showToast(`ลบ "${item ? item.title : 'รายการ'}" ออกจากคลังแล้ว`, 'info');
}

// ==================== GLOBAL EVENT LISTENERS & INIT ====================
document.getElementById('detail-modal').addEventListener('click', (e) => {
  if (e.target.id === 'detail-modal') closeDetailModal();
});
document.getElementById('add-modal').addEventListener('click', (e) => {
  if (e.target.id === 'add-modal') closeAddModal();
});
document.getElementById('profile-modal').addEventListener('click', (e) => {
  if (e.target.id === 'profile-modal') closeProfileModal();
});
document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('user-menu-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    closeUserMenu();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDetailModal();
    closeAddModal();
    closeProfileModal();
    closeUserMenu();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const existingSession = loadSession();
  if (existingSession) {
    state.currentUser = existingSession;
    updateUserProfileUI();
    loadItems();
    updateNavbarStyles();
    renderAll();
  } else {
    updateNavbarStyles();
    showAuthScreen('login');
  }
});