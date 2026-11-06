const LIFF_ID = '2012296480-FSAclNbs'; 
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxYx_h3YGtJ7chIJGWSVxFxMmR5rdyAirXF-Uo658iak_UjLOP3j4Z95YWinE5x-emFPg/exec';

let currentUser = { uid: null, displayName: null };
let currentProfile = {}; 
let shoppingCart = []; 
let timeoutTimer;

window.onload = function() {
  timeoutTimer = setTimeout(() => { handleTimeout(); }, 8000);
  initializeLiff();
};

function handleTimeout() {
  const loadingView = document.getElementById('loadingView');
  loadingView.innerHTML = `
    <h2 style="color: #e74c3c;">連線逾時或失敗</h2>
    <p>系統載入超過 8 秒，無法完成身分驗證。</p>
    <div style="background: #fdf2e9; padding: 10px; margin-top: 15px; border-radius: 5px; font-size: 13px; text-align: left;">
      <strong>🔧 開發除錯提示：</strong><br>
      1. 檢查 LIFF ID 是否正確綁定 Endpoint URL。<br>
      2. 檢查 GAS 專案部署的「存取權限」是否設為「所有人」。<br>
      3. 確認手機網路連線正常。
    </div>
    <button class="btn" onclick="location.reload()" style="margin-top: 20px;">重新整理</button>
  `;
}

function clearSysTimeout() {
  if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; }
}

function initializeLiff() {
  liff.init({ liffId: LIFF_ID }).then(() => {
    if (!liff.isLoggedIn()) {
      clearSysTimeout();
      liff.login();
    } else {
      liff.getProfile().then(profile => {
        currentUser.uid = profile.userId;
        currentUser.displayName = profile.displayName;
        loginToSystem();
      }).catch(err => {
        clearSysTimeout(); alert('取得 LINE 資料失敗');
      });
    }
  }).catch(err => {
    clearSysTimeout(); alert('LIFF 初始化失敗，請檢查網域與ID。');
  });
}

function loginToSystem() {
  fetch(GAS_URL, {
    method: 'POST', body: JSON.stringify({ action: 'login', data: { uid: currentUser.uid } })
  }).then(res => res.json()).then(result => {
    clearSysTimeout();
    if (result.status === 'success') {
      const data = result.data;
      if (data.isRegistered === false) {
        switchView('registerView');
      } else {
        currentProfile = data; 
        setupDashboard(data);
        switchView('dashboardView');
      }
    } else {
      alert('登入錯誤：' + result.message);
    }
  }).catch(err => {
    clearSysTimeout(); alert('伺服器連線失敗');
  });
}

document.getElementById('registerForm').addEventListener('submit', function(e) {
  e.preventDefault(); 
  const regData = {
    uid: currentUser.uid,
    phone: document.getElementById('regPhone').value,
    companyName: document.getElementById('regCompany').value,
    managerName: document.getElementById('regManager').value,
    taxId: document.getElementById('regTaxId').value,
    address: document.getElementById('regAddress').value
  };

  switchView('loadingView'); 
  document.getElementById('loadingView').innerHTML = `<h2>資料送出中...</h2>`;

  fetch(GAS_URL, {
    method: 'POST', body: JSON.stringify({ action: 'register', data: regData })
  }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      alert('註冊成功！');
      document.getElementById('loadingView').innerHTML = `<h2>系統載入中...</h2>`;
      loginToSystem();
    } else {
      alert('註冊失敗：' + result.message); switchView('registerView');
    }
  }).catch(err => alert('連線失敗'));
});

function setupDashboard(userData) {
  document.getElementById('welcomeMessage').innerText = `歡迎，${userData.companyName}`;
  document.getElementById('displayMemberId').innerText = userData.memberId;
  document.getElementById('displayRole').innerText = userData.role;

  const adminPanel = document.getElementById('adminPanel');
  const advancedAdminBtn = document.getElementById('advancedAdminBtn');

  if (userData.role === '一般管理員' || userData.role === '進階管理員') {
    adminPanel.style.display = 'block'; 
    if (userData.role === '進階管理員') advancedAdminBtn.style.display = 'block'; 
  } else {
    adminPanel.style.display = 'none'; advancedAdminBtn.style.display = 'none';
  }
}

