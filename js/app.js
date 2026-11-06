const LIFF_ID = '2012296480-FSAclNbs'; 
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxYx_h3YGtJ7chIJGWSVxFxMmR5rdyAirXF-Uo658iak_UjLOP3j4Z95YWinE5x-emFPg/exec';

let currentUser = { uid: null, displayName: null };
let myOwnProfile = {}; 
let currentProfile = {}; 
let isProxyMode = false; 
let shoppingCart = []; 
let timeoutTimer;
let currentPickingOrder = ''; let pickingItems = [];
let canvas, ctx, isDrawing = false;

window.onload = function() {
  timeoutTimer = setTimeout(() => { handleTimeout(); }, 8000);
  initializeLiff(); initSignaturePad(); initBarcodeListener();
};

function handleTimeout() { document.getElementById('loadingView').innerHTML = `<h2 style="color: #D47C7C;">連線逾時</h2><p style="text-align:center; color:#8C7A6B;">系統載入超過 8 秒，請檢查網路連線。</p><button class="btn primary-btn" onclick="location.reload()">重新整理</button>`; }
function clearSysTimeout() { if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; } }

function initializeLiff() {
  liff.init({ liffId: LIFF_ID }).then(() => {
    if (!liff.isLoggedIn()) { clearSysTimeout(); liff.login(); } 
    else {
      liff.getProfile().then(profile => { currentUser.uid = profile.userId; currentUser.displayName = profile.displayName; loginToSystem(); }).catch(err => { clearSysTimeout(); alert('LINE 資料獲取失敗，請重新整理'); });
    }
  }).catch(err => { clearSysTimeout(); alert('系統初始化失敗，請聯絡管理員'); });
}

function loginToSystem() {
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'login', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    clearSysTimeout();
    if (result.status === 'success') {
      // === 核心防呆邏輯：只要查無資料，強制跳轉註冊表單 ===
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
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'updateProfile', data: updateData }) })
  .then(res => res.json()).then(result => {
    if (result.status === 'success') {
      alert('資料修改成功！');
      currentProfile.phone = updateData.phone; currentProfile.companyName = updateData.companyName; currentProfile.managerName = updateData.managerName; currentProfile.taxId = updateData.taxId; currentProfile.address = updateData.address;
      setupDashboard(currentProfile); switchView('dashboardView');
    } else alert('修改失敗：' + result.message);
  }).catch(err => alert('連線失敗'));
});

function setupDashboard(userData) {
  document.getElementById('welcomeMessage').innerText = `您好，${userData.companyName}`;
  document.getElementById('displayMemberId').innerText = userData.memberId;
  document.getElementById('displayRole').innerText = userData.role;
  const adminPanel = document.getElementById('adminPanel');
  const advancedAdminPanel = document.getElementById('advancedAdminPanel');
  if (userData.role === '一般管理員' || userData.role === '進階管理員') { 
    adminPanel.style.display = 'block'; 
    if (userData.role === '進階管理員') advancedAdminPanel.style.display = 'block';
  } else { 
    adminPanel.style.display = 'none'; advancedAdminPanel.style.display = 'none';
  }
}

function switchView(viewId) { document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); document.getElementById(viewId).classList.add('active'); }

function searchProxyMember() {
  const phone = document.getElementById('proxyPhoneInput').value.trim();
  if(!phone) return alert('請輸入手機號碼');
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'searchMemberByPhone', data: { phone: phone } }) }).then(res=>res.json()).then(result=>{
    if(result.data.found) { enterProxyMode(result.data.profile); } else { document.getElementById('proxyCreateForm').style.display = 'block'; }
  });
}
function createProxyMember() {
  const phone = document.getElementById('proxyPhoneInput').value.trim();
  const company = document.getElementById('proxyRegCompany').value.trim();
  const manager = document.getElementById('proxyRegManager').value.trim();
  if(!company || !manager) return alert('請填寫公司與負責人');
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'adminCreateMember', data: { phone: phone, companyName: company, managerName: manager } }) }).then(res=>res.json()).then(result=>{
    if(result.data.success) { enterProxyMode(result.data.profile); }
  });
}
function enterProxyMode(profile) {
  currentProfile = profile; isProxyMode = true; shoppingCart = [];
  document.getElementById('proxyBanner').style.display = 'block';
  document.getElementById('proxyClientName').innerText = profile.companyName;
  document.getElementById('proxyCreateForm').style.display = 'none';
  switchView('dashboardView'); 
}
function exitProxyMode() {
  currentProfile = myOwnProfile; isProxyMode = false; shoppingCart = [];
  document.getElementById('proxyBanner').style.display = 'none';
  switchView('dashboardView');
}
function handleReturnFromProducts() { if (isProxyMode) switchView('dashboardView'); else switchView('dashboardView'); }

