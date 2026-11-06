const LIFF_ID = '2012296480-FSAclNbs'; 
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxYx_h3YGtJ7chIJGWSVxFxMmR5rdyAirXF-Uo658iak_UjLOP3j4Z95YWinE5x-emFPg/exec';

let currentUser = { uid: null, displayName: null };
let myOwnProfile = {}; // 紀錄管理員原本的真實身分
let currentProfile = {}; // 目前操作中的身分 (可能是客戶)
let isProxyMode = false; // 是否在代客下單模式
let shoppingCart = []; 
let timeoutTimer;
let currentPickingOrder = ''; let pickingItems = [];
let canvas, ctx, isDrawing = false;

window.onload = function() {
  timeoutTimer = setTimeout(() => { handleTimeout(); }, 8000);
  initializeLiff(); initSignaturePad(); initBarcodeListener();
};

function handleTimeout() { document.getElementById('loadingView').innerHTML = `<h2 style="color: #e74c3c;">連線逾時</h2><p>系統載入超過 8 秒。</p><button class="btn" onclick="location.reload()">重新整理</button>`; }
function clearSysTimeout() { if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; } }

function initializeLiff() {
  liff.init({ liffId: LIFF_ID }).then(() => {
    if (!liff.isLoggedIn()) { clearSysTimeout(); liff.login(); } 
    else {
      liff.getProfile().then(profile => { currentUser.uid = profile.userId; currentUser.displayName = profile.displayName; loginToSystem(); }).catch(err => { clearSysTimeout(); alert('LINE 資料失敗'); });
    }
  }).catch(err => { clearSysTimeout(); alert('LIFF 失敗'); });
}

function loginToSystem() {
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'login', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    clearSysTimeout();
    if (result.status === 'success') {
      if (result.data.isRegistered === false) { switchView('registerView'); } 
      else {
        myOwnProfile = result.data; currentProfile = result.data; 
        setupDashboard(result.data); switchView('dashboardView');
      }
    } else alert('登入錯誤：' + result.message);
  }).catch(err => { clearSysTimeout(); alert('伺服器連線失敗'); });
}

document.getElementById('registerForm').addEventListener('submit', function(e) {
  e.preventDefault(); 
  const regData = { uid: currentUser.uid, phone: document.getElementById('regPhone').value, companyName: document.getElementById('regCompany').value, managerName: document.getElementById('regManager').value, taxId: document.getElementById('regTaxId').value, address: document.getElementById('regAddress').value };
  switchView('loadingView'); document.getElementById('loadingView').innerHTML = `<h2>資料送出中...</h2>`;
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'register', data: regData }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') { alert('註冊成功！'); document.getElementById('loadingView').innerHTML = `<h2>系統載入中...</h2>`; loginToSystem(); } 
    else { alert('註冊失敗：' + result.message); switchView('registerView'); }
  }).catch(err => alert('連線失敗'));
});

function setupDashboard(userData) {
  document.getElementById('welcomeMessage').innerText = `歡迎，${userData.companyName}`;
  document.getElementById('displayMemberId').innerText = userData.memberId;
  document.getElementById('displayRole').innerText = userData.role;
  const adminPanel = document.getElementById('adminPanel');
  if (userData.role === '一般管理員' || userData.role === '進階管理員') { adminPanel.style.display = 'block'; } else { adminPanel.style.display = 'none'; }
}

function switchView(viewId) { document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); document.getElementById(viewId).classList.add('active'); }

