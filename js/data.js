const DATA_KEY = 'tongtong_v1';

const DEFAULT_PROGRESS = {
  math:    { unlocked_level: 1, stages: {} },
  english: { unlocked_level: 1, stages: {} },
  zhuyin:  { unlocked_level: 1, stages: {} }
};

const DEFAULT_DATA = {
  points: { total_earned: 0, total_redeemed: 0 },
  current_goal_id: null,
  goal_changes_remaining: 1,
  goals: [],
  daily_log: {},
  redemption_history: [],
  parent_password: '1234',
  progress: DEFAULT_PROGRESS
};

// 圖片只存記憶體，不進 localStorage（避免超過 5MB 上限）
let _imageData = {};
function getGoalImage(goalId) { return _imageData[goalId] || null; }

function pushImageToFirebase(goalId) {
  if (typeof imagesRef !== 'undefined' && imagesRef && _imageData[goalId]) {
    imagesRef.child(goalId).set(_imageData[goalId]).catch(() => {});
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const d = JSON.parse(raw);
    if (!d.points)               d.points = { total_earned: 0, total_redeemed: 0 };
    if (d.current_goal_id === undefined) d.current_goal_id = null;
    if (d.goal_changes_remaining === undefined) d.goal_changes_remaining = 1;
    if (!d.goals)                d.goals = [];
    if (!d.daily_log)            d.daily_log = {};
    if (!d.redemption_history)   d.redemption_history = [];
    if (!d.parent_password)      d.parent_password = '1234';
    if (!d.progress)             d.progress = structuredClone(DEFAULT_PROGRESS);
    ['math','english','zhuyin'].forEach(s => {
      if (!d.progress[s])        d.progress[s] = { unlocked_level: 1, stages: {} };
      if (!d.progress[s].stages) d.progress[s].stages = {};
    });
    // 舊資料若有 goal.image，搬到 _imageData 並清除 localStorage 中的圖片
    let needsResave = false;
    d.goals.forEach(g => {
      if (g.image) { _imageData[g.id] = g.image; g.image = null; needsResave = true; }
    });
    if (needsResave) {
      try { localStorage.setItem(DATA_KEY, JSON.stringify(d)); } catch(e) {}
    }
    return d;
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

// stages key 格式: "level-stage"，例如 "1-3"
function getStageStatus(subject, level, stage) {
  const d = loadData();
  return d.progress[subject].stages[`${level}-${stage}`] || { completed: false, perfect: false };
}

function isLevelUnlocked(subject, level) {
  return loadData().progress[subject].unlocked_level >= level;
}

function isStageUnlocked(subject, level, stage) {
  if (!isLevelUnlocked(subject, level)) return false;
  if (stage === 1) return true;
  return getStageStatus(subject, level, stage - 1).completed;
}

function completeStage(subject, level, stage, isPerfect) {
  const d = loadData();
  const key = `${level}-${stage}`;
  const prev = d.progress[subject].stages[key] || {};
  d.progress[subject].stages[key] = {
    completed: true,
    perfect: isPerfect || prev.perfect || false
  };
  // 完成第10關 → 解鎖下一個 Level
  if (stage === 10 && level < 3) {
    const allDone = Array.from({length: 10}, (_, i) =>
      d.progress[subject].stages[`${level}-${i+1}`]?.completed
    ).every(Boolean);
    if (allDone) {
      d.progress[subject].unlocked_level = Math.max(d.progress[subject].unlocked_level, level + 1);
    }
  }
  saveData(d);
}

let _isSyncing = false;
let _firebaseEarned = 0;   // 上次從 Firebase 拉到的 total_earned
let _pullDone = false;      // pull 完成前禁止推送，防止空白資料蓋掉 Firebase

function saveData(data) {
  data.updated_at = Date.now();
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage 寫入失敗:', e);
  }
  // pull 完成後才允許推送，且只有本機分數 >= Firebase 分數才推
  if (typeof dataRef !== 'undefined' && dataRef && !_isSyncing && _pullDone) {
    if (data.points.total_earned >= _firebaseEarned) {
      dataRef.set(data).catch(() => {});  // data 本身已無圖片
      // 圖片從記憶體推到 tongtong/images
      if (typeof imagesRef !== 'undefined' && imagesRef && Object.keys(_imageData).length > 0) {
        imagesRef.set(_imageData).catch(() => {});
      }
    }
  }
}

// 從 Firebase 拉最新資料並更新畫面（Firebase 永遠是主）
function pullFromFirebase(onDone) {
  if (typeof dataRef === 'undefined' || !dataRef) { if (onDone) onDone(false); return; }
  dataRef.once('value')
    .then(snapshot => {
      const remote = snapshot.val();
      if (remote && typeof remote === 'object') {
        _firebaseEarned = remote.points?.total_earned || 0;
        // 圖片拉到記憶體，主資料（無圖片）存 localStorage
        const saveAndDone = (imgs) => {
          if (imgs) Object.assign(_imageData, imgs);  // 圖片進記憶體
          // 確保 goals 裡沒有圖片資料再存 localStorage
          if (remote.goals) remote.goals = remote.goals.map(g => ({...g, image: null}));
          _isSyncing = true;
          try {
            localStorage.setItem(DATA_KEY, JSON.stringify(remote));
          } catch (e) {
            console.warn('localStorage 寫入失敗:', e);
          }
          _isSyncing = false;
          _pullDone = true;
          if (onDone) onDone(true);
        };
        if (typeof imagesRef !== 'undefined' && imagesRef) {
          imagesRef.once('value')
            .then(s => saveAndDone(s.val() || {}))
            .catch(() => saveAndDone({}));
        } else {
          saveAndDone({});
        }
      } else {
        // Firebase 沒資料：不自動上傳，保持本機原狀
        _pullDone = true;
        if (onDone) onDone(false);
      }
    })
    .catch(() => { _pullDone = true; if (onDone) onDone(false); });
}

// 頁面初始化時拉一次 Firebase
function syncFromFirebase(onDone) {
  pullFromFirebase(synced => onDone(synced));
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getBalance() {
  const d = loadData();
  return d.points.total_earned - d.points.total_redeemed;
}

function addPoints(subject, amount) {
  const d = loadData();
  d.points.total_earned += amount;
  const today = getTodayKey();
  if (!d.daily_log[today]) d.daily_log[today] = { math: 0, english: 0, zhuyin: 0 };
  d.daily_log[today][subject] += amount;
  saveData(d);
  return d.points.total_earned - d.points.total_redeemed;
}

function addGoal(name, imageBase64, requiredPoints) {
  return addGoalWithId(Date.now().toString(), name, imageBase64, requiredPoints);
}

function addGoalWithId(id, name, image, requiredPoints) {
  if (image) { _imageData[id] = image; pushImageToFirebase(id); }
  const d = loadData();
  const goal = { id, name, image: null, required_points: requiredPoints, redeemed: false };
  d.goals.push(goal);
  saveData(d);
  return id;
}

function updateGoal(id, name, imageBase64, requiredPoints) {
  if (imageBase64) { _imageData[id] = imageBase64; pushImageToFirebase(id); }
  const d = loadData();
  const goal = d.goals.find(g => g.id === id);
  if (!goal) return false;
  goal.name = name;
  goal.image = null;  // localStorage 不存圖片
  goal.required_points = requiredPoints;
  saveData(d);
  return true;
}

function deleteGoal(id) {
  delete _imageData[id];  // 記憶體也清掉
  const d = loadData();
  d.goals = d.goals.filter(g => g.id !== id);
  if (d.current_goal_id === id) {
    d.current_goal_id = null;
    d.goal_changes_remaining = Math.max(d.goal_changes_remaining, 1);
  }
  saveData(d);
}

function setCurrentGoal(goalId) {
  const d = loadData();
  if (d.current_goal_id === goalId) return { success: true };
  if (d.current_goal_id !== null && d.goal_changes_remaining <= 0) {
    return { success: false, reason: 'no_changes_left' };
  }
  if (d.current_goal_id !== null) d.goal_changes_remaining--;
  d.current_goal_id = goalId;
  saveData(d);
  return { success: true };
}

function redeemGoal(goalId) {
  const d = loadData();
  const goal = d.goals.find(g => g.id === goalId);
  if (!goal) return { success: false };
  const balance = d.points.total_earned - d.points.total_redeemed;
  if (balance < goal.required_points) return { success: false, reason: 'insufficient' };
  d.points.total_redeemed += goal.required_points;
  goal.redeemed = true;
  if (d.current_goal_id === goalId) {
    d.current_goal_id = null;
    d.goal_changes_remaining = Math.max(d.goal_changes_remaining, 1);
  }
  d.redemption_history.push({ date: getTodayKey(), goal_name: goal.name, points_used: goal.required_points });
  saveData(d);
  return { success: true };
}

function verifyParentPassword(pw) {
  return loadData().parent_password === pw;
}

function setParentPassword(pw) {
  const d = loadData();
  d.parent_password = pw;
  saveData(d);
}

function getDailyLog() {
  return loadData().daily_log;
}

function getRedemptionHistory() {
  return loadData().redemption_history;
}
