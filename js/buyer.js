// js/buyer.js - 處理商品瀏覽、購物車、歷史訂單與簽名板

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

function handleReturnFromProducts() { if (isProxyMode) switchView('dashboardView'); else switchView('dashboardView'); }

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
  ctx.scale(ratio, ratio); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#4A4036';
}
