// ==================== SUPABASE CONFIGURATION ====================
// นำค่า Project URL และ anon public key จาก Supabase Dashboard > Settings > API มาวางที่นี่
const SUPABASE_URL = 'https://gimbullqdbvfetmsfzvq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_13Y6Rd1yWusVLdUk0C_Ifw_1Qnvew6V';

const isSupabaseConfigured =
  Boolean(window.supabase) &&
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
  !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');

const supabaseClient = isSupabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ==================== CONSTANTS & DEFINITIONS ====================
const STORAGE_KEY = 'anilog_tracker_items_v1';
const GUEST_SESSION_KEY = 'anilog_guest_mode_v1';
const GUEST_USER = { id: 'guest', username: 'guest', email: '', displayName: 'ผู้เยี่ยมชม', isGuest: true };

const TYPE_META = {
  anime: {
    label: 'อนิเมะ',
    unit: 'ตอน',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
    tableBadgeClass: 'bg-sky-500/15 text-sky-300'
  },
  manga: {
    label: 'มังงะ',
    unit: 'บท',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
    tableBadgeClass: 'bg-violet-500/15 text-violet-300'
  },
  manhwa: {
    label: 'มังฮวา',
    unit: 'บท',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/25',
    tableBadgeClass: 'bg-teal-500/15 text-teal-300'
  }
};

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
  '2D', '3D', 'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
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

function getTypeMeta(type) {
  return TYPE_META[type] || TYPE_META.anime;
}

function getUnitLabel(type) {
  return getTypeMeta(type).unit;
}

function isCloudUser() {
  return Boolean(supabaseClient && state.currentUser && !state.currentUser.isGuest);
}

// แปลงแถวจากตาราง media_items (snake_case) เป็นรูปแบบที่ใช้ในหน้าเว็บ (camelCase)
function mapDbRowToItem(row) {
  return {
    id: row.id,
    title: row.title || '',
    thaiTitle: row.thai_title || '',
    type: row.type || 'anime',
    status: row.status || 'watching',
    progress: Number(row.progress) || 0,
    total: Number(row.total) || 0,
    score: Number(row.score) || 0,
    genres: Array.isArray(row.genres) ? row.genres : [],
    watchUrl: row.watch_url || '',
    review: row.review || '',
    coverGradient: row.cover_gradient || 'indigo',
    coverImage: row.cover_image || '',
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
  };
}

// แปลงข้อมูลจากหน้าเว็บเป็นรูปแบบคอลัมน์ของตาราง media_items
function mapItemToDbRow(item, userId) {
  return {
    user_id: userId,
    title: item.title,
    thai_title: item.thaiTitle || '',
    type: item.type || 'anime',
    status: item.status || 'watching',
    progress: Math.max(0, Number(item.progress) || 0),
    total: Math.max(0, Number(item.total) || 0),
    score: Math.min(10, Math.max(0, Number(item.score) || 0)),
    genres: Array.isArray(item.genres) ? item.genres : [],
    watch_url: item.watchUrl || '',
    review: item.review || '',
    cover_gradient: item.coverGradient || 'indigo',
    cover_image: item.coverImage || '',
    updated_at: new Date().toISOString()
  };
}

function normalizeExternalUrl(rawUrl) {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (err) {
    return '';
  }
  return '';
}

function openWatchLink(rawUrl, event) {
  if (event) event.stopPropagation();
  const safeUrl = normalizeExternalUrl(rawUrl);
  if (!safeUrl) {
    showToast('ลิงก์เว็บไซต์ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง', 'error');
    return;
  }
  window.open(safeUrl, '_blank', 'noopener,noreferrer');
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
  if (!container) return;
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

// ==================== AUTHENTICATION & USER ACCOUNTS (SUPABASE) ====================
function showAuthError(msg) {
  const box = document.getElementById('auth-error-box');
  const text = document.getElementById('auth-error-text');
  if (!box || !text) return;
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

async function fetchUserProfile(authUser) {
  const fallbackName =
    (authUser.user_metadata && authUser.user_metadata.display_name) ||
    (authUser.email ? authUser.email.split('@')[0] : 'ผู้ใช้');

  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('username, display_name')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!error && data) {
      return {
        id: authUser.id,
        email: authUser.email || '',
        username: data.username || fallbackName,
        displayName: data.display_name || fallbackName,
        isGuest: false
      };
    }
  } catch (err) {
    console.warn('Could not load profile row, using metadata fallback:', err);
  }

  return {
    id: authUser.id,
    email: authUser.email || '',
    username: fallbackName,
    displayName: fallbackName,
    isGuest: false
  };
}

