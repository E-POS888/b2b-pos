// js/admin.js - 處理進階管理員專屬功能：類別管理、商品管理、會員權限、與系統日誌

// === 會員與權限管理 ===
function loadAdminMembers() {
  switchView('adminMemberView');
  document.getElementById('adminMemberContainer').innerHTML = '<p style="text-align:center;">讀取會員資料中...</p>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getAdminMembers', data: { uid: currentUser.uid } }) })
  .then(res => res.json()).then(result => {
    if (result.status === 'success') {
      let html = '';
      result.data.forEach((m, index) => {
        html += `<div class="order-card" style="border-left-color:#3498db; background:#FCFBF9;">
          <h4>${m.company} (${m.manager})</h4><p style="font-size:14px; color:#8C7A6B;">手機/編號: ${m.phone}</p>
          <div style="display:flex; gap:10px; margin-top:10px;">
            <div style="flex:1;">
              <label style="margin-top:0;">系統權限</label>
              <select id="role_${index}">
                <option value="買方" ${m.role==='買方'?'selected':''}>買方</option>
                <option value="一般管理員" ${m.role==='一般管理員'?'selected':''}>一般管理員</option>
                <option value="進階管理員" ${m.role==='進階管理員'?'selected':''}>進階管理員</option>
              </select>
            </div>
            <div style="flex:1;">
              <label style="margin-top:0;">會員等級</label>
              <select id="level_${index}">
                <option value="一般會員" ${m.level==='一般會員'?'selected':''}>一般會員</option>
                <option value="VIP會員" ${m.level==='VIP會員'?'selected':''}>VIP會員</option>
                <option value="VVIP會員" ${m.level==='VVIP會員'?'selected':''}>VVIP會員</option>
              </select>
            </div>
          </div>
          <button class="btn primary-btn" style="padding:8px; margin-top:10px;" onclick="saveMemberUpdate('${m.phone}', 'role_${index}', 'level_${index}')">儲存變更</button>
        </div>`;
      });
      document.getElementById('adminMemberContainer').innerHTML = html;
    }
  });
}

function saveMemberUpdate(targetPhone, roleSelectId, levelSelectId) {
  const newRole = document.getElementById(roleSelectId).value;
  const newLevel = document.getElementById(levelSelectId).value;
  fetch(GAS_URL, { 
    method: 'POST', body: JSON.stringify({ action: 'updateMemberRoleAndLevel', data: { uid: currentUser.uid, targetPhone: targetPhone, newRole: newRole, newLevel: newLevel } }) 
  }).then(res => res.json()).then(result => {
    if (result.status === 'success') { alert('更新成功！'); loadAdminMembers(); } else { alert('更新失敗'); }
  });
}