// === 代客下單與搜尋 ===
function searchProxyMember() {
  const phone = document.getElementById('proxyPhoneInput').value.trim();
  if(!phone) return alert('請輸入手機號碼');
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'searchMemberByPhone', data: { phone: phone } }) }).then(res=>res.json()).then(result=>{
    if(result.data.found) {
      enterProxyMode(result.data.profile);
    } else {
      document.getElementById('proxyCreateForm').style.display = 'block';
    }
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
  loadProducts();
}
function exitProxyMode() {
  currentProfile = myOwnProfile; isProxyMode = false; shoppingCart = [];
  document.getElementById('proxyBanner').style.display = 'none';
  switchView('dashboardView');
}
function handleReturnFromProducts() {
  if (isProxyMode) exitProxyMode(); else switchView('dashboardView');
}

// === 購物車與下單 ===
function loadProducts() {
  switchView('productListView'); document.getElementById('productContainer').innerHTML = '<p>讀取中...</p>';
  fetch(`${GAS_URL}?action=getProducts`).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      const products = result.data;
      if (products.length === 0) return document.getElementById('productContainer').innerHTML = '<p>尚無商品。</p>';
      let html = '';
      products.forEach(p => {
        html += `<div style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:5px;">
            <h4>${p.name} (SKU: ${p.sku})</h4><p>批發價：$${p.price || 0} | 庫存：${p.availableQty || 0}</p>
            <button class="btn" style="padding:5px; margin-top:5px;" onclick="addToCart('${p.sku}', '${p.name}', ${p.price})">加入購物車</button></div>`;
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
    container.innerHTML = '<p>空</p>'; document.getElementById('cartTotal').innerText = '0';
    document.getElementById('submitOrderBtn').disabled = true; document.getElementById('signatureSection').style.display = 'none'; return;
  }
  document.getElementById('submitOrderBtn').disabled = false; document.getElementById('signatureSection').style.display = 'block';
  let html = '', total = 0;
  shoppingCart.forEach((item, index) => {
    const sub = item.price * item.qty; total += sub;
    html += `<div style="border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:10px;">
        <strong>${item.name}</strong><br>單價:$${item.price} | 數量:${item.qty} | 小計:$${sub}
        <button onclick="shoppingCart.splice(${index}, 1); showCart(); updateCartBtn();" style="background:#e74c3c; color:white; border:none; padding:2px 8px; float:right;">刪除</button></div>`;
  });
  container.innerHTML = html; document.getElementById('cartTotal').innerText = total; setTimeout(resizeCanvas, 100); 
}
function submitOrder() {
  if (shoppingCart.length === 0) return;
  const isCanvasBlank = !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0);
  if (isCanvasBlank) return alert('請簽名確認訂單！');
  const orderData = {
    uid: currentUser.uid, memberId: currentProfile.memberId, companyName: currentProfile.companyName, managerName: currentProfile.managerName,
    items: shoppingCart, totalAmount: shoppingCart.reduce((sum, item) => sum + (item.price * item.qty), 0), signature: canvas.toDataURL('image/png') 
  };
  document.getElementById('submitOrderBtn').innerText = '送出中...'; document.getElementById('submitOrderBtn').disabled = true;
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'submitOrder', data: orderData }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      alert(result.data.message); shoppingCart = []; clearSignature();
      if(isProxyMode) exitProxyMode(); else switchView('dashboardView');
    } else alert('下單失敗：' + result.message);
  }).finally(() => { document.getElementById('submitOrderBtn').innerText = '確認送出訂單'; document.getElementById('submitOrderBtn').disabled = false; });
}

// 簽名板功能
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
  ctx.scale(ratio, ratio); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#2c3e50';
}

