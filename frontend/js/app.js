// ─── CONFIG ───
const API = '';
let token = localStorage.getItem('token') || '';
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentPage = 'dashboard';
let currentTheme = localStorage.getItem('theme') || 'dark';
let yearlyChartData = [];
let yearlyChartYear = new Date().getFullYear();

// ─── HELPERS ───
const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫';
const fmtNum = n => new Intl.NumberFormat('vi-VN').format(Math.round(n));
const fmtDate = d => new Date(d).toLocaleDateString('vi-VN');

async function api(path, opts = {}) {
  const res = await fetch(API + '/api' + path, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi server');
  return data;
}

async function apiForm(path, formData, method = 'PUT') {
  const res = await fetch(API + '/api' + path, {
    method,
    headers: token ? { Authorization: 'Bearer ' + token } : {},
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi server');
  return data;
}

function toast(msg, type = 'success') {
  const c = $('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span>${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

function applyTheme(theme) {
  currentTheme = theme;
  document.body.classList.toggle('light-theme', theme === 'light');
  localStorage.setItem('theme', theme);
  if ($('theme-toggle')) {
    $('theme-toggle').textContent = theme === 'light' ? 'Dark mode' : 'Light mode';
  }
}

function toggleTheme() {
  applyTheme(currentTheme === 'light' ? 'dark' : 'light');
}

// ─── AUTH ───
function showRegister() {
  $('login-form').style.display = 'none';
  $('register-form').style.display = 'block';
}
function showLogin() {
  $('register-form').style.display = 'none';
  $('login-form').style.display = 'block';
}

async function handleLogin() {
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email: $('login-email').value, password: $('login-pass').value },
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    enterApp();
  } catch (e) { toast(e.message, 'error'); }
}

async function handleRegister() {
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: {
        name: $('reg-name').value,
        email: $('reg-email').value,
        password: $('reg-pass').value,
        role: $('reg-role').value,
      },
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    enterApp();
    toast('Đăng ký thành công!');
  } catch (e) { toast(e.message, 'error'); }
}

function handleLogout() {
  token = '';
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  $('main-app').style.display = 'none';
  $('auth-screen').style.display = 'flex';
}

function enterApp() {
  $('auth-screen').style.display = 'none';
  $('main-app').style.display = 'block';
  updateUserUI();
  loadDashboard();
  $('topbar-date').textContent = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function updateUserUI() {
  if (!currentUser) return;
  $('user-name-sidebar').textContent = currentUser.name;
  $('user-role-sidebar').textContent = currentUser.role === 'business' ? 'Doanh nghiệp' : 'Cá nhân';
  if (currentUser.avatar) {
    $('user-avatar-sidebar').style.backgroundImage = `url(${currentUser.avatar})`;
    $('user-avatar-sidebar').style.backgroundSize = 'cover';
    $('user-avatar-sidebar').style.backgroundPosition = 'center';
    $('user-avatar-sidebar').textContent = '';
  } else {
    $('user-avatar-sidebar').style.backgroundImage = '';
    $('user-avatar-sidebar').textContent = currentUser.name.charAt(0).toUpperCase();
  }
}

// ─── NAVIGATION ───
const PAGE_TITLES = { dashboard: 'Dashboard', transactions: 'Giao dịch', budgets: 'Ngân sách', assets: 'Tài sản', portfolio: 'Danh mục cổ phiếu', simulation: 'Mô phỏng DCA' };

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  $('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(`'${page}'`)) n.classList.add('active');
  });

  $('page-title').textContent = PAGE_TITLES[page] || page;
  currentPage = page;

  if (page === 'dashboard') loadDashboard();
  else if (page === 'transactions') { setDefaultMonth(); loadTransactions(); }
  else if (page === 'budgets') loadBudgets();
  else if (page === 'assets') loadAssets();
  else if (page === 'portfolio') loadPortfolios();
  else if (page === 'simulation') { setSimDefaults(); loadSimulations(); }
}

// ─── DASHBOARD ───
async function loadDashboard() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    const [summary, cats, ports] = await Promise.all([
      api(`/transactions/summary?month=${month}&year=${year}`),
      api(`/transactions/by-category?month=${month}&year=${year}&type=expense`),
      api('/portfolios'),
    ]);

    const s = summary.data;
    $('dash-income').textContent = fmt(s.income);
    $('dash-expense').textContent = fmt(s.expense);
    const bal = s.income - s.expense;
    $('dash-balance').textContent = fmt(Math.abs(bal));
    $('dash-balance').className = 'stat-value ' + (bal >= 0 ? 'green' : 'red');
    $('dash-portfolio').textContent = ports.data.length;
  } catch (e) {}

  loadRecentTx();
  loadCategoryChart();
  loadYearlyIncomeExpenseChart(year);
}