// === 類別管理與編輯 ===
function loadAdminCategories() {
  switchView('adminCategoryView'); document.getElementById('adminCategoryContainer').innerHTML = '<p style="text-align:center;">讀取清單中...</p>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getAdminCategories', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      if (result.data.length === 0) return document.getElementById('adminCategoryContainer').innerHTML = '<p style="text-align:center;">尚無分類資料。</p>';
      let html = '';
      result.data.forEach(c => {
        let statusColor = (c.status === '啟用' || c.status === '上架') ? '#799C76' : '#8C7A6B';
        let actionText = (c.status === '啟用' || c.status === '上架') ? '停用' : '啟用';
        // 對單引號進行轉義，避免 onclick 解析錯誤
        let safeName = c.name.replace(/'/g, "\\'");
        let safeNote = c.note ? c.note.replace(/'/g, "\\'") : '';
        html += `<div class="order-card" style="border-left-color: ${statusColor};">
          <h4>${c.name}</h4><p><strong>狀態:</strong> <span style="color:${statusColor}; font-weight:bold;">${c.status}</span></p>
          <p style="font-size: 13px; color: #555;">詳細介紹/備註: <br>${c.note || '無'}</p>
          
          <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="btn" style="background:#A38C75; padding:8px; margin-top:0; flex:1;" onclick="openEditCategory('${c.id}', '${safeName}', '${safeNote}')">編輯內容</button>
            <button class="btn" style="background:#E8DED1; color:#4A4036; padding:8px; margin-top:0; flex:1;" onclick="toggleCategoryStatus('${c.id}')">切換為${actionText}</button>
          </div>
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

function openEditCategory(id, name, note) {
  document.getElementById('ecId').value = id;
  document.getElementById('ecName').value = name;
  document.getElementById('ecNote').value = note;
  switchView('editCategoryView');
}

document.getElementById('editCategoryForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const data = {
    uid: currentUser.uid, categoryId: document.getElementById('ecId').value,
    name: document.getElementById('ecName').value.trim(), note: document.getElementById('ecNote').value.trim()
  };
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'updateCategory', data: data }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') { alert('更新成功！'); loadAdminCategories(); } else alert('更新失敗');
  });
});

// === 商品管理與獨立圖片上傳 ===
function fetchCategories() {
  const selectElement = document.getElementById('npCategory');
  selectElement.innerHTML = '<option value="">讀取分類中...</option>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getCategories' }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      let options = '<option value="">無分類</option>'; result.data.forEach(c => { options += `<option value="${c.name}">${c.name}</option>`; }); selectElement.innerHTML = options;
    }
  });
}

function loadAdminProducts() {
  switchView('adminProductView'); fetchCategories(); 
  document.getElementById('adminProductContainer').innerHTML = '<p style="text-align:center;">讀取清單中...</p>';
  
  // 清空圖片預覽區
  document.getElementById('npFileInput').value = '';
  document.getElementById('imagePreviewContainer').style.display = 'none';
  document.getElementById('npImage').value = '';
  window.tempImageBase64 = null;
  
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getAdminInventoryList', data: { uid: currentUser.uid } }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      if (result.data.length === 0) return document.getElementById('adminProductContainer').innerHTML = '<p style="text-align:center;">尚無商品資料。</p>';
      let html = '';
      result.data.forEach(p => {
        let statusColor = (p.status === '上架' || p.status === '啟用') ? '#799C76' : '#8C7A6B';
        let actionText = (p.status === '上架' || p.status === '啟用') ? '下架' : '重新上架';
        let catBadge = p.category ? `<span class="badge" style="background:#A38C75;">${p.category}</span> ` : '';
        html += `<div class="order-card" style="border-left-color: ${statusColor};">
          <h4>${catBadge}${p.name}</h4><p>SKU: ${p.sku}</p>
          <p>批發價: $${p.price} | 庫存: ${p.actualStock}</p>
          <p>等級限制: <span style="color:#D47C7C; font-weight:bold;">${p.levelLimit}</span></p>
          <p>狀態: <span style="color:${statusColor}; font-weight:bold;">${p.status}</span></p>
          <button class="btn" style="background:#E8DED1; color:#4A4036; padding:8px; margin-top:10px;" onclick="toggleProductStatus('${p.sku}')">${actionText}</button>
        </div>`;
      });
      document.getElementById('adminProductContainer').innerHTML = html;
    }
  });
}

// 圖片選擇器監聽：讀取圖片並顯示預覽
document.getElementById('npFileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e2) {
    document.getElementById('npImagePreview').src = e2.target.result;
    document.getElementById('imagePreviewContainer').style.display = 'block';
    
    window.tempImageBase64 = e2.target.result.split(',')[1];
    window.tempImageMime = file.type;
    window.tempImageName = file.name;
    
    // 重置上傳按鈕狀態
    const btn = document.getElementById('uploadImgBtn');
    btn.innerText = '確認上傳照片'; btn.disabled = false; btn.style.background = '#A38C75';
  };
  reader.readAsDataURL(file);
});

// 獨立執行上傳圖片動作
function uploadProductImage() {
  if(!window.tempImageBase64) return alert('請先選擇照片檔案');
  
  const btn = document.getElementById('uploadImgBtn');
  btn.innerText = '圖片上傳中...'; btn.disabled = true;
  
  fetch(GAS_URL, { 
    method: 'POST', 
    body: JSON.stringify({ 
      action: 'uploadImage', 
      data: { uid: currentUser.uid, base64: window.tempImageBase64, mimeType: window.tempImageMime, filename: window.tempImageName }
    })
  })
  .then(res => res.json()).then(res => {
    if(res.status === 'success') {
      document.getElementById('npImage').value = res.data.url; // 將回傳的真實網址塞入隱藏欄位
      alert('照片上傳成功！現在可繼續填寫其他商品資訊。');
      btn.innerText = '✅ 上傳完成'; btn.style.background = '#799C76';
    } else { 
      alert('上傳失敗：' + res.message); 
      btn.innerText = '重新上傳照片'; btn.disabled = false; 
    }
  }).catch(err => {
    alert('連線失敗'); btn.innerText = '重新上傳照片'; btn.disabled = false; 
  });
}

document.getElementById('newProductForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const productData = {
    uid: currentUser.uid, name: document.getElementById('npName').value.trim(), desc: document.getElementById('npDesc').value.trim(),
    sku: document.getElementById('npSku').value.trim(), barcode: document.getElementById('npBarcode').value.trim(),
    category: document.getElementById('npCategory').value, price: document.getElementById('npPrice').value,
    safeStock: document.getElementById('npSafeStock').value, imageUrl: document.getElementById('npImage').value.trim(),
    levelLimit: document.getElementById('npLevelLimit').value
  };
  
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'addAdminProduct', data: productData }) }).then(res => res.json()).then(result => {
    if (result.status === 'success') { 
      alert('商品建檔成功！'); document.getElementById('newProductForm').reset(); loadAdminProducts(); 
    } 
  });
});

function toggleProductStatus(sku) { fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'toggleProductStatus', data: { uid: currentUser.uid, sku: sku } }) }).then(res => res.json()).then(result => { if (result.status === 'success') loadAdminProducts(); }); }

// === 系統操作日誌與進出貨查詢 ===
let currentLogType = 'action';

function loadSystemLogs() {
  switchView('systemLogsView'); switchLogTab('action'); 
}

function switchLogTab(type) {
  currentLogType = type;
  const actionBtn = document.getElementById('tabActionLogBtn'); const inventoryBtn = document.getElementById('tabInventoryLogBtn'); const container = document.getElementById('logContainer');
  
  if (type === 'action') {
    actionBtn.style.background = '#8B6B4A'; actionBtn.style.color = '#FFF'; inventoryBtn.style.background = '#E8DED1'; inventoryBtn.style.color = '#4A4036';
    container.innerHTML = '<p style="text-align:center;">讀取操作日誌中...</p>'; fetchActionLogs(container);
  } else {
    inventoryBtn.style.background = '#8B6B4A'; inventoryBtn.style.color = '#FFF'; actionBtn.style.background = '#E8DED1'; actionBtn.style.color = '#4A4036';
    container.innerHTML = '<p style="text-align:center;">讀取當月進出貨明細中...</p>'; fetchInventoryHistory(container);
  }
}

function fetchActionLogs(container) {
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getActionLogs', data: { uid: currentUser.uid } }) })
  .then(res => res.json()).then(result => {
    if (result.status === 'success') {
      if (result.data.length === 0) return container.innerHTML = '<p style="text-align:center;">尚無日誌記錄。</p>';
      let html = '';
      result.data.forEach(log => {
        html += `<div style="border-bottom: 1px solid #E8DED1; padding: 12px 0;">
          <div style="font-size: 13px; color: #8C7A6B;">${new Date(log.time).toLocaleString()}</div>
          <div style="font-weight: bold; color: #4A4036; margin: 4px 0;">${log.managerName} (${log.role})</div>
          <div><span style="color:#C19A6B;">[${log.action}]</span> 關聯: ${log.target}</div>
        </div>`;
      });
      container.innerHTML = html;
    } else container.innerHTML = `<p style="text-align:center; color:#D47C7C;">讀取失敗：${result.message}</p>`;
  });
}

function fetchInventoryHistory(container) {
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'getInventoryHistory', data: { uid: currentUser.uid } }) })
  .then(res => res.json()).then(result => {
    if (result.status === 'success') {
      if (result.data.length === 0) return container.innerHTML = '<p style="text-align:center;">當月尚無進出貨記錄。</p>';
      let html = '';
      result.data.forEach(log => {
        let typeColor = log.type === '進貨' ? '#799C76' : '#D47C7C'; 
        html += `<div style="border-bottom: 1px solid #E8DED1; padding: 12px 0;">
          <div style="font-size: 13px; color: #8C7A6B; display:flex; justify-content:space-between;">
            <span>${new Date(log.time).toLocaleString()}</span>
            <span>操作員: ${log.managerName || '未知'}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin: 4px 0;">
            <strong style="color: #4A4036;">SKU: ${log.sku}</strong>
            <span style="color: ${typeColor}; font-weight:bold;">${log.type} ${log.qty}</span>
          </div>
          <div style="font-size: 14px; color: #8C7A6B;">備註: ${log.note}</div>
        </div>`;
      });
      container.innerHTML = html;
    } else container.innerHTML = `<p style="text-align:center; color:#D47C7C;">讀取失敗：${result.message}</p>`;
  });
}