function loadBuyerOrders() {
  switchView('buyerOrderHistoryView');
  const container = document.getElementById('buyerOrderContainer');
  container.innerHTML = '<p style="text-align:center; color:#8C7A6B;">讀取紀錄中...</p>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getBuyerOrders', data: { memberId: currentProfile.memberId } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      const orders = result.data;
      if (orders.length === 0) return container.innerHTML = '<p style="text-align:center;">尚無採購紀錄。</p>';
      let html = '';
      orders.forEach(o => {
        let itemsHtml = o.items.map(i => `${i.name} x${i.qty}`).join('<br>');
        let statusColor = o.status.includes('異常') ? '#D47C7C' : (o.status.includes('完成') ? '#799C76' : '#C19A6B');
        html += `<div class="order-card" style="border-left-color: ${statusColor};">
          <h4>單號: ${o.orderId}</h4>
          <p><strong>時間：</strong>${new Date(o.time).toLocaleString()}</p>
          <p><strong>狀態：</strong><span style="color: ${statusColor}; font-weight: bold;">${o.status}</span></p>
          <p><strong>金額：</strong>$${o.totalAmount}</p>
          <div style="background:#FFF; padding: 12px; font-size: 14px; margin: 12px 0; border-radius: 8px; border: 1px solid #E8DED1;"><strong>採購明細：</strong><br>${itemsHtml}</div>
          <div style="text-align:center; padding-top:10px; border-top: 1px dashed #E8DED1;"><img src="${o.signature}" style="max-height: 50px;"></div>
        </div>`;
      });
      container.innerHTML = html;
    } else container.innerHTML = `<p style="text-align:center; color:#D47C7C;">讀取失敗</p>`;
  });
}

function loadProducts() {
  switchView('productListView'); document.getElementById('productContainer').innerHTML = '<p style="text-align:center; color:#8C7A6B;">讀取中...</p>';
  fetch(`${GAS_URL}?action=getProducts`).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      const products = result.data;
      if (products.length === 0) return document.getElementById('productContainer').innerHTML = '<p style="text-align:center;">尚無商品。</p>';
      let html = '';
      products.forEach(p => {
        let catBadge = p.category ? `<span class="badge" style="background:#A38C75; margin-right:6px;">${p.category}</span>` : '';
        let imgHtml = p.imageUrl ? `<img src="${p.imageUrl}" class="product-img" alt="${p.name}">` : `<div class="empty-img">暫無圖片</div>`;
        html += `<div class="product-card">
            ${imgHtml}
            <h4 style="margin: 8px 0; text-align:left;">${catBadge}${p.name}</h4>
            <p style="font-size:13px; color:#8C7A6B; margin:4px 0;">SKU: ${p.sku}</p>
            <p class="product-desc">${p.description || '無詳細描述'}</p>
            <p style="font-weight:700; color:#8B6B4A; font-size:16px;">批發價：$${p.price || 0} <span style="font-size:13px; font-weight:normal; color:#8C7A6B;">| 庫存：${p.availableQty || 0}</span></p>
            <button class="btn primary-btn" style="padding:10px; margin-top:12px;" onclick="addToCart('${p.sku}', '${p.name}', ${p.price})">加入購物車</button>
          </div>`;
      });
      document.getElementById('productContainer').innerHTML = html; updateCartBtn();
    }
  });
}
function addToCart(sku, name, price) {
  const item = shoppingCart.find(i => i.sku === sku);
  if (item) item.qty += 1; else shoppingCart.push({ sku: sku, name: name, price: price, qty: 1 });
  updateCartBtn(); alert(`${name} 已加入`);
}
function updateCartBtn() { document.getElementById('viewCartBtn').innerText = `查看購物車 (${shoppingCart.reduce((s, i) => s + i.qty, 0)})`; }
function showCart() {
  switchView('cartView'); const container = document.getElementById('cartContainer');
  if (shoppingCart.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#8C7A6B;">購物車目前是空的</p>'; document.getElementById('cartTotal').innerText = '0';
    document.getElementById('submitOrderBtn').disabled = true; document.getElementById('signatureSection').style.display = 'none'; return;
  }
  document.getElementById('submitOrderBtn').disabled = false; document.getElementById('signatureSection').style.display = 'block';
  let html = '', total = 0;
  shoppingCart.forEach((item, index) => {
    const sub = item.price * item.qty; total += sub;
    html += `<div style="border-bottom:1px solid #E8DED1; padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <div><strong style="color:#4A4036;">${item.name}</strong><br><span style="font-size:14px; color:#8C7A6B;">單價:$${item.price} | 數量:${item.qty}</span></div>
        <div style="text-align:right;"><div style="font-weight:bold; margin-bottom:5px;">$${sub}</div><button onclick="shoppingCart.splice(${index}, 1); showCart(); updateCartBtn();" style="background:#FFF; color:#D47C7C; border:1px solid #D47C7C; padding:4px 10px; border-radius:4px; cursor:pointer;">刪除</button></div>
      </div>`;
  });
  container.innerHTML = html; document.getElementById('cartTotal').innerText = total; setTimeout(resizeCanvas, 100); 
}
function submitOrder() {
  if (shoppingCart.length === 0) return;
  const isCanvasBlank = !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0);
  if (isCanvasBlank) return alert('請在下方框內簽名確認訂單！');
  const orderData = {
    uid: currentUser.uid, memberId: currentProfile.memberId, companyName: currentProfile.companyName, managerName: currentProfile.managerName,
    items: shoppingCart, totalAmount: shoppingCart.reduce((sum, item) => sum + (item.price * item.qty), 0), signature: canvas.toDataURL('image/png') 
  };
  document.getElementById('submitOrderBtn').innerText = '訂單處理中...'; document.getElementById('submitOrderBtn').disabled = true;
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'submitOrder', data: orderData }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      alert(result.data.message); shoppingCart = []; clearSignature();
      if(isProxyMode) exitProxyMode(); else switchView('dashboardView');
    } else alert('下單失敗：' + result.message);
  }).finally(() => { document.getElementById('submitOrderBtn').innerText = '確認送出訂單'; document.getElementById('submitOrderBtn').disabled = false; });
}