async function loadRecentTx() {
  try {
    const data = await api('/transactions?limit=8');
    const items = data.data;
    if (!items.length) {
      $('dash-recent-tx').innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Chưa có giao dịch nào</div></div>';
      return;
    }
    $('dash-recent-tx').innerHTML = items.map(tx => `
      <div class="tx-item">
        <div class="tx-icon" style="background:${tx.type==='income'?'rgba(16,185,129,.12)':'rgba(244,63,94,.12)'}">
          ${CATEGORY_ICONS[tx.category] || '💳'}
        </div>
        <div class="tx-info">
          <div class="tx-name">${tx.note || tx.category}</div>
          <div class="tx-cat">${tx.category} · ${fmtDate(tx.date)}</div>
        </div>
        <div class="tx-amount ${tx.type}">${tx.type==='income'?'+':'-'}${fmt(tx.amount)}</div>
      </div>
    `).join('');
  } catch (e) {}
}

async function loadCategoryChart() {
  const now = new Date();
  try {
    const data = await api(`/transactions/by-category?month=${now.getMonth()+1}&year=${now.getFullYear()}&type=expense`);
    const cats = data.data;
    if (!cats.length) {
      $('dash-categories').innerHTML = '<div class="empty"><div class="empty-icon">🗂️</div><div class="empty-text">Chưa có chi tiêu tháng này</div></div>';
      return;
    }
    const total = cats.reduce((s, c) => s + c.total, 0);
    const colors = ['#4f9cf9','#10b981','#f59e0b','#8b5cf6','#f43f5e','#06b6d4','#84cc16'];
    $('dash-categories').innerHTML = cats.slice(0, 6).map((c, i) => `
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:.82rem">
          <span style="color:var(--text)">${c._id}</span>
          <span style="color:var(--muted);font-family:'DM Mono',monospace">${fmt(c.total)}</span>
        </div>
        <div class="progress">
          <div class="progress-bar" style="width:${Math.min(100,(c.total/total*100)).toFixed(1)}%;background:${colors[i%colors.length]}"></div>
        </div>
      </div>
    `).join('');
  } catch (e) {}
}

async function loadYearlyIncomeExpenseChart(year = new Date().getFullYear()) {
  try {
    const report = await api(`/transactions/quarterly?year=${year}`);
    yearlyChartYear = report.year;
    yearlyChartData = report.data;

    renderYearlyIncomeExpenseChart();
  } catch (e) {
    $('dash-yearly-chart').innerHTML = '<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">Không tải được biểu đồ tài chính theo quý</div></div>';
  }
}

