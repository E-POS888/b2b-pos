const LIFF_ID = '2012296480-FSAclNbs'; 
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxYx_h3YGtJ7chIJGWSVxFxMmR5rdyAirXF-Uo658iak_UjLOP3j4Z95YWinE5x-emFPg/exec';

let currentUser = {
  uid: null,
  displayName: null
};

// 新增：設定 8 秒逾時計時器變數
let timeoutTimer;

window.onload = function() {
  // 啟動 8 秒逾時計時器
  timeoutTimer = setTimeout(() => {
    handleTimeout();
  }, 8000);

  initializeLiff();
};

// 處理逾時的畫面替換
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

// 成功載入後，清除計時器
function clearSysTimeout() {
  if (timeoutTimer) {
    clearTimeout(timeoutTimer);
    timeoutTimer = null;
  }
}

function initializeLiff() {
  liff.init({ liffId: LIFF_ID })
    .then(() => {
      if (!liff.isLoggedIn()) {
        clearSysTimeout(); // 暫停計時，等待使用者登入
        liff.login();
      } else {
        liff.getProfile().then(profile => {
          currentUser.uid = profile.userId;
          currentUser.displayName = profile.displayName;
          loginToSystem();
        }).catch(err => {
          clearSysTimeout();
          alert('取得 LINE 資料失敗: ' + err);
        });
      }
    })
    .catch(err => {
      clearSysTimeout();
      alert('LIFF 初始化失敗，請確認 LIFF ID 是否正確。');
    });
}

function loginToSystem() {
  const payload = {
    action: 'login',
    data: { uid: currentUser.uid }
  };

  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(result => {
    clearSysTimeout(); // 成功收到伺服器回應，清除逾時計時器！

    if (result.status === 'success') {
      const data = result.data;
      if (data.isRegistered === false && data.status === 'REQUIRE_REGISTRATION') {
        switchView('registerView');
      } else {
        setupDashboard(data);
        switchView('dashboardView');
      }
    } else {
      alert('登入發生錯誤：' + result.message);
    }
  })
  .catch(error => {
    clearSysTimeout();
    alert('無法連線至伺服器，請檢查網路或 GAS 設定：' + error);
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
  document.getElementById('loadingView').innerHTML = `<h2>資料送出中...</h2><p>請稍候</p>`;

  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'register', data: regData })
  })
  .then(response => response.json())
  .then(result => {
    if (result.status === 'success') {
      alert('註冊成功！歡迎加入。');
      // 重置載入畫面並重新登入取得權限
      document.getElementById('loadingView').innerHTML = `<h2>系統載入中...</h2><p>正在驗證您的身分</p>`;
      loginToSystem();
    } else {
      alert('註冊失敗：' + result.message);
      switchView('registerView');
    }
  })
  .catch(error => alert('連線失敗：' + error));
});

function setupDashboard(userData) {
  document.getElementById('welcomeMessage').innerText = `歡迎，${userData.companyName}`;
  document.getElementById('displayMemberId').innerText = userData.memberId;
  document.getElementById('displayRole').innerText = userData.role;

  const adminPanel = document.getElementById('adminPanel');
  const advancedAdminBtn = document.getElementById('advancedAdminBtn');

  if (userData.role === '一般管理員' || userData.role === '進階管理員') {
    adminPanel.style.display = 'block'; 
    if (userData.role === '進階管理員') {
      advancedAdminBtn.style.display = 'block'; 
    }
  } else {
    adminPanel.style.display = 'none';
    advancedAdminBtn.style.display = 'none';
  }
}

function switchView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => {
    el.classList.remove('active');
  });
  document.getElementById(viewId).classList.add('active');
}
