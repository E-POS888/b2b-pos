// js/admin.js - 處理代客操作、類別管理、商品管理

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

// 類別管理
function loadAdminCategories() {
  switchView('adminCategoryView'); document.getElementById('adminCategoryContainer').innerHTML = '<p style="text-align:center; color:#8C7A6B;">讀取清單中...</p>';
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

// 商品管理
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
  document.getElementById('adminProductContainer').innerHTML = '<p style="text-align:center; color:#8C7A6B;">讀取清單中...</p>';
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