function initSignaturePad() {
  canvas = document.getElementById('signatureCanvas'); ctx = canvas.getContext('2d');
  canvas.addEventListener('mousedown', e => { isDrawing = true; drawStart(e.offsetX, e.offsetY); });
  canvas.addEventListener('mousemove', e => { if(isDrawing) drawMove(e.offsetX, e.offsetY); });
  canvas.addEventListener('mouseup', () => isDrawing = false);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); isDrawing = true; const rect = canvas.getBoundingClientRect(); drawStart(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top); }, {passive: false});
  canvas.addEventListener('touchmove', e => { e.preventDefault(); if(isDrawing){ const rect = canvas.getBoundingClientRect(); drawMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top); } }, {passive: false});
  canvas.addEventListener('touchend', () => isDrawing = false);
}
function drawStart(x, y) { ctx.beginPath(); ctx.moveTo(x, y); }
function drawMove(x, y) { ctx.lineTo(x, y); ctx.stroke(); }
function clearSignature() { ctx.clearRect(0, 0, canvas.width, canvas.height); }
function resizeCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1); canvas.width = canvas.offsetWidth * ratio; canvas.height = canvas.offsetHeight * ratio;
  ctx.scale(ratio, ratio); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#4A4036';
}

function loadAdminOrders() {
  switchView('adminOrderView'); document.getElementById('adminOrderContainer').innerHTML = '<p style="text-align:center; color:#8C7A6B;">讀取中...</p>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getAdminOrders', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      if (result.data.length === 0) return document.getElementById('adminOrderContainer').innerHTML = '<p style="text-align:center;">目前無待審核訂單。</p>';
      let html = '';
      result.data.forEach(o => {
        let itemsHtml = o.items.map(i => `${i.name} x${i.qty}`).join('<br>');
        html += `<div class="order-card"><h4>單號: ${o.orderId}</h4><p>買方：${o.companyName}</p><p>金額：$${o.totalAmount}</p><p>明細：<br>${itemsHtml}</p><button class="btn admin-btn" onclick="approveOrder('${o.orderId}')">核准轉入理貨</button></div>`;
      });
      document.getElementById('adminOrderContainer').innerHTML = html;
    }
  });
}
function approveOrder(orderId) {
  if(!confirm(`確定核准 ${orderId} 嗎？`)) return;
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'approveOrder', data: { uid: currentUser.uid, orderId: orderId } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') { alert('核准成功！'); loadAdminOrders(); } 
  });
}
function loadAnomalyOrders() {
  switchView('anomalyOrderView'); document.getElementById('anomalyOrderContainer').innerHTML = '<p style="text-align:center; color:#8C7A6B;">讀取異常清單中...</p>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getAnomalyOrders', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      if (result.data.length === 0) return document.getElementById('anomalyOrderContainer').innerHTML = '<p style="text-align:center;">目前無異常訂單。</p>';
      let html = '';
      result.data.forEach(o => {
        html += `<div class="order-card" style="border-left-color: #D47C7C;">
          <h4>單號: ${o.orderId}</h4><p>買方：${o.companyName}</p><p style="color:#D47C7C;"><strong>異常備註：</strong><br>${o.remarks}</p>
          <button class="btn admin-btn-danger" onclick="forceShipAnomaly('${o.orderId}')">確認強制出貨並結案</button></div>`;
      });
      document.getElementById('anomalyOrderContainer').innerHTML = html;
    }
  });
}
function forceShipAnomaly(orderId) {
  if(!confirm(`確認要照常發貨並結案嗎？`)) return;
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'forceShipAnomalyOrder', data: { uid: currentUser.uid, orderId: orderId } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') { alert('已標記強制出貨！'); loadAnomalyOrders(); } 
  });
}