async function completeSignIn(user, toastMsg = '') {
  state.currentUser = user;
  if (user.isGuest) {
    localStorage.setItem(GUEST_SESSION_KEY, '1');
  } else {
    localStorage.removeItem(GUEST_SESSION_KEY);
  }
  hideAuthScreen();
  updateUserProfileUI();
  await loadItems();
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

  if (!supabaseClient) {
    showAuthError('ยังไม่ได้ตั้งค่า SUPABASE_URL และ SUPABASE_ANON_KEY ในไฟล์ app.js (สามารถกดเข้าใช้งานแบบ Guest ได้)');
    return;
  }

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('btn-login-submit');

  if (!email || !password) {
    showAuthError('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังเข้าสู่ระบบ...';

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      showAuthError('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ยืนยันอีเมล');
      return;
    }

    const userProfile = await fetchUserProfile(data.user);
    await completeSignIn(userProfile, `ยินดีต้อนรับกลับมา, ${userProfile.displayName}!`);
  } catch (err) {
    console.error('Login error:', err);
    showAuthError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'เข้าสู่ระบบ';
  }
}

async function handleRegister(event) {
  event.preventDefault();
  showAuthError('');

  if (!supabaseClient) {
    showAuthError('ยังไม่ได้ตั้งค่า SUPABASE_URL และ SUPABASE_ANON_KEY ในไฟล์ app.js');
    return;
  }

  const displayName = document.getElementById('reg-displayname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPw = document.getElementById('reg-confirm').value;
  const submitBtn = document.getElementById('btn-register-submit');

  if (!displayName || !email) {
    showAuthError('กรุณากรอกชื่อที่แสดงและอีเมลให้ครบถ้วน');
    return;
  }
  if (password.length < 6) {
    showAuthError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    return;
  }
  if (password !== confirmPw) {
    showAuthError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังสร้างบัญชี...';

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          username: email.split('@')[0]
        }
      }
    });

    if (error) {
      showAuthError(error.message || 'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่');
      return;
    }

    if (data.session && data.user) {
      const userProfile = await fetchUserProfile(data.user);
      await completeSignIn(userProfile, `สร้างบัญชีสำเร็จ! ยินดีต้อนรับคุณ ${userProfile.displayName}`);
    } else {
      showToast('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ', 'info');
      switchAuthTab('login');
    }
  } catch (err) {
    console.error('Register error:', err);
    showAuthError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'สร้างบัญชีและเข้าสู่ระบบ';
  }
}

async function loginAsGuest() {
  await completeSignIn({ ...GUEST_USER }, 'เข้าใช้งานแบบผู้เยี่ยมชม (Guest — บันทึกในเครื่องนี้)');
}

async function handleLogout() {
  closeUserMenu();
  localStorage.removeItem(GUEST_SESSION_KEY);
  if (isCloudUser()) {
    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
  }
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
  const initial = (user.displayName || user.email || 'U').trim().charAt(0).toUpperCase();
  document.getElementById('nav-user-avatar').textContent = initial;
  document.getElementById('nav-user-name').textContent = user.displayName;
  document.getElementById('dropdown-user-display').textContent = user.displayName;
  document.getElementById('dropdown-user-handle').textContent = user.isGuest
    ? 'โหมดผู้เยี่ยมชม (Guest)'
    : (user.email || '@' + user.username);
  document.getElementById('menu-btn-profile').classList.toggle('hidden', Boolean(user.isGuest));
  document.getElementById('menu-btn-switch-auth').classList.toggle('hidden', !user.isGuest);
}