// === 管理員接單與異常專區 ===
function loadAdminOrders() {
  switchView('adminOrderView'); document.getElementById('adminOrderContainer').innerHTML = '<p>讀取中...</p>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getAdminOrders', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      if (result.data.length === 0) return document.getElementById('adminOrderContainer').innerHTML = '<p>無待審核訂單。</p>';
      let html = '';
      result.data.forEach(o => {
        let itemsHtml = o.items.map(i => `${i.name} x${i.qty}`).join('<br>');
        html += `<div class="order-card"><h4>單號: ${o.orderId}</h4><p>買方：${o.companyName}</p><p>金額：$${o.totalAmount}</p><p>明細：<br>${itemsHtml}</p><button class="btn admin-btn" onclick="approveOrder('${o.orderId}')">✅ 核准轉入理貨</button></div>`;
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
  switchView('anomalyOrderView'); document.getElementById('anomalyOrderContainer').innerHTML = '<p>讀取異常清單中...</p>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getAnomalyOrders', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      if (result.data.length === 0) return document.getElementById('anomalyOrderContainer').innerHTML = '<p>目前無異常訂單。</p>';
      let html = '';
      result.data.forEach(o => {
        html += `<div class="order-card" style="border-left: 4px solid #c0392b;">
          <h4>單號: ${o.orderId}</h4><p>買方：${o.companyName}</p>
          <p style="color:#e74c3c;"><strong>異常備註：</strong><br>${o.remarks}</p>
          <button class="btn primary-btn" style="background:#e74c3c;" onclick="forceShipAnomaly('${o.orderId}')">⚠️ 發貨警示：確認強制出貨並結案</button>
        </div>`;
      });
      document.getElementById('anomalyOrderContainer').innerHTML = html;
    }
  });
}
function forceShipAnomaly(orderId) {
  if(!confirm(`【發貨警示】\n此單有缺貨異常，確認要照常發貨並結案嗎？\n(缺貨紀錄將保留在資料庫備註中)`)) return;
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'forceShipAnomalyOrder', data: { uid: currentUser.uid, orderId: orderId } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') { alert('已標記強制出貨！'); loadAnomalyOrders(); } 
  });
}

// === 掃碼理貨邏輯 ===
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
    html += `<div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 5px; background: ${isDone ? '#d4efdf' : '#fff'};">
        <strong style="font-size: 16px;">${item.name}</strong><br>
        應撿：<strong>${item.targetQty}</strong> | 實撿：<strong style="color:${isDone?'#27ae60':'#e74c3c'};">${item.actualQty}</strong>
        <button onclick="manualAdjustQty(${index}, 1)">+1</button> <button onclick="manualAdjustQty(${index}, -1)">-1</button>
      </div>`;
  });
  document.getElementById('pickingListContainer').innerHTML = html;
}
function initBarcodeListener() {
  const listener = document.getElementById('barcodeListener');
  listener.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') { const barcode = this.value.trim(); this.value = ''; if(barcode) processScannedBarcode(barcode); }
  });
  document.getElementById('pickingProcessView').addEventListener('click', () => listener.focus());
}
function processScannedBarcode(barcode) {
  let found = false;
  for (let i = 0; i < pickingItems.length; i++) {
    if (pickingItems[i].barcode === barcode || pickingItems[i].sku === barcode) { pickingItems[i].actualQty += 1; found = true; break; }
  }
  if (found) renderPickingList(); else alert(`❌ 警告：此訂單不需要條碼為 [${barcode}] 的商品！`);
}
function manualAdjustQty(index, amount) {
  pickingItems[index].actualQty += amount; if (pickingItems[index].actualQty < 0) pickingItems[index].actualQty = 0;
  renderPickingList(); document.getElementById('barcodeListener').focus(); 
}
function submitPickingFinal() {
  // === 新增：異常防呆與手動確認邏輯 ===
  let hasShortage = false;
  for(let item of pickingItems) { if(item.actualQty < item.targetQty) hasShortage = true; }
  
  if (hasShortage) {
    const isAnomalyConfirmed = confirm('⚠️ 檢測到少撿貨！\n請確認是否為「缺貨/異常」？\n\n點擊【確定】：確認異常，進入缺貨異常專區。\n點擊【取消】：返回繼續理貨。');
    if (!isAnomalyConfirmed) return; // 點擊取消，中斷送出，讓員工繼續理貨
  } else {
    const isConfirm = confirm('實撿數量正確，確定要完成理貨並送出結果嗎？');
    if(!isConfirm) return;
  }
  
  document.getElementById('submitPickingBtn').innerText = '資料上傳中...'; document.getElementById('submitPickingBtn').disabled = true;
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'submitPickingResult', data: { uid: currentUser.uid, orderId: currentPickingOrder, results: pickingItems } }) })
  .then(res => res.json()).then(result => {
    if (result.status === 'success') { alert(result.data.message); switchView('dashboardView'); } 
  }).finally(() => {
    document.getElementById('submitPickingBtn').innerText = '確認並完成理貨'; document.getElementById('submitPickingBtn').disabled = false;
  });
}