function showEnterPickingOrder() { switchView('enterPickingOrderView'); document.getElementById('targetOrderIdInput').value = ''; }
function startPicking() {
  const orderId = document.getElementById('targetOrderIdInput').value.trim();
  if(!orderId) return alert('請輸入單號');
  document.getElementById('targetOrderIdInput').value = '讀取明細中...';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getPickingList', data: { uid: currentUser.uid, orderId: orderId } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      currentPickingOrder = result.data.orderId; pickingItems = result.data.items; renderPickingList(); switchView('pickingProcessView');
      setTimeout(() => document.getElementById('barcodeListener').focus(), 500);
    } else { alert(result.message); document.getElementById('targetOrderIdInput').value = ''; }
  });
}
function renderPickingList() {
  document.getElementById('pickingOrderIdText').innerText = currentPickingOrder;
  let html = '';
  pickingItems.forEach((item, index) => {
    const isDone = item.actualQty >= item.targetQty;
    html += `<div style="border: 1px solid #E8DED1; padding: 15px; margin-bottom: 12px; border-radius: 8px; background: ${isDone ? '#F2F6F1' : '#FFF'}; box-shadow: var(--shadow-card);">
        <strong style="font-size: 16px; color:#4A4036;">${item.name}</strong><br>
        <div style="margin:8px 0; color:#8C7A6B;">應撿：<strong>${item.targetQty}</strong> | 實撿：<strong style="color:${isDone?'#799C76':'#D47C7C'}; font-size:18px;">${item.actualQty}</strong></div>
        <button class="btn" style="display:inline-block; width:auto; padding:6px 15px; margin-right:5px; background:#A38C75;" onclick="manualAdjustQty(${index}, 1)">+1</button> 
        <button class="btn" style="display:inline-block; width:auto; padding:6px 15px; background:#E8DED1; color:#4A4036;" onclick="manualAdjustQty(${index}, -1)">-1</button>
      </div>`;
  });
  document.getElementById('pickingListContainer').innerHTML = html;
}
function initBarcodeListener() {
  const listener = document.getElementById('barcodeListener');
  listener.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') { const barcode = this.value.trim(); this.value = ''; if(barcode) processScannedBarcode(barcode); }
  });
  document.getElementById('pickingProcessView').addEventListener('click', () => { if(window.getSelection().toString() === '') listener.focus(); });
}
function processScannedBarcode(barcode) {
  let found = false;
  for (let i = 0; i < pickingItems.length; i++) {
    if (pickingItems[i].barcode === barcode || pickingItems[i].sku === barcode) { pickingItems[i].actualQty += 1; found = true; break; }
  }
  if (found) renderPickingList(); else alert(`❌ 此訂單不需要條碼為 [${barcode}] 的商品！`);
}
function manualAdjustQty(index, amount) {
  pickingItems[index].actualQty += amount; if (pickingItems[index].actualQty < 0) pickingItems[index].actualQty = 0;
  renderPickingList(); document.getElementById('barcodeListener').focus(); 
}
function submitPickingFinal() {
  let hasShortage = false;
  for(let item of pickingItems) { if(item.actualQty < item.targetQty) hasShortage = true; }
  if (hasShortage) {
    if (!confirm('⚠️ 檢測到少撿貨！\n確認為「缺貨/異常」並送出嗎？')) return; 
  } else {
    if(!confirm('確定要完成理貨並送出結果嗎？')) return;
  }
  document.getElementById('submitPickingBtn').innerText = '資料上傳中...'; document.getElementById('submitPickingBtn').disabled = true;
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'submitPickingResult', data: { uid: currentUser.uid, orderId: currentPickingOrder, results: pickingItems } }) })
  .then(res => res.json()).then(result => {
    if (result.status === 'success') { alert(result.data.message); switchView('dashboardView'); } 
  }).finally(() => { document.getElementById('submitPickingBtn').innerText = '確認並完成理貨'; document.getElementById('submitPickingBtn').disabled = false; });
}

