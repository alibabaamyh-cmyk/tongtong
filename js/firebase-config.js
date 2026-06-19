// ── Firebase 設定 ──
// 第一次使用請依下列步驟填入設定值：
//
// 1. 前往 https://console.firebase.google.com/
// 2. 建立新專案（專案名稱隨意，例如 tongtong-learning）
// 3. 左側選單 → Realtime Database → 建立資料庫
//    - 地區選「asia-southeast1（Singapore）」比較快
//    - 規則選「在測試模式下啟動」（之後可鎖定）
// 4. 左側齒輪 → 專案設定 → 你的應用程式 → 新增 Web 應用程式
// 5. 複製 firebaseConfig 的內容貼到下方對應欄位

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyA-He3kUW7mjAWzbUyh110YQMNkAk1i7o0',
  authDomain:        'tong-learing.firebaseapp.com',
  databaseURL:       'https://tong-learing-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId:         'tong-learing',
  storageBucket:     'tong-learing.firebasestorage.app',
  messagingSenderId: '981898444917',
  appId:             '1:981898444917:web:4c52749fe61086a159783c'
};

// ── 初始化（由 app.js 的 init() 呼叫）──
let dataRef = null;

function setupFirebase() {
  if (!FIREBASE_CONFIG.apiKey) return;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    dataRef = firebase.database().ref('tongtong/data');
  } catch (e) {
    console.warn('Firebase 初始化失敗:', e);
    dataRef = null;
  }
}
