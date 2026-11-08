// js/seller.js - 處理門市銷售、接單理貨、異常防呆、與代客操作

// === 移入並更新：代客操作模組 (門市人員共用) ===
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
  const taxId = document.getElementById('proxyRegTaxId').value.trim(); // 接收統編
  const address = document.getElementById('proxyRegAddress').value.trim(); // 接收地址
  if(!company || !manager) return alert('請填寫公司與負責人');
  
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'adminCreateMember', data: { phone: phone, companyName: company, managerName: manager, taxId: taxId, address: address } }) }).then(res=>res.json()).then(result=>{
    if(result.data.success) { enterProxyMode(result.data.profile); }
  });
}
function enterProxyMode(profile) {
  currentProfile = profile; isProxyMode = true; shoppingCart = [];
  document.getElementById('proxyBanner').style.display = 'block'; document.getElementById('proxyClientName').innerText = profile.companyName;
  document.getElementById('proxyCreateForm').style.display = 'none'; switchView('dashboardView'); 
}
function exitProxyMode() {
  currentProfile = myOwnProfile; isProxyMode = false; shoppingCart = [];
  document.getElementById('proxyBanner').style.display = 'none'; switchView('dashboardView');
}

// === 原理貨與接單邏輯 ===
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