function loadProducts() {
  switchView('productListView');
  const container = document.getElementById('productContainer');
  container.innerHTML = '<p>讀取商品中，請稍候...</p>';

  fetch(`${GAS_URL}?action=getProducts`).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      const products = result.data;
      if (products.length === 0) {
        container.innerHTML = '<p>目前尚無商品。</p>'; return;
      }
      let html = '';
      products.forEach(p => {
        html += `
          <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
            <h4>${p.name} (SKU: ${p.sku})</h4>
            <p>批發價：$${p.price || 0}</p>
            <p>可用庫存：${p.availableQty || 0}</p>
            <button class="btn" style="padding: 5px; margin-top: 5px;" onclick="addToCart('${p.sku}', '${p.name}', ${p.price})">加入購物車</button>
          </div>
        `;
      });
      container.innerHTML = html;
      updateCartBtn();
    } else {
      container.innerHTML = `<p style="color:red;">讀取失敗：${result.message}</p>`;
    }
  }).catch(err => container.innerHTML = `<p style="color:red;">連線錯誤</p>`);
}

function addToCart(sku, name, price) {
  const existingItem = shoppingCart.find(item => item.sku === sku);
  if (existingItem) {
    existingItem.qty += 1;
  } else {
    shoppingCart.push({ sku: sku, name: name, price: price, qty: 1 });
  }
  updateCartBtn();
  alert(`${name} 已加入購物車`);
}

function updateCartBtn() {
  const totalQty = shoppingCart.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('viewCartBtn').innerText = `查看購物車 (${totalQty})`;
}

function showCart() {
  switchView('cartView');
  const container = document.getElementById('cartContainer');
  const totalSpan = document.getElementById('cartTotal');
  const submitBtn = document.getElementById('submitOrderBtn');
  
  if (shoppingCart.length === 0) {
    container.innerHTML = '<p>購物車是空的</p>';
    totalSpan.innerText = '0';
    submitBtn.disabled = true;
    return;
  }
  
  submitBtn.disabled = false;
  let html = '';
  let totalAmount = 0;
  
  shoppingCart.forEach((item, index) => {
    const subtotal = item.price * item.qty;
    totalAmount += subtotal;
    html += `
      <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
        <strong>${item.name}</strong><br>
        單價: $${item.price} | 數量: ${item.qty} | 小計: $${subtotal}
        <button onclick="removeFromCart(${index})" style="background: #e74c3c; color: white; border: none; padding: 2px 8px; border-radius: 3px; float: right;">刪除</button>
      </div>
    `;
  });
  
  container.innerHTML = html;
  totalSpan.innerText = totalAmount;
}

function removeFromCart(index) {
  shoppingCart.splice(index, 1);
  showCart(); 
  updateCartBtn();
}

function submitOrder() {
  if (shoppingCart.length === 0) return alert('購物車為空');
  
  const totalAmount = shoppingCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const orderData = {
    uid: currentUser.uid,
    memberId: currentProfile.memberId,
    companyName: currentProfile.companyName,
    managerName: currentProfile.managerName,
    items: shoppingCart,
    totalAmount: totalAmount
  };

  document.getElementById('submitOrderBtn').innerText = '訂單送出中...';
  document.getElementById('submitOrderBtn').disabled = true;

  fetch(GAS_URL, {
    method: 'POST', body: JSON.stringify({ action: 'submitOrder', data: orderData })
  }).then(res => res.json()).then(result => {
    if (result.status === 'success') {
      alert(result.data.message);
      shoppingCart = []; 
      updateCartBtn();
      switchView('dashboardView'); 
    } else {
      alert('下單失敗：' + result.message);
    }
  }).catch(err => alert('連線失敗'))
  .finally(() => {
    document.getElementById('submitOrderBtn').innerText = '確認送出訂單 (待補簽名功能)';
    document.getElementById('submitOrderBtn').disabled = false;
  });
}

function switchView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}
