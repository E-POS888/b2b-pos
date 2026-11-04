// 已為你綁定專屬的 LIFF ID 與 GAS 後端 API 網址
const LIFF_ID = '2012296480-FSAclNbs'; 
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxYx_h3YGtJ7chIJGWSVxFxMmR5rdyAirXF-Uo658iak_UjLOP3j4Z95YWinE5x-emFPg/exec';

// 全域變數，用來儲存當前使用者的狀態
let currentUser = {
  uid: null,
  displayName: null
};

// 網頁載入完成後，啟動 LIFF
window.onload = function() {
  initializeLiff();
};

// 1. 初始化 LIFF
function initializeLiff() {
  liff.init({ liffId: LIFF_ID })
    .then(() => {
      if (!liff.isLoggedIn()) {
        // 若未登入，引導至 LINE 登入畫面
        liff.login();
      } else {
        // 已登入，獲取使用者基本資訊
        liff.getProfile().then(profile => {
          currentUser.uid = profile.userId;
          currentUser.displayName = profile.displayName;
          
          // 拿到 UID 後，向 GAS 後端發送登入請求
          loginToSystem();
        }).catch(err => {
          alert('取得 LINE 資料失敗: ' + err);
        });
      }
    })
    .catch(err => {
      alert('LIFF 初始化失敗，請確認 LIFF ID 是否正確。');
    });
}

// 2. 呼叫 GAS API 進行系統登入
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
    if (result.status === 'success') {
      const data = result.data;
      
      if (data.isRegistered === false && data.status === 'REQUIRE_REGISTRATION') {
        // 系統查無此人，切換至「註冊畫面」
        switchView('registerView');
      } else {
        // 系統有資料，進入「儀表板畫面」
        setupDashboard(data);
        switchView('dashboardView');
      }
    } else {
      alert('登入發生錯誤：' + result.message);
    }
  })
  .catch(error => {
    alert('無法連線至伺服器：' + error);
  });
}

// 3. 處理註冊表單送出
document.getElementById('registerForm').addEventListener('submit', function(e) {
  e.preventDefault(); // 阻止表單預設的跳頁刷新
  
  // 收集表單資料
  const regData = {
    uid: currentUser.uid,
    phone: document.getElementById('regPhone').value,
    companyName: document.getElementById('regCompany').value,
    managerName: document.getElementById('regManager').value,
    taxId: document.getElementById('regTaxId').value,
    address: document.getElementById('regAddress').value
  };

  switchView('loadingView'); // 顯示載入中

  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'register', data: regData })
  })
  .then(response => response.json())
  .then(result => {
    if (result.status === 'success') {
      alert('註冊成功！歡迎加入。');
      // 註冊成功後，重新執行登入流程來獲取最新權限
      loginToSystem();
    } else {
      alert('註冊失敗：' + result.message);
      switchView('registerView');
    }
  })
  .catch(error => alert('連線失敗：' + error));
});

// 4. 設定儀表板與權限顯示
function setupDashboard(userData) {
  document.getElementById('welcomeMessage').innerText = `歡迎，${userData.companyName}`;
  document.getElementById('displayMemberId').innerText = userData.memberId;
  document.getElementById('displayRole').innerText = userData.role;

  // 權限判斷：解鎖後台按鈕
  const adminPanel = document.getElementById('adminPanel');
  const advancedAdminBtn = document.getElementById('advancedAdminBtn');

  if (userData.role === '一般管理員' || userData.role === '進階管理員') {
    adminPanel.style.display = 'block'; // 顯示管理員區塊
    
    if (userData.role === '進階管理員') {
      advancedAdminBtn.style.display = 'block'; // 顯示進階功能按鈕
    }
  } else {
    // 一般買方，隱藏管理員區塊
    adminPanel.style.display = 'none';
    advancedAdminBtn.style.display = 'none';
  }
}

// 5. 共用工具：切換畫面 (控制 CSS 的 active class)
function switchView(viewId) {
  // 先把所有畫面隱藏
  document.querySelectorAll('.view-section').forEach(el => {
    el.classList.remove('active');
  });
  // 顯示指定的畫面
  document.getElementById(viewId).classList.add('active');
}