function renderYearlyIncomeExpenseChart() {
  if (!$('dash-yearly-chart')) return;

  const modes = [
    { key: 'revenue', label: 'Doanh thu', className: 'revenue', checked: $('chart-mode-revenue')?.checked },
    { key: 'expense', label: 'Chi phí', className: 'expense', checked: $('chart-mode-expense')?.checked },
    { key: 'profit', label: 'Lợi nhuận', className: 'profit', checked: $('chart-mode-profit')?.checked },
  ].filter(mode => mode.checked);

  const totalRevenue = yearlyChartData.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpense = yearlyChartData.reduce((sum, item) => sum + item.expense, 0);
  const totalProfit = totalRevenue - totalExpense;

  if (!totalRevenue && !totalExpense) {
    $('dash-yearly-chart').innerHTML = '<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">Chưa có dữ liệu tài chính trong năm nay</div></div>';
    return;
  }

  if (!modes.length) {
    $('dash-yearly-chart').innerHTML = '<div class="empty"><div class="empty-icon">☑️</div><div class="empty-text">Chọn ít nhất một chế độ biểu đồ</div></div>';
    return;
  }

  const maxValue = Math.max(
    ...yearlyChartData.flatMap(item => modes.map(mode => Math.abs(item[mode.key] || 0))),
    1
  );

  $('dash-yearly-chart').innerHTML = `
    <div class="yearly-summary">
      <div><span>Tổng doanh thu ${yearlyChartYear}</span><strong class="green">${fmt(totalRevenue)}</strong></div>
      <div><span>Tổng chi phí ${yearlyChartYear}</span><strong class="red">${fmt(totalExpense)}</strong></div>
      <div><span>Tổng lợi nhuận</span><strong class="${totalProfit >= 0 ? 'green' : 'red'}">${totalProfit < 0 ? '-' : ''}${fmt(Math.abs(totalProfit))}</strong></div>
    </div>
    <div class="chart-legend">
      ${modes.map(mode => `<span><i class="legend-dot ${mode.className}-dot"></i>${mode.label}</span>`).join('')}
    </div>
    <div class="yearly-chart">
      ${yearlyChartData.map(item => `
        <div class="yearly-month">
          <div class="yearly-bars">
            ${modes.map(mode => {
              const value = item[mode.key] || 0;
              const height = Math.max(value ? 6 : 0, Math.abs(value) / maxValue * 100);
              const valueText = value < 0 ? '-' + fmt(Math.abs(value)) : fmt(value);
              return `<div class="yearly-bar ${mode.className} ${value < 0 ? 'negative' : ''}" style="height:${height}%" title="${mode.label} ${item.label}: ${valueText}"></div>`;
            }).join('')}
          </div>
          <div class="yearly-label">${item.label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

async function exportYearlyChartCSV() {
  if (!yearlyChartData.length) return toast('Chưa có dữ liệu biểu đồ để xuất', 'error');

  try {
    const res = await fetch(`/api/transactions/quarterly/export?year=${yearlyChartYear}`, {
      headers: token ? { Authorization: 'Bearer ' + token } : {},
    });
    if (!res.ok) throw new Error('Không xuất được biểu đồ');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bieu-do-tai-chinh-theo-quy-${yearlyChartYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Đã xuất biểu đồ gồm doanh thu, chi phí và lợi nhuận');
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ─── TRANSACTIONS ───
const INCOME_CATS = ['Lương', 'Thưởng', 'Đầu tư', 'Kinh doanh', 'Khác'];
const EXPENSE_CATS = ['Ăn uống', 'Đi lại', 'Nhà ở', 'Giải trí', 'Y tế', 'Giáo dục', 'Mua sắm', 'Khác'];
const CATEGORY_ICONS = { 'Lương':'💼','Thưởng':'🎁','Đầu tư':'📈','Kinh doanh':'🏢','Ăn uống':'🍜','Đi lại':'🚗','Nhà ở':'🏠','Giải trí':'🎮','Y tế':'💊','Giáo dục':'📚','Mua sắm':'🛍️','Khác':'💳' };

function setTxType(type, el) {
  $('tx-type-input').value = type;
  document.querySelectorAll('#modal-add-tx .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const sel = $('tx-category');
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  sel.innerHTML = cats.map(c => `<option>${c}</option>`).join('');
}

function setDefaultMonth() {
  const now = new Date();
  $('tx-filter-month').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

function clearFilters() {
  $('tx-filter-type').value = '';
  $('tx-filter-month').value = '';
  loadTransactions();
}

async function loadTransactions() {
  const type = $('tx-filter-type').value;
  const month = $('tx-filter-month').value;
  let q = '?limit=50';
  if (type) q += `&type=${type}`;
  if (month) {
    const [y, m] = month.split('-');
    q += `&startDate=${y}-${m}-01&endDate=${y}-${m}-31`;
  }
  try {
    const data = await api('/transactions' + q);
    const rows = data.data;
    if (!rows.length) {
      $('tx-tbody').innerHTML = '<tr><td colspan="6"><div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Không có giao dịch nào</div></div></td></tr>';
      return;
    }
    $('tx-tbody').innerHTML = rows.map(tx => `
      <tr>
        <td>${tx.note || '—'}</td>
        <td><span class="badge ${tx.type==='income'?'badge-green':'badge-red'}">${tx.category}</span></td>
        <td>${fmtDate(tx.date)}</td>
        <td><span class="badge ${tx.type==='income'?'badge-green':'badge-red'}">${tx.type==='income'?'Thu':'Chi'}</span></td>
        <td class="mono" style="text-align:right;color:${tx.type==='income'?'var(--green)':'var(--red)'}">${tx.type==='income'?'+':'-'}${fmt(tx.amount)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteTransaction('${tx._id}')">Xóa</button></td>
      </tr>
    `).join('');
  } catch (e) { toast('Lỗi tải giao dịch', 'error'); }
}

async function submitTransaction() {
  try {
    await api('/transactions', {
      method: 'POST',
      body: {
        type: $('tx-type-input').value,
        amount: Number($('tx-amount').value),
        category: $('tx-category').value,
        note: $('tx-note').value,
        date: $('tx-date').value || new Date().toISOString(),
      },
    });
    closeModal('modal-add-tx');
    toast('Đã thêm giao dịch!');
    loadTransactions();
    $('tx-amount').value = '';
    $('tx-note').value = '';
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteTransaction(id) {
  if (!confirm('Xóa giao dịch này?')) return;
  try {
    await api('/transactions/' + id, { method: 'DELETE' });
    toast('Đã xóa giao dịch');
    loadTransactions();
  } catch (e) { toast(e.message, 'error'); }
}

async function exportTransactionsCSV() {
  try {
    const data = await api('/transactions?limit=1000');
    const header = ['Ghi chú', 'Danh mục', 'Ngày', 'Loại', 'Số tiền'];
    const rows = data.data.map(tx => [
      tx.note || '',
      tx.category,
      fmtDate(tx.date),
      tx.type === 'income' ? 'Thu' : 'Chi',
      tx.amount,
    ]);
    const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finance-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('Đã xuất CSV');
  } catch (e) { toast(e.message, 'error'); }
}

function exportReportPDF() {
  window.print();
}

// ─── BUDGETS ───
async function loadBudgets() {
  const now = new Date();
  try {
    const data = await api('/budgets?month=' + (now.getMonth()+1) + '&year=' + now.getFullYear());
    const budgets = data.data;

    if (!budgets.length) {
      $('budgets-grid').innerHTML = '<div style="grid-column:1/-1"><div class="empty"><div class="empty-icon">🎯</div><div class="empty-text">Chưa có ngân sách nào. Thêm ngân sách để theo dõi chi tiêu!</div></div></div>';
      return;
    }

    $('budgets-grid').innerHTML = budgets.map(b => {
      const pct = Math.min(100, b.percentUsed || 0);
      const over = b.spent > b.limitAmount;
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
              <div style="font-weight:600;margin-bottom:2px">${b.category}</div>
              <div style="font-size:.75rem;color:var(--muted)">${b.month}/${b.year}</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteBudget('${b._id}')">Xóa</button>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:6px">
            <span style="color:var(--muted2)">Đã chi: <span style="color:${over?'var(--red)':'var(--text)'};font-family:'DM Mono',monospace">${fmt(b.spent || 0)}</span></span>
            <span style="color:var(--muted)">/ ${fmt(b.limitAmount)}</span>
          </div>
          <div class="progress">
            <div class="progress-bar" style="width:${pct.toFixed(1)}%;background:${over?'var(--red)':pct>80?'var(--amber)':'var(--green)'}"></div>
          </div>
          ${over ? '<div style="font-size:.75rem;color:var(--red);margin-top:6px">⚠️ Vượt ngân sách ' + fmt((b.spent || 0) - b.limitAmount) + '</div>' : ''}
        </div>
      `;
    }).join('');
  } catch (e) { toast('Lỗi tải ngân sách', 'error'); }
}

async function submitBudget() {
  const cat = $('budget-category').value;
  const limit = Number($('budget-limit').value);
  const monthVal = $('budget-month').value;
  if (!limit || !monthVal) return toast('Vui lòng điền đầy đủ', 'error');
  const [y, m] = monthVal.split('-');
  try {
    await api('/budgets', { method: 'POST', body: { category: cat, limitAmount: limit, month: Number(m), year: Number(y) } });
    closeModal('modal-add-budget');
    toast('Đã lưu ngân sách!');
    loadBudgets();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteBudget(id) {
  if (!confirm('Xóa ngân sách này?')) return;
  try {
    await api('/budgets/' + id, { method: 'DELETE' });
    toast('Đã xóa ngân sách');
    loadBudgets();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── ASSETS ───
const ASSET_TYPES = { cash: 'Tiền mặt', savings: 'Tiết kiệm', stock: 'Cổ phiếu', real_estate: 'Bất động sản', vehicle: 'Phương tiện', other: 'Khác' };
const ASSET_ICONS = { cash: '💵', savings: '🏦', stock: '📊', real_estate: '🏠', vehicle: '🚗', other: '📦' };

async function loadAssets() {
  try {
    const data = await api('/assets');
    const assets = data.data;

    // Summary
    const totalByType = data.summary?.byType || {};
    const grandTotal = data.summary?.totalValue || 0;

    $('asset-summary').innerHTML = `
      <div class="stat-card blue"><div class="stat-icon">💼</div><div class="stat-label">Tổng tài sản</div><div class="stat-value">${fmt(grandTotal)}</div><div class="stat-sub">${assets.length} tài sản</div></div>
      ${Object.entries(totalByType).map(([k,v]) => `
        <div class="stat-card green"><div class="stat-icon">${ASSET_ICONS[k]||'📦'}</div><div class="stat-label">${ASSET_TYPES[k]||k}</div><div class="stat-value" style="font-size:1.1rem">${fmt(v)}</div><div class="stat-sub">${grandTotal ? ((v/grandTotal)*100).toFixed(1) : 0}% tổng tài sản</div></div>
      `).join('')}
    `;

    if (!assets.length) {
      $('assets-tbody').innerHTML = '<tr><td colspan="5"><div class="empty"><div class="empty-icon">💼</div><div class="empty-text">Chưa có tài sản nào</div></div></td></tr>';
      return;
    }
    $('assets-tbody').innerHTML = assets.map(a => `
      <tr>
        <td>${ASSET_ICONS[a.type]||'📦'} ${a.name}</td>
        <td><span class="badge badge-blue">${ASSET_TYPES[a.type]||a.type}</span></td>
        <td>${fmtDate(a.acquiredAt)}</td>
        <td class="mono" style="text-align:right;color:var(--green)">${fmt(a.value)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteAsset('${a._id}')">Xóa</button></td>
      </tr>
    `).join('');
  } catch (e) { toast('Lỗi tải tài sản', 'error'); }
}

async function submitAsset() {
  const name = $('asset-name').value;
  const value = Number($('asset-value').value);
  if (!name || !value) return toast('Vui lòng điền đầy đủ', 'error');
  try {
    await api('/assets', {
      method: 'POST',
      body: { name, type: $('asset-type').value, value, acquiredAt: $('asset-date').value || new Date().toISOString() },
    });
    closeModal('modal-add-asset');
    toast('Đã thêm tài sản!');
    loadAssets();
    $('asset-name').value = '';
    $('asset-value').value = '';
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteAsset(id) {
  if (!confirm('Xóa tài sản này?')) return;
  try {
    await api('/assets/' + id, { method: 'DELETE' });
    toast('Đã xóa tài sản');
    loadAssets();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── PORTFOLIO ───
async function loadPortfolios() {
  try {
    const data = await api('/portfolios');
    const ports = data.data;
    if (!ports.length) {
      $('portfolio-grid').innerHTML = '<div style="grid-column:1/-1"><div class="empty"><div class="empty-icon">📊</div><div class="empty-text">Chưa có portfolio nào. Tạo portfolio để bắt đầu!</div></div></div>';
      return;
    }
    $('portfolio-grid').innerHTML = ports.map(p => `
      <div class="portfolio-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <div class="portfolio-name">${p.name}</div>
          <button class="btn btn-danger btn-sm" onclick="deletePortfolio('${p._id}',event)">Xóa</button>
        </div>
        <div class="portfolio-desc">${p.description || 'Không có mô tả'}</div>
        ${p.stocks.length ? `<div class="stock-chips">${p.stocks.slice(0,6).map(s => `<span class="stock-chip">${s.symbol} · ${fmtNum((s.shares || 0) * (s.buyPrice || 0))}</span>`).join('')}${p.stocks.length > 6 ? `<span class="stock-chip">+${p.stocks.length-6}</span>` : ''}</div>` : '<div style="font-size:.78rem;color:var(--muted)">Chưa có cổ phiếu</div>'}
        <button class="btn btn-ghost btn-sm" style="margin-top:14px" onclick="openAddStock('${p._id}', event)">Thêm cổ phiếu</button>
        <div style="margin-top:12px;font-size:.75rem;color:var(--muted)">${new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
      </div>
    `).join('');
  } catch (e) { toast('Lỗi tải portfolio', 'error'); }
}

async function submitPortfolio() {
  try {
    await api('/portfolios', { method: 'POST', body: { name: $('port-name').value, description: $('port-desc').value } });
    closeModal('modal-add-portfolio');
    toast('Đã tạo portfolio!');
    loadPortfolios();
    $('port-name').value = '';
    $('port-desc').value = '';
  } catch (e) { toast(e.message, 'error'); }
}

async function deletePortfolio(id, e) {
  e.stopPropagation();
  if (!confirm('Xóa portfolio này?')) return;
  try {
    await api('/portfolios/' + id, { method: 'DELETE' });
    toast('Đã xóa portfolio');
    loadPortfolios();
  } catch (e) { toast(e.message, 'error'); }
}

function openAddStock(portfolioId, event) {
  if (event) event.stopPropagation();
  $('stock-portfolio-id').value = portfolioId;
  openModal('modal-add-stock');
}

async function submitStock() {
  try {
    await api('/portfolios/' + $('stock-portfolio-id').value + '/stocks', {
      method: 'POST',
      body: {
        symbol: $('stock-symbol').value.toUpperCase(),
        shares: Number($('stock-shares').value),
        buyPrice: Number($('stock-price').value),
        buyDate: $('stock-date').value || new Date().toISOString(),
        strategy: $('stock-strategy').value,
        note: $('stock-note').value,
      },
    });
    closeModal('modal-add-stock');
    toast('Đã thêm cổ phiếu!');
    ['stock-symbol', 'stock-shares', 'stock-price', 'stock-note'].forEach(id => { $(id).value = ''; });
    loadPortfolios();
  } catch (e) { toast(e.message, 'error'); }
}

async function lookupStock() {
  const symbol = $('sim-symbol').value.trim().toUpperCase();
  if (!symbol) return;
  try {
    const data = await api('/stocks/' + symbol);
    const s = data.data;
    $('stock-info').innerHTML = `
      <div class="stock-info-card">
        <div>
          <div class="portfolio-name">${s.symbol} · ${s.name}</div>
          <div class="portfolio-desc">${s.sector}</div>
        </div>
        <div class="stock-metrics">
          <span>P/E ${s.pe}</span><span>EPS ${fmtNum(s.eps)}</span><span>${fmt(s.price)}</span>
        </div>
      </div>
      <div class="mini-chart">${s.history.map(h => `<div class="mini-bar" style="height:${Math.max(10, Math.min(100, h.price / s.price * 76))}%" title="Tháng ${h.month}: ${fmt(h.price)}"></div>`).join('')}</div>
    `;
  } catch (e) {
    $('stock-info').innerHTML = '<div class="empty" style="padding:16px"><div class="empty-text">Không có dữ liệu mã này trong demo</div></div>';
  }
}

// ─── SIMULATION ───
function setSimDefaults() {
  const now = new Date();
  if (!$('sim-end').value) {
    $('sim-end').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  }
}

function switchSimTab(strategy, el) {
  $('sim-strategy').value = strategy;
  document.querySelectorAll('#page-simulation .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  $('sim-dca-fields').style.display = strategy === 'dca' ? 'block' : 'none';
  $('sim-lump-fields').style.display = strategy === 'lump_sum' ? 'block' : 'none';
}

async function runSimulation() {
  try {
    const body = {
      symbol: $('sim-symbol').value.toUpperCase(),
      strategy: $('sim-strategy').value,
      monthlyAmount: Number($('sim-monthly').value) || 0,
      initialAmount: Number($('sim-initial').value) || 0,
      startDate: $('sim-start').value + '-01',
      endDate: $('sim-end').value + '-28',
    };
    // Override annual return bằng cách tính lại client-side với input của user
    const annualReturn = Number($('sim-return').value) / 100 || 0.12;
    const monthlyReturn = annualReturn / 12;
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    let totalInvested = 0, currentValue = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (body.strategy === 'dca') {
        totalInvested += body.monthlyAmount;
        currentValue = (currentValue + body.monthlyAmount) * (1 + monthlyReturn);
      }
      cur.setMonth(cur.getMonth() + 1);
    }
    if (body.strategy === 'lump_sum') {
      totalInvested = body.initialAmount;
      const months = Math.round((end - start) / (1000*60*60*24*30));
      currentValue = body.initialAmount * Math.pow(1 + monthlyReturn, months);
    }
    const profitPercent = ((currentValue - totalInvested) / totalInvested * 100).toFixed(2);

    $('res-invested').textContent = fmt(totalInvested);
    $('res-value').textContent = fmt(currentValue);
    $('res-profit').textContent = '+' + profitPercent + '%';
    $('sim-result').style.display = 'block';
    drawSimulationChart(body, monthlyReturn, start, end);

    // Lưu lên server
    await api('/simulations/run', { method: 'POST', body: { ...body, annualReturn } });
    loadSimulations();
    toast('Mô phỏng hoàn tất!');
  } catch (e) { toast(e.message || 'Lỗi mô phỏng', 'error'); }
}

function drawSimulationChart(body, monthlyReturn, start, end) {
  const points = [];
  let totalInvested = 0;
  let currentValue = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (body.strategy === 'dca') {
      totalInvested += body.monthlyAmount;
      currentValue = (currentValue + body.monthlyAmount) * (1 + monthlyReturn);
    } else if (!points.length) {
      totalInvested = body.initialAmount;
      currentValue = body.initialAmount;
    } else {
      currentValue *= (1 + monthlyReturn);
    }
    points.push({ value: currentValue, invested: totalInvested });
    cur.setMonth(cur.getMonth() + 1);
  }
  const max = Math.max(...points.map(p => p.value), ...points.map(p => p.invested), 1);
  $('sim-chart').innerHTML = points.map(p => `
    <div class="sim-chart-col">
      <div class="sim-chart-bar value" style="height:${Math.max(4, p.value / max * 100)}%"></div>
      <div class="sim-chart-bar invested" style="height:${Math.max(4, p.invested / max * 100)}%"></div>
    </div>
  `).join('');
}

async function updateProfile() {
  try {
    const form = new FormData();
    form.append('name', $('profile-name').value);
    form.append('email', $('profile-email').value);
    if ($('profile-avatar').files[0]) form.append('avatar', $('profile-avatar').files[0]);
    const data = await apiForm('/auth/update-profile', form);
    currentUser = data.user;
    localStorage.setItem('user', JSON.stringify(currentUser));
    updateUserUI();
    closeModal('modal-profile');
    toast('Đã cập nhật hồ sơ');
  } catch (e) { toast(e.message, 'error'); }
}

function openProfile() {
  if (!currentUser) return;
  $('profile-name').value = currentUser.name || '';
  $('profile-email').value = currentUser.email || '';
  openModal('modal-profile');
}

async function requestPasswordReset() {
  try {
    const data = await api('/auth/forgot-password', { method: 'POST', body: { email: $('forgot-email').value } });
    $('reset-token').value = data.resetToken || '';
    toast('Đã tạo mã đặt lại mật khẩu');
  } catch (e) { toast(e.message, 'error'); }
}

async function resetPassword() {
  try {
    await api('/auth/reset-password/' + $('reset-token').value, { method: 'POST', body: { password: $('reset-pass').value } });
    closeModal('modal-forgot');
    toast('Đã đổi mật khẩu, bạn đăng nhập lại nhé');
  } catch (e) { toast(e.message, 'error'); }
}

async function loadSimulations() {
  try {
    const data = await api('/simulations');
    const sims = data.data;
    if (!sims.length) {
      $('sim-history').innerHTML = '<div class="empty"><div class="empty-icon">🔬</div><div class="empty-text">Chưa có lịch sử mô phỏng</div></div>';
      return;
    }
    $('sim-history').innerHTML = sims.map(s => `
      <div style="padding:12px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div>
            <span style="font-weight:600;font-family:'DM Mono',monospace">${s.symbol}</span>
            <span class="badge badge-blue" style="margin-left:8px">${s.strategy === 'dca' ? 'DCA' : 'Một lần'}</span>
          </div>
          <span style="font-size:.8rem;color:var(--green);font-weight:600">+${s.profitPercent}%</span>
        </div>
        <div style="display:flex;gap:16px;font-size:.75rem;color:var(--muted)">
          <span>Đầu tư: <span style="color:var(--muted2)">${fmt(s.totalInvested)}</span></span>
          <span>Kết quả: <span style="color:var(--green)">${fmt(s.resultValue)}</span></span>
        </div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:4px">${fmtDate(s.startDate)} → ${fmtDate(s.endDate)}</div>
      </div>
    `).join('');
  } catch (e) {}
}

// ─── INIT ───
window.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme);

  // Khởi tạo defaults
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  if ($('tx-date')) $('tx-date').value = todayStr;
  if ($('asset-date')) $('asset-date').value = todayStr;
  if ($('stock-date')) $('stock-date').value = todayStr;
  if ($('budget-month')) $('budget-month').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  // Init tx category dropdown
  setTxType('income', document.querySelector('#modal-add-tx .tab'));

  // Auto login nếu có token
  if (token && currentUser) {
    enterApp();
  }

  // Close modal khi click outside
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  });
});