function openProfileModal() {
  closeUserMenu();
  if (!state.currentUser || state.currentUser.isGuest) return;
  document.getElementById('profile-form').reset();
  document.getElementById('profile-displayname').value = state.currentUser.displayName || '';
  document.getElementById('profile-modal-handle').textContent = state.currentUser.email || '@' + state.currentUser.username;
  document.getElementById('profile-modal').classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeProfileModal() {
  document.getElementById('profile-modal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

async function handleSaveProfile(event) {
  event.preventDefault();
  if (!isCloudUser()) return;

  const newDisplayName = document.getElementById('profile-displayname').value.trim();
  const newPw = document.getElementById('profile-new-pw').value;

  if (!newDisplayName) {
    showToast('กรุณากรอกชื่อที่แสดง', 'error');
    return;
  }

  try {
    const { error: profileErr } = await supabaseClient
      .from('profiles')
      .upsert({
        id: state.currentUser.id,
        display_name: newDisplayName,
        updated_at: new Date().toISOString()
      });

    if (profileErr) throw profileErr;

    const authPayload = { data: { display_name: newDisplayName } };
    if (newPw) {
      if (newPw.length < 6) {
        showToast('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
        return;
      }
      authPayload.password = newPw;
    }

    const { error: authErr } = await supabaseClient.auth.updateUser(authPayload);
    if (authErr) throw authErr;

    state.currentUser.displayName = newDisplayName;
    updateUserProfileUI();
    closeProfileModal();
    showToast('อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว', 'success');
  } catch (err) {
    console.error('Failed to update profile:', err);
    showToast('ไม่สามารถบันทึกโปรไฟล์ได้: ' + (err.message || 'เกิดข้อผิดพลาด'), 'error');
  }
}

// ==================== PERSISTENCE (SUPABASE + LOCALSTORAGE GUEST) ====================
async function loadItems() {
  if (isCloudUser()) {
    try {
      const { data, error } = await supabaseClient
        .from('media_items')
        .select('*')
        .eq('user_id', state.currentUser.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      state.items = (data || []).map(mapDbRowToItem);
      return;
    } catch (err) {
      console.error('Failed to fetch items from Supabase:', err);
      showToast('ไม่สามารถดึงข้อมูลจากเซิร์ฟเวอร์ได้', 'error');
      state.items = [];
      return;
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.items = parsed;
        return;
      }
    }
  } catch (err) {
    console.error('Failed to load guest items:', err);
  }
  state.items = [];
}

function saveGuestItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    return true;
  } catch (err) {
    console.error('Failed to save guest items:', err);
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
async function quickIncrement(id, event) {
  if (event) event.stopPropagation();
  const item = state.items.find(i => i.id === id);
  if (!item) return;

  const current = Number(item.progress) || 0;
  const total = Number(item.total) || 0;
  if (total > 0 && current >= total) {
    showToast(`"${item.title}" ครบจำนวนทั้งหมดแล้ว`, 'info');
    return;
  }

  const prevProgress = item.progress;
  const prevStatus = item.status;
  const prevUpdated = item.updatedAt;

  item.progress = current + 1;
  item.updatedAt = Date.now();

  let toastMsg = `อัปเดต "${item.title}" เป็น ${item.progress} ${getUnitLabel(item.type)}`;
  if (total > 0 && item.progress >= total && item.status !== 'completed') {
    item.status = 'completed';
    toastMsg = `ยินดีด้วย! "${item.title}" จบครบ ${total} ${getUnitLabel(item.type)}แล้ว`;
  }

  if (isCloudUser()) {
    try {
      const { error } = await supabaseClient
        .from('media_items')
        .update({
          progress: item.progress,
          status: item.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
        .eq('user_id', state.currentUser.id);

      if (error) throw error;
    } catch (err) {
      console.error('Quick increment failed:', err);
      item.progress = prevProgress;
      item.status = prevStatus;
      item.updatedAt = prevUpdated;
      showToast('ไม่สามารถอัปเดตข้อมูลบนเซิร์ฟเวอร์ได้', 'error');
      return;
    }
  } else {
    saveGuestItems();
  }

  showToast(toastMsg, 'success');
  renderAll();
}

async function handleClearAllData() {
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

  if (isCloudUser()) {
    try {
      const { error } = await supabaseClient
        .from('media_items')
        .delete()
        .eq('user_id', state.currentUser.id);
      if (error) throw error;
    } catch (err) {
      console.error('Clear all failed:', err);
      showToast('ไม่สามารถล้างข้อมูลบนเซิร์ฟเวอร์ได้', 'error');
      return;
    }
  } else {
    state.items = [];
    saveGuestItems();
  }

  state.items = [];
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
  const manhwaCount = items.filter(i => i.type === 'manhwa').length;
  const completedCount = items.filter(i => i.status === 'completed').length;
  const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const animeEp = items.filter(i => i.type === 'anime').reduce((sum, i) => sum + (Number(i.progress) || 0), 0);
  const readingCh = items.filter(i => i.type === 'manga' || i.type === 'manhwa').reduce((sum, i) => sum + (Number(i.progress) || 0), 0);

  const rated = items.filter(i => Number(i.score) > 0);
  const avgScore = rated.length > 0
    ? (rated.reduce((sum, i) => sum + Number(i.score), 0) / rated.length).toFixed(1)
    : '-';

  document.getElementById('stat-total').textContent = total.toLocaleString();
  document.getElementById('stat-total-sub').textContent = `อนิเมะ ${animeCount} • มังงะ ${mangaCount} • มังฮวา ${manhwaCount}`;
  document.getElementById('stat-completed').textContent = completedCount.toLocaleString();
  document.getElementById('stat-completed-sub').textContent = `คิดเป็น ${completedPct}% ของทั้งหมด`;
  document.getElementById('stat-progress').textContent = (animeEp + readingCh).toLocaleString();
  document.getElementById('stat-progress-sub').textContent = `${animeEp.toLocaleString()} ตอน • ${readingCh.toLocaleString()} บท`;
  document.getElementById('stat-avg-score').textContent = avgScore;
  document.getElementById('stat-avg-sub').textContent = rated.length > 0 ? `จาก ${rated.length} เรื่องที่ให้คะแนน` : 'ยังไม่มีเรื่องที่ให้คะแนน';

  const watchingGrid = document.getElementById('dashboard-watching-grid');
  const watchingItems = items
    .filter(i => i.status === 'watching')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 6);

  if (watchingItems.length === 0) {
    watchingGrid.innerHTML = `
      <div class="sm:col-span-2 bg-[#1E293B] border border-dashed border-[#334155] rounded-2xl p-8 text-center">
        <p class="text-sm font-medium text-slate-300">ยังไม่มีรายการที่กำลังติดตาม</p>
        <p class="text-xs text-slate-500 mt-1">เริ่มต้นเพิ่มอนิเมะ มังงะ หรือมังฮวาเรื่องโปรดของคุณได้เลย</p>
        <button type="button" onclick="openAddModal()" class="mt-4 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold transition-colors">
          + เพิ่มเรื่องแรกของคุณ
        </button>
      </div>`;
  } else {
    watchingGrid.innerHTML = watchingItems.map(item => {
      const typeInfo = getTypeMeta(item.type);
      const unit = typeInfo.unit;
      const progress = Number(item.progress) || 0;
      const totalCount = Number(item.total) || 0;
      const pct = totalCount > 0 ? Math.min(100, Math.round((progress / totalCount) * 100)) : 0;
      const typeBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold border ${typeInfo.badgeClass}">${typeInfo.label}</span>`;
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
              <div class="flex items-center justify-end gap-1.5 pt-1">
                ${item.watchUrl ? `
                  <button type="button" onclick="openWatchLink('${escapeHtml(item.watchUrl)}', event)" title="เปิดเว็บสำหรับดู/อ่าน" class="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-semibold transition-all inline-flex items-center gap-1">
                    <span>ดู/อ่าน</span>
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </button>` : ''}
                <button type="button" onclick="quickIncrement('${item.id}', event)" class="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold transition-all">
                  +1 ${unit}
                </button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

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
  const allCount = state.items.length;
  const animeCount = state.items.filter(i => i.type === 'anime').length;
  const mangaCount = state.items.filter(i => i.type === 'manga').length;
  const manhwaCount = state.items.filter(i => i.type === 'manhwa').length;

  document.getElementById('count-type-all').textContent = allCount;
  document.getElementById('count-type-anime').textContent = animeCount;
  document.getElementById('count-type-manga').textContent = mangaCount;
  document.getElementById('count-type-manhwa').textContent = manhwaCount;

  ['all', 'anime', 'manga', 'manhwa'].forEach(t => {
    const btn = document.getElementById(`type-tab-${t}`);
    const active = state.typeFilter === t;
    btn.className = `px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
      active ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
    }`;
  });

  document.getElementById('btn-view-grid').className = `p-1.5 rounded-lg transition-colors ${
    state.listViewMode === 'grid' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
  }`;
  document.getElementById('btn-view-table').className = `p-1.5 rounded-lg transition-colors ${
    state.listViewMode === 'table' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
  }`;

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
          const typeInfo = getTypeMeta(item.type);
          const unit = typeInfo.unit;
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
                    ${typeInfo.label}
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
                    <div class="flex items-center gap-1">
                      ${item.watchUrl ? `
                        <button type="button" onclick="openWatchLink('${escapeHtml(item.watchUrl)}', event)" title="เปิดเว็บสำหรับดู/อ่าน" class="px-1.5 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-white text-[10px] font-semibold transition-colors inline-flex items-center gap-0.5">
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </button>` : ''}
                      <button type="button" onclick="quickIncrement('${item.id}', event)" class="px-2 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500 text-indigo-300 hover:text-white text-[10px] font-semibold transition-colors">
                        +1
                      </button>
                    </div>
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
                const typeInfo = getTypeMeta(item.type);
                const unit = typeInfo.unit;
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
                      <span class="px-2 py-0.5 rounded-md text-xs font-medium ${typeInfo.tableBadgeClass}">
                        ${typeInfo.label}
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
                      <div class="inline-flex items-center justify-end gap-1.5">
                        ${item.watchUrl ? `
                          <button type="button" onclick="openWatchLink('${escapeHtml(item.watchUrl)}', event)" title="เปิดเว็บสำหรับดู/อ่าน" class="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 border border-emerald-500/30 text-xs text-emerald-300 hover:text-white transition-colors inline-flex items-center gap-1">
                            <span>ดู/อ่าน</span>
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </button>` : ''}
                        <button type="button" onclick="event.stopPropagation(); openDetailModal('${item.id}')" class="px-3 py-1 rounded-lg bg-[#0F172A] hover:bg-indigo-500/20 border border-[#334155] text-xs text-slate-300 hover:text-indigo-200 transition-colors">
                          แก้ไข
                        </button>
                      </div>
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
    img.onload = async () => {
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

      let finalImageUrl = canvas.toDataURL('image/jpeg', 0.8);

      // หากล็อกอินด้วย Supabase ให้ลองอัปโหลดขึ้น Storage Bucket ชื่อ "covers" ก่อน
      if (isCloudUser()) {
        try {
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
          if (blob) {
            const filePath = `${state.currentUser.id}/${Date.now()}.jpg`;
            const { error: uploadErr } = await supabaseClient.storage
              .from('covers')
              .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

            if (!uploadErr) {
              const { data: pub } = supabaseClient.storage.from('covers').getPublicUrl(filePath);
              if (pub && pub.publicUrl) {
                finalImageUrl = pub.publicUrl;
              }
            }
          }
        } catch (uploadCatchErr) {
          console.warn('Storage upload fallback to Base64:', uploadCatchErr);
        }
      }

      const target = prefix === 'add' ? state.addCover : state.detailCover;
      target.image = finalImageUrl;
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

async function handleAddNewItem(event) {
  event.preventDefault();
  const title = document.getElementById('add-title').value.trim();
  if (!title) {
    showToast('กรุณากรอกชื่อเรื่อง', 'error');
    return;
  }

  const draftItem = {
    title,
    thaiTitle: document.getElementById('add-thai-title').value.trim(),
    type: document.getElementById('add-type').value,
    status: document.getElementById('add-status').value,
    progress: Math.max(0, Number(document.getElementById('add-progress').value) || 0),
    total: Math.max(0, Number(document.getElementById('add-total').value) || 0),
    score: Math.min(10, Math.max(0, Number(document.getElementById('add-score').value) || 0)),
    genres: parseGenres(document.getElementById('add-genres').value),
    watchUrl: normalizeExternalUrl(document.getElementById('add-watch-url').value),
    review: document.getElementById('add-review').value.trim(),
    coverGradient: state.addCover.gradient,
    coverImage: state.addCover.image,
    updatedAt: Date.now()
  };

  if (isCloudUser()) {
    try {
      const { data, error } = await supabaseClient
        .from('media_items')
        .insert(mapItemToDbRow(draftItem, state.currentUser.id))
        .select()
        .single();

      if (error) throw error;
      state.items.unshift(mapDbRowToItem(data));
    } catch (err) {
      console.error('Insert item failed:', err);
      showToast('ไม่สามารถเพิ่มรายการขึ้นเซิร์ฟเวอร์ได้ (ตรวจสอบว่าอัปเดตคอลัมน์ watch_url ใน SQL แล้ว)', 'error');
      return;
    }
  } else {
    const newItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      ...draftItem
    };
    state.items.unshift(newItem);
    if (!saveGuestItems()) {
      state.items.shift();
      return;
    }
  }

  closeAddModal();
  renderAll();
  showToast(`เพิ่ม "${draftItem.title}" ลงในรายการแล้ว`, 'success');
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
  document.getElementById('detail-watch-url').value = item.watchUrl || '';
  document.getElementById('detail-review').value = item.review || '';
  document.getElementById('detail-cover-url-input').value = (item.coverImage && item.coverImage.startsWith('http')) ? item.coverImage : '';
  document.getElementById('detail-delete-btn').textContent = 'ลบรายการนี้';
  document.getElementById('detail-cover-editor-panel').classList.add('hidden');
  updateDetailWatchBtnState();

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

function updateDetailWatchBtnState() {
  const input = document.getElementById('detail-watch-url');
  const btn = document.getElementById('detail-open-watch-btn');
  if (!input || !btn) return;
  const hasUrl = Boolean(normalizeExternalUrl(input.value));
  btn.classList.toggle('hidden', !hasUrl);
}

function openDetailWatchLink() {
  const input = document.getElementById('detail-watch-url');
  if (input) openWatchLink(input.value);
}

async function handleSaveDetail(event) {
  event.preventDefault();
  const idx = state.items.findIndex(i => i.id === state.editingItemId);
  if (idx === -1) return;

  const title = document.getElementById('detail-title').value.trim();
  if (!title) {
    showToast('กรุณากรอกชื่อเรื่อง', 'error');
    return;
  }

  const prev = { ...state.items[idx] };
  const updated = {
    ...prev,
    title,
    thaiTitle: document.getElementById('detail-thai-title').value.trim(),
    type: document.getElementById('detail-type').value,
    status: document.getElementById('detail-status').value,
    progress: Math.max(0, Number(document.getElementById('detail-progress').value) || 0),
    total: Math.max(0, Number(document.getElementById('detail-total').value) || 0),
    score: Math.min(10, Math.max(0, Number(document.getElementById('detail-score').value) || 0)),
    genres: parseGenres(document.getElementById('detail-genres').value),
    watchUrl: normalizeExternalUrl(document.getElementById('detail-watch-url').value),
    review: document.getElementById('detail-review').value.trim(),
    coverGradient: state.detailCover.gradient,
    coverImage: state.detailCover.image,
    updatedAt: Date.now()
  };

  if (isCloudUser()) {
    try {
      const { data, error } = await supabaseClient
        .from('media_items')
        .update(mapItemToDbRow(updated, state.currentUser.id))
        .eq('id', updated.id)
        .eq('user_id', state.currentUser.id)
        .select()
        .single();

      if (error) throw error;
      state.items[idx] = mapDbRowToItem(data);
    } catch (err) {
      console.error('Update item failed:', err);
      showToast('ไม่สามารถบันทึกการแก้ไขขึ้นเซิร์ฟเวอร์ได้ (ตรวจสอบว่าอัปเดตคอลัมน์ watch_url ใน SQL แล้ว)', 'error');
      return;
    }
  } else {
    state.items[idx] = updated;
    if (!saveGuestItems()) {
      state.items[idx] = prev;
      return;
    }
  }

  closeDetailModal();
  renderAll();
  showToast(`บันทึกการแก้ไข "${title}" เรียบร้อยแล้ว`, 'success');
}

async function handleDeleteDetailItem() {
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

  if (isCloudUser()) {
    try {
      const { error } = await supabaseClient
        .from('media_items')
        .delete()
        .eq('id', state.editingItemId)
        .eq('user_id', state.currentUser.id);
      if (error) throw error;
    } catch (err) {
      console.error('Delete item failed:', err);
      showToast('ไม่สามารถลบรายการบนเซิร์ฟเวอร์ได้', 'error');
      return;
    }
  }

  state.items = state.items.filter(i => i.id !== state.editingItemId);
  if (!isCloudUser()) saveGuestItems();

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

window.addEventListener('DOMContentLoaded', async () => {
  updateNavbarStyles();

  // 1. ตรวจสอบ Session จาก Supabase ก่อน (หากตั้งค่าไว้แล้ว)
  if (supabaseClient) {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session && session.user) {
        const userProfile = await fetchUserProfile(session.user);
        await completeSignIn(userProfile);
        return;
      }
    } catch (err) {
      console.error('Failed to check Supabase session:', err);
    }
  }

  // 2. ตรวจสอบว่าเคยเลือกโหมด Guest ไว้หรือไม่
  if (localStorage.getItem(GUEST_SESSION_KEY) === '1') {
    await completeSignIn({ ...GUEST_USER });
    return;
  }

  showAuthScreen('login');
});