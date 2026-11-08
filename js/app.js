// ====== 全域變數定義區 (供所有模組共用) ======
const LIFF_ID = '2012296480-FSAclNbs'; 
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxYx_h3YGtJ7chIJGWSVxFxMmR5rdyAirXF-Uo658iak_UjLOP3j4Z95YWinE5x-emFPg/exec';

let currentUser = { uid: null, displayName: null };
let myOwnProfile = {}; 
let currentProfile = {}; 
let isProxyMode = false; 
let timeoutTimer;

// 購物車與理貨變數
let shoppingCart = []; 
let currentPickingOrder = ''; 
let pickingItems = [];
let canvas, ctx, isDrawing = false;

// ====== 系統初始化 ======
window.onload = function() {
  timeoutTimer = setTimeout(() => { handleTimeout(); }, 8000);
  initializeLiff(); 
  if(typeof initSignaturePad === 'function') initSignaturePad(); 
  if(typeof initBarcodeListener === 'function') initBarcodeListener();
};

function handleTimeout() { 
  document.getElementById('loadingView').innerHTML = `<h2 style="color: #D47C7C;">連線逾時</h2><p style="text-align:center; color:#8C7A6B;">系統載入超過 8 秒，請檢查網路連線。</p><button class="btn primary-btn" onclick="location.reload()">重新整理</button>`; 
}
function clearSysTimeout() { 
  if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; } 
}

function initializeLiff() {
  liff.init({ liffId: LIFF_ID }).then(() => {
    if (!liff.isLoggedIn()) { clearSysTimeout(); liff.login(); } 
    else {
      liff.getProfile().then(profile => { 
        currentUser.uid = profile.userId; currentUser.displayName = profile.displayName; 
        loginToSystem(); 
      }).catch(err => { clearSysTimeout(); alert('LINE 資料獲取失敗，請重新整理'); });
    }
  }).catch(err => { clearSysTimeout(); alert('系統初始化失敗，請聯絡管理員'); });
}

// ====== 登入與註冊模組 ======
function loginToSystem() {
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'login', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    clearSysTimeout();
    if (result.status === 'success') {
      if (result.data.isRegistered === false) { switchView('registerView'); } 
      else {
        myOwnProfile = result.data; currentProfile = result.data; 
        setupDashboard(result.data); switchView('dashboardView');
      }
    } else alert('登入異常：' + result.message);
  }).catch(err => { clearSysTimeout(); alert('伺服器連線失敗，請稍後再試'); });
}

document.getElementById('registerForm').addEventListener('submit', function(e) {
  e.preventDefault(); 
  const regData = { uid: currentUser.uid, phone: document.getElementById('regPhone').value, companyName: document.getElementById('regCompany').value, managerName: document.getElementById('regManager').value, taxId: document.getElementById('regTaxId').value, address: document.getElementById('regAddress').value };
  switchView('loadingView'); document.getElementById('loadingView').innerHTML = `<h2>資料建檔中</h2><p style="text-align:center; color:#8C7A6B;">請稍候...</p>`;
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'register', data: regData }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') { alert('建檔成功！歡迎加入'); document.getElementById('loadingView').innerHTML = `<h2>驗證權限中</h2>`; loginToSystem(); } 
    else { alert('註冊失敗：' + result.message); switchView('registerView'); }
  }).catch(err => { alert('連線失敗'); switchView('registerView'); });
});

// ====== 權限路由控制 (儀表板) ======
function setupDashboard(userData) {
  // === 修改歡迎詞格式 ===
  document.getElementById('welcomeMessage').innerText = `您好，${userData.companyName} ${userData.managerName} 先生/小姐`;
  document.getElementById('displayMemberId').innerText = userData.memberId;
  document.getElementById('displayRole').innerText = userData.role;
  
  const buyerPanel = document.getElementById('buyerPanel');
  const sellerPanel = document.getElementById('sellerPanel');
  const advancedAdminPanel = document.getElementById('advancedAdminPanel');

  buyerPanel.style.display = 'block'; 

  if (userData.role === '一般管理員') { 
    sellerPanel.style.display = 'block'; 
    advancedAdminPanel.style.display = 'none';
  } else if (userData.role === '進階管理員') {
    sellerPanel.style.display = 'block'; 
    advancedAdminPanel.style.display = 'block';
  } else { 
    sellerPanel.style.display = 'none'; 
    advancedAdminPanel.style.display = 'none';
  }
}

// ====== 共用工具 ======
function switchView(viewId) { 
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); 
  document.getElementById(viewId).classList.add('active'); 
}

// ====== 會員資料修改 ======
function loadEditProfile() {
  switchView('profileView');
  document.getElementById('editPhone').value = currentProfile.phone || '';
  document.getElementById('editCompany').value = currentProfile.companyName || '';
  document.getElementById('editManager').value = currentProfile.managerName || '';
  document.getElementById('editTaxId').value = currentProfile.taxId || '';
  document.getElementById('editAddress').value = currentProfile.address || '';
}

document.getElementById('profileForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const updateData = { uid: currentUser.uid, phone: document.getElementById('editPhone').value.trim(), companyName: document.getElementById('editCompany').value.trim(), managerName: document.getElementById('editManager').value.trim(), taxId: document.getElementById('editTaxId').value.trim(), address: document.getElementById('editAddress').value.trim() };
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'updateProfile', data: updateData }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      alert('資料修改成功！');
      currentProfile.phone = updateData.phone; currentProfile.companyName = updateData.companyName; currentProfile.managerName = updateData.managerName; currentProfile.taxId = updateData.taxId; currentProfile.address = updateData.address;
      setupDashboard(currentProfile); switchView('dashboardView');
    } else alert('修改失敗：' + result.message);
  }).catch(err => alert('連線失敗'));
});