function loadAdminCategories() {
  switchView('adminCategoryView'); document.getElementById('adminCategoryContainer').innerHTML = '<p style="text-align:center;">讀取清單中...</p>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getAdminCategories', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      if (result.data.length === 0) return document.getElementById('adminCategoryContainer').innerHTML = '<p style="text-align:center;">尚無分類資料。</p>';
      let html = '';
      result.data.forEach(c => {
        let statusColor = (c.status === '啟用' || c.status === '上架') ? '#799C76' : '#8C7A6B';
        let actionText = (c.status === '啟用' || c.status === '上架') ? '停用' : '啟用';
        html += `<div class="order-card" style="border-left-color: ${statusColor};">
          <h4>${c.name}</h4><p><strong>狀態:</strong> <span style="color:${statusColor}; font-weight:bold;">${c.status}</span></p>
          <button class="btn" style="background:#E8DED1; color:#4A4036; padding:8px; margin-top:10px;" onclick="toggleCategoryStatus('${c.id}')">切換為${actionText}</button>
        </div>`;
      });
      document.getElementById('adminCategoryContainer').innerHTML = html;
    }
  });
}
document.getElementById('newCategoryForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const catData = { uid: currentUser.uid, name: document.getElementById('ncName').value.trim(), note: document.getElementById('ncNote').value.trim() };
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'addCategory', data: catData }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') { alert('分類新增成功！'); document.getElementById('newCategoryForm').reset(); loadAdminCategories(); } 
  });
});
function toggleCategoryStatus(categoryId) {
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'toggleCategoryStatus', data: { uid: currentUser.uid, categoryId: categoryId } }) }).then(res => res.json()).then(result => { if (result.status === 'success') loadAdminCategories(); });
}

function fetchCategories() {
  const selectElement = document.getElementById('npCategory');
  selectElement.innerHTML = '<option value="">讀取分類中...</option>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getCategories' }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      let options = '<option value="">無分類</option>';
      result.data.forEach(c => { options += `<option value="${c.name}">${c.name}</option>`; });
      selectElement.innerHTML = options;
    }
  });
}

function loadAdminProducts() {
  switchView('adminProductView'); fetchCategories(); 
  document.getElementById('adminProductContainer').innerHTML = '<p style="text-align:center;">讀取清單中...</p>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getAdminInventoryList', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      if (result.data.length === 0) return document.getElementById('adminProductContainer').innerHTML = '<p style="text-align:center;">尚無商品資料。</p>';
      let html = '';
      result.data.forEach(p => {
        let statusColor = (p.status === '上架' || p.status === '啟用') ? '#799C76' : '#8C7A6B';
        let actionText = (p.status === '上架' || p.status === '啟用') ? '下架' : '重新上架';
        let catBadge = p.category ? `<span class="badge" style="background:#A38C75;">${p.category}</span> ` : '';
        html += `<div class="order-card" style="border-left-color: ${statusColor};">
          <h4>${catBadge}${p.name}</h4><p>SKU: ${p.sku}</p><p>批發價: $${p.price} | 庫存: ${p.actualStock}</p>
          <p>狀態: <span style="color:${statusColor}; font-weight:bold;">${p.status}</span></p>
          <button class="btn" style="background:#E8DED1; color:#4A4036; padding:8px; margin-top:10px;" onclick="toggleProductStatus('${p.sku}')">${actionText}</button>
        </div>`;
      });
      document.getElementById('adminProductContainer').innerHTML = html;
    }
  });
}
document.getElementById('newProductForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const productData = {
    uid: currentUser.uid, name: document.getElementById('npName').value.trim(), desc: document.getElementById('npDesc').value.trim(),
    sku: document.getElementById('npSku').value.trim(), barcode: document.getElementById('npBarcode').value.trim(),
    category: document.getElementById('npCategory').value, price: document.getElementById('npPrice').value,
    safeStock: document.getElementById('npSafeStock').value, imageUrl: document.getElementById('npImage').value.trim()
  };
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'addAdminProduct', data: productData }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') { alert('商品新增成功！'); document.getElementById('newProductForm').reset(); loadAdminProducts(); } 
  });
});
function toggleProductStatus(sku) {
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'toggleProductStatus', data: { uid: currentUser.uid, sku: sku } }) }).then(res => res.json()).then(result => { if (result.status === 'success') loadAdminProducts(); });
}
