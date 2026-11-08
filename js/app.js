const LIFF_ID = '2012296480-FSAclNbs'; 
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxYx_h3YGtJ7chIJGWSVxFxMmR5rdyAirXF-Uo658iak_UjLOP3j4Z95YWinE5x-emFPg/exec';

let currentUser = { uid: null, displayName: null };
let myOwnProfile = {}; let currentProfile = {}; let isProxyMode = false; let timeoutTimer;
let shoppingCart = []; let currentPickingOrder = ''; let pickingItems = []; let canvas, ctx, isDrawing = false;

window.onload = function() {
  timeoutTimer = setTimeout(() => { handleTimeout(); }, 8000);
  initializeLiff(); 
  if(typeof initSignaturePad === 'function') initSignaturePad(); 
  if(typeof initBarcodeListener === 'function') initBarcodeListener();
};
function handleTimeout() { document.getElementById('loadingView').innerHTML = `<h2 style="color: #D47C7C;">連線逾時</h2><button class="btn primary-btn" onclick="location.reload()">重新整理</button>`; }
function clearSysTimeout() { if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; } }

function initializeLiff() {
  liff.init({ liffId: LIFF_ID }).then(() => {
    if (!liff.isLoggedIn()) { clearSysTimeout(); liff.login(); } 
    else { liff.getProfile().then(p => { currentUser.uid = p.userId; loginToSystem(); }).catch(err => { clearSysTimeout(); alert('LINE 登入失敗'); }); }
  }).catch(err => { clearSysTimeout(); alert('LIFF 失敗'); });
}

function loginToSystem() {
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'login', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    clearSysTimeout();
    if (result.status === 'success') {
      if (result.data.isRegistered === false) { switchView('registerView'); } 
      else { myOwnProfile = result.data; currentProfile = result.data; setupDashboard(result.data); switchView('dashboardView'); }
    } else alert('登入異常：' + result.message);
  }).catch(err => { clearSysTimeout(); alert('連線失敗'); });
}

document.getElementById('registerForm').addEventListener('submit', function(e) {
  e.preventDefault(); 
  const regData = { uid: currentUser.uid, phone: document.getElementById('regPhone').value, companyName: document.getElementById('regCompany').value, managerName: document.getElementById('regManager').value, taxId: document.getElementById('regTaxId').value, address: document.getElementById('regAddress').value };
  switchView('loadingView'); document.getElementById('loadingView').innerHTML = `<h2>資料建檔中</h2>`;
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'register', data: regData }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') { alert('建檔成功！'); loginToSystem(); } else { alert('註冊失敗：' + result.message); switchView('registerView'); }
  }).catch(err => { alert('連線失敗'); switchView('registerView'); });
});

function setupDashboard(userData) {
  // 修改歡迎詞
  document.getElementById('welcomeMessage').innerText = `您好，${userData.companyName} ${userData.managerName} 先生/小姐`;
  document.getElementById('displayMemberId').innerText = userData.memberId;
  document.getElementById('displayRole').innerText = userData.role;
  // 新增等級顯示
  document.getElementById('displayMemberLevel').innerText = userData.memberLevel || '一般會員';
  
  document.getElementById('buyerPanel').style.display = 'block'; 
  if (userData.role === '一般管理員') { 
    document.getElementById('sellerPanel').style.display = 'block'; document.getElementById('advancedAdminPanel').style.display = 'none';
  } else if (userData.role === '進階管理員') {
    document.getElementById('sellerPanel').style.display = 'block'; document.getElementById('advancedAdminPanel').style.display = 'block';
  } else { 
    document.getElementById('sellerPanel').style.display = 'none'; document.getElementById('advancedAdminPanel').style.display = 'none';
  }
}
function switchView(viewId) { document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); document.getElementById(viewId).classList.add('active'); }

function loadEditProfile() {
  switchView('profileView');
  document.getElementById('editPhone').value = currentProfile.phone || ''; document.getElementById('editCompany').value = currentProfile.companyName || ''; document.getElementById('editManager').value = currentProfile.managerName || ''; document.getElementById('editTaxId').value = currentProfile.taxId || ''; document.getElementById('editAddress').value = currentProfile.address || '';
}
document.getElementById('profileForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const updateData = { uid: currentUser.uid, phone: document.getElementById('editPhone').value.trim(), companyName: document.getElementById('editCompany').value.trim(), managerName: document.getElementById('editManager').value.trim(), taxId: document.getElementById('editTaxId').value.trim(), address: document.getElementById('editAddress').value.trim() };
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'updateProfile', data: updateData }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      alert('資料修改成功！'); currentProfile.phone = updateData.phone; currentProfile.companyName = updateData.companyName; currentProfile.managerName = updateData.managerName; currentProfile.taxId = updateData.taxId; currentProfile.address = updateData.address;
      setupDashboard(currentProfile); switchView('dashboardView');
    } else alert('修改失敗');
  });
});
