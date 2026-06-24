// ── 狀態 ──
const state = {
  screen: 'home',
  subject: null,
  level: null,
  stage: null,
  question: null,
  sessionCorrect: 0,
  sessionTotal: 0,
  sessionPoints: 0,
  zyInitial: '', zyFinal: '', zyTone: '',
  parentUnlocked: false,
  parentPwInput: ''
};

// ── 初始化 ──
function init() {
  if (typeof setupFirebase === 'function') setupFirebase();
  renderHome();
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.screen));
  });
  // 背景同步：Firebase 有資料就更新畫面
  if (typeof syncFromFirebase === 'function') {
    syncFromFirebase(synced => {
      if (synced) {
        renderHome();
        refreshPoints();
        showSyncBadge('☁️ 已同步 ' + getBalance() + '分');
      } else {
        showSyncBadge('⚠️ 未連上Firebase');
      }
    });
  }
}

function showSyncBadge(text) {
  const badge = document.getElementById('sync-badge');
  if (!badge) return;
  badge.textContent = text || '☁️ 已同步';
  badge.classList.add('show');
  setTimeout(() => badge.classList.remove('show'), 5000);
}

function manualSync() {
  const badge = document.getElementById('sync-badge');
  if (badge) { badge.textContent = '⏳ 同步中…'; badge.classList.add('show'); }
  if (typeof dataRef === 'undefined' || !dataRef) { showSyncBadge('❌ 無連線'); return; }
  // 手動同步 = 強制把本機資料推上 Firebase（本機資料視為正確）
  const data = loadData();
  data.updated_at = Date.now();
  dataRef.set(data)
    .then(() => {
      try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); } catch(e) {}
      refreshAllScreens();
      showSyncBadge('☁️ 同步完成！');
    })
    .catch(() => showSyncBadge('❌ 同步失敗'));
}

// ── 導覽 ──
function navigate(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + screen).classList.add('active');
  const navBtn = document.querySelector(`.nav-btn[data-screen="${screen}"]`);
  if (navBtn) navBtn.classList.add('active');
  state.screen = screen;

  if (screen === 'home')    renderHome();
  if (screen === 'learn') {
    // 進學習頁前先拉最新分數，確保分數正確
    if (typeof pullFromFirebase === 'function') {
      pullFromFirebase(() => { refreshPoints(); renderLearn(); });
    } else {
      renderLearn();
    }
  }
  if (screen === 'goals')   renderGoals();
  if (screen === 'journal') renderJournal();
  if (screen === 'parent')  renderParent();
}

// ── 更新頂部積分 ──
function refreshPoints() {
  document.getElementById('topbar-points').textContent = '⭐ ' + getBalance();
}

// ── 同步後更新目前可見的頁面 ──
function refreshAllScreens() {
  refreshPoints();
  showSyncBadge();
  const s = state.screen;
  if (s === 'home')    renderHome();
  else if (s === 'goals')   renderGoals();
  else if (s === 'journal') renderJournal();
  // learn/question/parent 不自動刷新（避免打斷作答）
}

// ══════════════════════════════════════════════
// 首頁
// ══════════════════════════════════════════════
function renderHome() {
  refreshPoints();
  const d = loadData();
  const balance = d.points.total_earned - d.points.total_redeemed;

  // 小兔子進度條
  const bunnyEl = document.getElementById('bunny-area');
  if (d.current_goal_id) {
    const goal = d.goals.find(g => g.id === d.current_goal_id);
    if (goal) {
      const pct = Math.min(100, Math.round(balance / goal.required_points * 100));
      const imgHtml = getGoalImage(goal.id)
        ? `<img src="${getGoalImage(goal.id)}" class="bunny-goal-img">` : '🎯';
      bunnyEl.innerHTML = `
        <div class="bunny-card">
          <h3>🐰 潼潼的目標</h3>
          <div class="bunny-goal-name">${imgHtml}${escHtml(goal.name)}</div>
          <div class="bunny-track">
            <div class="bunny-grass"></div>
            <div class="bunny-home">🏠</div>
            <div class="bunny-icon" id="bunny-rabbit" style="left:${Math.max(4, pct * 0.82)}%">🐰</div>
          </div>
          <div class="bunny-progress-text">
            <span>目前 <strong>${balance}</strong> 分</span>
            <span>${pct}%</span>
            <span>目標 <strong>${goal.required_points}</strong> 分</span>
          </div>
          ${balance >= goal.required_points
            ? `<button class="btn-primary" style="width:100%;margin-top:12px" onclick="quickRedeem('${goal.id}')">🎉 可以兌換了！</button>`
            : ''}
        </div>`;
    }
  } else {
    bunnyEl.innerHTML = `
      <div class="bunny-card">
        <div class="bunny-no-goal">🐰 還沒有目標喔！<br><small>去「目標」設定一個吧～</small></div>
      </div>`;
  }

  // 今日積分
  const today = getTodayKey();
  const todayLog = d.daily_log[today] || { math: 0, english: 0, zhuyin: 0 };
  const todayTotal = (todayLog.math || 0) + (todayLog.english || 0) + (todayLog.zhuyin || 0);
  document.getElementById('today-summary').innerHTML = `
    <div class="card">
      <div style="font-weight:700;margin-bottom:8px;color:var(--purple)">📅 今天的學習</div>
      <div class="journal-subjects">
        <div class="journal-subject">🔢 數學 <strong>${todayLog.math || 0}</strong></div>
        <div class="journal-subject">🔤 英文 <strong>${todayLog.english || 0}</strong></div>
        <div class="journal-subject">ㄅ 注音 <strong>${todayLog.zhuyin || 0}</strong></div>
      </div>
      <div class="journal-total">今日小計：<strong>+${todayTotal} 分</strong></div>
    </div>`;
}

function quickRedeem(goalId) {
  const result = redeemGoal(goalId);
  if (result.success) {
    showFeedback('🎊', '兌換成功！好棒！', 'correct');
    setTimeout(() => { renderHome(); refreshPoints(); }, 1600);
  }
}

// ══════════════════════════════════════════════
// 學習天地
// ══════════════════════════════════════════════
function renderLearn() {
  document.getElementById('learn-inner').innerHTML = `
    <div class="section-title">📚 選擇科目</div>
    <div class="subject-grid">
      <button class="subject-btn math"   onclick="selectSubject('math')">
        <span class="icon">🔢</span>數學
      </button>
      <button class="subject-btn english" onclick="selectSubject('english')">
        <span class="icon">🔤</span>英文
      </button>
      <button class="subject-btn zhuyin"  onclick="selectSubject('zhuyin')">
        <span class="icon">ㄅ</span>注音
      </button>
    </div>`;
}

const LEVEL_INFO = {
  math: [
    { icon:'🌱', title:'Level 1', desc:'進位加法 + 無借位減法' },
    { icon:'🌿', title:'Level 2', desc:'借位減法 + 兩位數加法' },
    { icon:'🌳', title:'Level 3', desc:'百位、千位混合挑戰' }
  ],
  english: [
    { icon:'🌱', title:'Level 1', desc:'聽聲音，選字母' },
    { icon:'🌿', title:'Level 2', desc:'大寫配小寫' },
    { icon:'🌳', title:'Level 3', desc:'聽音選字母' }
  ],
  zhuyin: [
    { icon:'🌱', title:'Level 1', desc:'3張卡片選正確符號' },
    { icon:'🌿', title:'Level 2', desc:'聽音選符號' },
    { icon:'🌳', title:'Level 3', desc:'國字拼注音（聲母+韻母+聲調）' }
  ]
};

const SUBJECT_NAMES = { math:'數學', english:'英文', zhuyin:'注音' };

function selectSubject(subject) {
  state.subject = subject;
  const levels = LEVEL_INFO[subject];
  const html = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button class="back-btn" onclick="renderLearn()">←</button>
      <div class="section-title" style="margin-bottom:0">${SUBJECT_NAMES[subject]}</div>
    </div>
    ${levels.map((l, i) => {
      const lvl = i + 1;
      const unlocked = isLevelUnlocked(subject, lvl);
      // 算這個 Level 完成了幾關
      const done = Array.from({length:10}, (_,s) => getStageStatus(subject, lvl, s+1).completed).filter(Boolean).length;
      return `
      <div class="level-card${unlocked ? '' : ' locked-level'}" onclick="${unlocked ? `selectLevel('${subject}',${lvl})` : 'showLockedMsg()'}">
        <div class="level-badge l${lvl}">${unlocked ? l.icon : '🔒'}</div>
        <div class="level-info">
          <h4>${l.title}</h4>
          <p>${l.desc}</p>
        </div>
        <div style="margin-left:auto;text-align:right">
          ${unlocked
            ? `<div style="font-size:0.78rem;color:var(--text-lt)">${done}/10 關</div>
               <div style="font-size:1.2rem;color:var(--pink-lt)">›</div>`
            : `<div style="font-size:0.78rem;color:#C9C0D3">未解鎖</div>`}
        </div>
      </div>`;
    }).join('')}`;
  document.getElementById('learn-inner').innerHTML = html;
}

function showLockedMsg() {
  showFeedback('🔒', '先完成前一個Level！', 'wrong');
  setTimeout(hideFeedback, 1200);
}

function selectLevel(subject, level) {
  state.subject = subject;
  state.level = level;
  const info = LEVEL_INFO[subject][level - 1];

  // 建立10個關卡格子
  const cells = Array.from({length: 10}, (_, i) => {
    const stage = i + 1;
    const status = getStageStatus(subject, level, stage);
    const unlocked = isStageUnlocked(subject, level, stage);
    let cls, icon, onclick;
    if (status.perfect) {
      cls = 'perfect'; icon = '🏆'; onclick = `startSession('${subject}',${level},${stage})`;
    } else if (status.completed) {
      cls = 'completed'; icon = '✅'; onclick = `startSession('${subject}',${level},${stage})`;
    } else if (unlocked) {
      cls = 'unlocked'; icon = '⭐'; onclick = `startSession('${subject}',${level},${stage})`;
    } else {
      cls = 'locked'; icon = '🔒'; onclick = '';
    }
    return `
      <div class="stage-cell ${cls}" ${onclick ? `onclick="${onclick}"` : ''}>
        <div class="stage-icon">${icon}</div>
        <div class="stage-num">第${stage}關</div>
      </div>`;
  }).join('');

  document.getElementById('learn-inner').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button class="back-btn" onclick="selectSubject('${subject}')">←</button>
      <div class="section-title" style="margin-bottom:0">${info.icon} ${info.title}</div>
    </div>
    <div style="font-size:0.85rem;color:var(--text-lt);margin-bottom:14px">${info.desc}</div>
    <div class="stage-grid">${cells}</div>
    <div style="display:flex;gap:8px;font-size:0.75rem;color:var(--text-lt);flex-wrap:wrap">
      <span>🏆 完美</span><span>✅ 完成</span><span>⭐ 可挑戰</span><span>🔒 未解鎖</span>
    </div>`;
}

// ══════════════════════════════════════════════
// 答題流程
// ══════════════════════════════════════════════
const SESSION_LENGTH = 10;

function startSession(subject, level, stage) {
  state.subject = subject;
  state.level = level;
  state.stage = stage;
  state.sessionCorrect = 0;
  state.sessionTotal = 0;
  state.sessionPoints = 0;
  navigate('question');
  nextQuestion();
}

function nextQuestion() {
  if (state.sessionTotal >= SESSION_LENGTH) {
    showSessionComplete();
    return;
  }
  state.sessionTotal++;
  state.zyInitial = ''; state.zyFinal = ''; state.zyTone = '';

  let q;
  if (state.subject === 'math')    q = generateMathQuestion(state.level);
  if (state.subject === 'english') q = generateEnglishQuestion(state.level);
  if (state.subject === 'zhuyin')  q = generateZhuyinQuestion(state.level);
  state.question = q;

  renderQuestion(q);
}

function renderQuestion(q) {
  const subjectName = { math:'🔢 數學', english:'🔤 英文', zhuyin:'ㄅ 注音' }[state.subject];
  const header = `
    <div class="question-header">
      <span class="q-subject-label">${subjectName} Level ${state.level}</span>
      <span class="q-progress">${state.sessionTotal} / ${SESSION_LENGTH}</span>
    </div>`;

  const el = document.getElementById('question-inner');

  if (q.type === 'math') {
    el.innerHTML = header + `
      <div class="question-body">
        <div class="question-display">
          <div class="question-text">${q.question} = ?</div>
        </div>
        <div class="choices-grid">
          ${q.choices.map(c => `<button class="choice-btn" onclick="checkAnswer(${c})">${c}</button>`).join('')}
        </div>
      </div>`;
  } else if (q.type === 'english') {
    if (q.level === 1) {
      // 聽發音選字母（注音風格：單一發音鍵）
      const lo = q.letter_obj;
      window.currentLetterObj = lo;
      el.innerHTML = header + `
        <div class="question-body">
          <div class="question-display">
            <button class="speak-btn" onclick="playLetterSounds(currentLetterObj)">🔊</button>
            <div class="question-sub" style="margin-top:8px">點聲音，選字母</div>
          </div>
          <div class="choices-grid">
            ${q.choices.map(c => `<button class="choice-btn" data-value="${c}" onclick="checkAnswer('${c}')">${c} <span class="choice-lower">${c.toLowerCase()}</span></button>`).join('')}
          </div>
        </div>`;
      setTimeout(() => playLetterSounds(lo), 400);
    } else if (q.level === 2) {
      el.innerHTML = header + `
        <div class="question-body">
          <div class="question-display">
            <div class="question-text">${q.prompt_upper}</div>
            <div class="question-sub">大寫對應的小寫是？</div>
          </div>
          <div class="choices-grid">
            ${q.choices.map(c => `<button class="choice-btn" onclick="checkAnswer('${c}')">${c}</button>`).join('')}
          </div>
        </div>`;
    } else {
      el.innerHTML = header + `
        <div class="question-body">
          <div class="question-display">
            <button class="speak-btn" onclick="speak('${q.speak_text}')">🔊</button>
            <div class="question-sub" style="margin-top:10px">聽聲音，選字母</div>
          </div>
          <div class="choices-grid">
            ${q.choices.map(c => `<button class="choice-btn" onclick="checkAnswer('${c}')">${c}</button>`).join('')}
          </div>
        </div>`;
      setTimeout(() => speak(q.speak_text), 400);
    }
  } else if (q.type === 'zhuyin') {
    if (q.level === 1 || q.level === 2) {
      const speakIcon = q.level === 1 ? '點卡片來聽聲音' : '聽聲音，選符號';
      el.innerHTML = header + `
        <div class="question-body">
          <div class="question-display">
            <button class="speak-btn" onclick="speakZhuyin('${q.speak_text}')">🔊</button>
            <div class="question-sub" style="margin-top:8px">${speakIcon}</div>
          </div>
          <div class="choices-grid">
            ${q.choices.map(c => `<button class="choice-btn" onclick="checkAnswer('${c}')">${c}</button>`).join('')}
          </div>
        </div>`;
      if (q.level === 2) setTimeout(() => speakZhuyin(q.speak_text), 400);
    } else {
      renderZhuyinInput(q, header);
    }
  }
}

function renderZhuyinInput(q, header) {
  const el = document.getElementById('question-inner');
  el.innerHTML = header + `
    <div class="question-body" style="overflow-y:auto">
      <div class="question-display" style="padding:16px">
        <div class="question-text">${q.char}</div>
        <div style="font-size:2rem;margin:4px 0">${q.hint}</div>
        <button class="speak-btn" onclick="speakZhuyin('${q.char}')">🔊</button>
      </div>
      <div class="zhuyin-answer-display" id="zy-display">選注音符號組成讀音</div>
      <div class="zhuyin-keyboard">
        <div class="zk-section-label">聲母</div>
        <div class="zk-row">
          ${INITIALS.map(s => `<button class="zk-key" data-type="initial" data-val="${s}" onclick="zySelect('initial','${s}')">${s}</button>`).join('')}
        </div>
        <div class="zk-section-label" style="margin-top:6px">韻母</div>
        <div class="zk-row">
          ${FINALS.map(s => `<button class="zk-key" data-type="final" data-val="${s}" onclick="zySelect('final','${s}')">${s}</button>`).join('')}
        </div>
        <div class="zk-section-label" style="margin-top:6px">聲調</div>
        <div class="zk-row">
          ${TONES.map((t,i) => `<button class="zk-key tone" data-type="tone" data-val="${i}" onclick="zySelect('tone','${i}')">${t}</button>`).join('')}
        </div>
        <button class="zk-submit" onclick="submitZhuyin()">✅ 確認</button>
        <button class="zk-clear" onclick="zyReset()">✖ 清除重選</button>
      </div>
    </div>`;
  setTimeout(() => speakZhuyin(q.char), 400);
}

function zySelect(type, val) {
  state[type === 'initial' ? 'zyInitial' : type === 'final' ? 'zyFinal' : 'zyTone'] = val;
  document.querySelectorAll(`.zk-key[data-type="${type}"]`).forEach(b => b.classList.remove('selected'));
  document.querySelector(`.zk-key[data-type="${type}"][data-val="${val}"]`)?.classList.add('selected');
  updateZyDisplay();
}

function updateZyDisplay() {
  const toneChar = state.zyTone !== '' ? TONES[parseInt(state.zyTone)] : '';
  document.getElementById('zy-display').textContent =
    (state.zyInitial || '') + (state.zyFinal || '') + toneChar || '選注音符號組成讀音';
}

function zyReset() {
  state.zyInitial = ''; state.zyFinal = ''; state.zyTone = '';
  document.querySelectorAll('.zk-key').forEach(b => b.classList.remove('selected'));
  document.getElementById('zy-display').textContent = '選注音符號組成讀音';
}

function submitZhuyin() {
  const q = state.question;
  const correct =
    state.zyInitial === q.answer_initial &&
    state.zyFinal === q.answer_final &&
    state.zyTone === String(q.answer_tone);
  checkAnswer(correct ? '__zy_correct__' : '__zy_wrong__');
}

function checkAnswer(chosen) {
  const q = state.question;
  let isCorrect = false;

  if (q.type === 'math')    isCorrect = (chosen === q.answer);
  if (q.type === 'english') isCorrect = (chosen === q.answer);
  if (q.type === 'zhuyin' && (q.level === 1 || q.level === 2)) isCorrect = (chosen === q.answer);
  if (q.type === 'zhuyin' && q.level === 3) isCorrect = (chosen === '__zy_correct__');

  // 高亮選擇
  if (q.type !== 'zhuyin' || q.level < 3) {
    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.disabled = true;
      const val = btn.dataset.value ?? btn.textContent.trim();
      if (q.type === 'math' && Number(val) === q.answer) btn.classList.add('correct');
      else if (q.type !== 'math' && val === q.answer) btn.classList.add('correct');
      if (val === String(chosen) && !isCorrect) btn.classList.add('wrong');
    });
  }

  // 停掉還在進行的語音，避免和 Web Audio 衝突
  if (window.speechSynthesis) window.speechSynthesis.cancel();

  if (isCorrect) {
    state.sessionCorrect++;
    state.sessionPoints++;
    addPoints(state.subject, 1);
    refreshPoints();
    playCorrectSound();
    showFeedback('🌟', '答對了！+1 分', 'correct');
    flyPoints();
  } else {
    playWrongSound();
    showFeedback('💪', '再試一次！加油！', 'wrong');
  }

  setTimeout(() => {
    hideFeedback();
    nextQuestion();
  }, 1200);
}

function showFeedback(emoji, text, type) {
  document.getElementById('feedback-emoji').textContent = emoji;
  document.getElementById('feedback-text').textContent = text;
  document.getElementById('feedback-text').className = 'feedback-text ' + type;
  document.getElementById('feedback-overlay').classList.add('show');
}
function hideFeedback() {
  document.getElementById('feedback-overlay').classList.remove('show');
}

function flyPoints() {
  const el = document.createElement('div');
  el.className = 'points-fly';
  el.textContent = '+1 ⭐';
  el.style.cssText = `top:${window.innerHeight * 0.4}px;left:${window.innerWidth * 0.5 - 30}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);

  // 星星爆炸
  ['⭐','✨','💫'].forEach(s => {
    const star = document.createElement('div');
    star.className = 'star-burst';
    star.textContent = s;
    const tx = (Math.random() - 0.5) * 120;
    const ty = -(Math.random() * 80 + 40);
    const rot = (Math.random() - 0.5) * 180 + 'deg';
    star.style.cssText = `top:${window.innerHeight * 0.45}px;left:${window.innerWidth * 0.5}px;--tx:${tx}px;--ty:${ty}px;--rot:${rot}`;
    document.body.appendChild(star);
    setTimeout(() => star.remove(), 1100);
  });
}

function showSessionComplete() {
  const isPerfect = state.sessionCorrect === SESSION_LENGTH;
  const accuracy  = Math.round(state.sessionCorrect / SESSION_LENGTH * 100);

  // 記錄關卡完成
  completeStage(state.subject, state.level, state.stage, isPerfect);

  // 完美加 5 分
  if (isPerfect) {
    addPoints(state.subject, 5);
    refreshPoints();
    playPerfectSound();
    showFireworks();
  }

  // 算下一關
  const nextStage = state.stage < 10 ? state.stage + 1 : null;
  const nextUnlocked = nextStage && isStageUnlocked(state.subject, state.level, nextStage);

  document.getElementById('question-inner').innerHTML = `
    <div class="session-complete">
      <div class="big-emoji">${isPerfect ? '🏆' : accuracy >= 70 ? '🎉' : '💪'}</div>
      <h2>${isPerfect ? '完美！太厲害了！' : accuracy >= 70 ? '好棒！' : '繼續加油！'}</h2>
      <p>第 ${state.stage} 關完成～</p>
      <div class="session-stats">
        <div class="stat-box"><div class="num">${state.sessionCorrect}</div><div class="lbl">答對</div></div>
        <div class="stat-box"><div class="num">${state.sessionPoints}${isPerfect ? '+5' : ''}</div><div class="lbl">獲得積分</div></div>
        <div class="stat-box"><div class="num">${accuracy}%</div><div class="lbl">正確率</div></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        ${nextUnlocked ? `<button class="btn-primary" onclick="startSession('${state.subject}',${state.level},${nextStage})">下一關 ›</button>` : ''}
        <button class="btn-primary" onclick="startSession('${state.subject}',${state.level},${state.stage})">🔄 再玩一次</button>
        <button class="btn-secondary" onclick="selectLevel('${state.subject}',${state.level})">選關卡</button>
        <button class="btn-secondary" onclick="navigate('home')">回首頁</button>
      </div>
    </div>`;
}

function showFireworks() {
  const colors = ['#FF6B9D','#FFD93D','#6DCEAA','#C97FE8','#74C8F5','#FF8C42'];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  for (let burst = 0; burst < 4; burst++) {
    const bx = cx + (Math.random() - 0.5) * window.innerWidth * 0.6;
    const by = cy + (Math.random() - 0.5) * window.innerHeight * 0.4;
    setTimeout(() => {
      for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.className = 'firework-particle';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        const angle = (i / 18) * 360;
        const dist  = 60 + Math.random() * 100;
        const tx = Math.cos(angle * Math.PI / 180) * dist;
        const ty = Math.sin(angle * Math.PI / 180) * dist;
        p.style.cssText += `left:${bx}px;top:${by}px;--tx:${tx}px;--ty:${ty}px;animation-duration:${0.9 + Math.random()*0.5}s`;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1600);
      }
    }, burst * 250);
  }

  // 大大的 +5
  const popup = document.createElement('div');
  popup.className = 'bonus-popup';
  popup.innerHTML = `<div class="bonus-num">+5</div><div class="bonus-label">🎆 完美加分！</div>`;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 2300);
}

// ══════════════════════════════════════════════
// 目標清單
// ══════════════════════════════════════════════
function renderGoals() {
  refreshPoints();
  const d = loadData();
  const balance = d.points.total_earned - d.points.total_redeemed;

  let html = `
    <div class="section-title">🎯 目標清單</div>
    <div style="text-align:center;margin-bottom:14px;color:var(--text-lt);font-size:0.85rem">
      目前積分：<strong style="color:var(--pink);font-size:1.1rem">${balance}</strong> ⭐
    </div>
    <button class="add-goal-btn" onclick="openAddGoal()">＋ 新增目標</button>`;

  if (d.goals.length === 0) {
    html += `<div style="text-align:center;padding:32px;color:var(--text-lt)">還沒有目標～先新增一個吧！</div>`;
  } else {
    html += `<div class="goals-grid">` + d.goals.map(g => {
      const pct = Math.min(100, Math.round(balance / g.required_points * 100));
      const isCurrent = d.current_goal_id === g.id;
      const canRedeem = balance >= g.required_points && !g.redeemed;
      const imgHtml = getGoalImage(g.id)
        ? `<img src="${getGoalImage(g.id)}" class="goal-img">`
        : `<div class="goal-img-placeholder">🎁</div>`;
      return `<div class="goal-card${isCurrent ? ' current' : ''}${g.redeemed ? ' redeemed' : ''}" onclick="goalCardClick('${g.id}')">
        ${isCurrent ? `<div class="goal-badge">🐰</div>` : ''}
        ${imgHtml}
        <div class="goal-name">${escHtml(g.name)}</div>
        <div class="goal-pts">${g.required_points} 分</div>
        ${g.redeemed
          ? `<div class="goal-redeemed-tag">✅ 已兌換</div>`
          : `<div class="progress-mini"><div class="progress-mini-fill" style="width:${pct}%"></div></div>`}
        ${canRedeem ? `<button class="btn-primary" style="margin-top:8px;padding:8px;font-size:0.85rem;width:100%" onclick="event.stopPropagation();doRedeem('${g.id}')">🎉 兌換！</button>` : ''}
      </div>`;
    }).join('') + `</div>`;

    if (d.redemption_history.length > 0) {
      html += `<div class="section-title" style="margin-top:20px">🏅 兌換紀錄</div>`;
      html += [...d.redemption_history].reverse().map(r => `
        <div class="redemption-entry">
          <span>🎁</span>
          <span style="flex:1">${escHtml(r.goal_name)}</span>
          <span style="color:var(--text-lt)">${r.date}</span>
          <span style="color:var(--pink);font-weight:700">-${r.points_used}⭐</span>
        </div>`).join('');
    }
  }

  document.getElementById('goals-inner').innerHTML = html;
}

function goalCardClick(goalId) {
  const d = loadData();
  const goal = d.goals.find(g => g.id === goalId);
  if (!goal || goal.redeemed) return;

  if (d.current_goal_id === goalId) {
    showGoalDetail(goal, d);
    return;
  }

  const changesLeft = d.goal_changes_remaining;
  if (d.current_goal_id !== null && changesLeft <= 0) {
    showModal(`
      <div style="text-align:center;padding:16px">
        <div style="font-size:3rem">🔒</div>
        <h3 style="margin:12px 0 8px;color:var(--pink)">只能換一次</h3>
        <p style="color:var(--text-lt);margin-bottom:20px">已經用掉更換機會了，要努力達成現在的目標喔！</p>
        <button class="btn-secondary" onclick="closeModal()">OK</button>
      </div>`);
    return;
  }

  const warning = d.current_goal_id !== null
    ? `<p style="color:#FF8080;font-size:0.85rem;margin-bottom:16px">⚠️ 注意：更換後就不能再改了！</p>`
    : '';

  showModal(`
    <div style="text-align:center;padding:8px">
      <div style="font-size:2.5rem;margin-bottom:8px">${getGoalImage(goal.id) ? `<img src="${getGoalImage(goal.id)}" style="width:80px;height:80px;object-fit:cover;border-radius:14px">` : '🎯'}</div>
      <h3 style="color:var(--pink);margin-bottom:6px">${escHtml(goal.name)}</h3>
      <p style="color:var(--text-lt);margin-bottom:12px">需要 ${goal.required_points} 分</p>
      ${warning}
      <p style="margin-bottom:16px">要把這個設為小兔子的目標嗎？</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn-primary" onclick="confirmSetGoal('${goalId}')">🐰 設定！</button>
        <button class="btn-secondary" onclick="closeModal()">取消</button>
      </div>
    </div>`);
}

function confirmSetGoal(goalId) {
  const result = setCurrentGoal(goalId);
  closeModal();
  if (result.success) {
    showFeedback('🐰', '小兔子出發了！', 'correct');
    setTimeout(hideFeedback, 1200);
    renderGoals();
  }
}

function doRedeem(goalId) {
  showModal(`
    <div style="text-align:center;padding:8px">
      <div style="font-size:3rem;margin-bottom:8px">🎊</div>
      <h3 style="color:var(--pink);margin-bottom:12px">確定要兌換嗎？</h3>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn-primary" onclick="confirmRedeem('${goalId}')">✅ 確定兌換</button>
        <button class="btn-secondary" onclick="closeModal()">取消</button>
      </div>
    </div>`);
}

function confirmRedeem(goalId) {
  closeModal();
  const result = redeemGoal(goalId);
  if (result.success) {
    showFeedback('🎊', '兌換成功！你好棒！', 'correct');
    setTimeout(() => { hideFeedback(); renderGoals(); refreshPoints(); }, 1600);
  }
}

function showGoalDetail(goal, d) {
  const balance = d.points.total_earned - d.points.total_redeemed;
  const pct = Math.min(100, Math.round(balance / goal.required_points * 100));
  showModal(`
    <div style="text-align:center;padding:8px">
      ${getGoalImage(goal.id) ? `<img src="${getGoalImage(goal.id)}" style="width:100px;height:100px;object-fit:cover;border-radius:16px;margin-bottom:10px">` : '<div style="font-size:4rem;margin-bottom:10px">🎯</div>'}
      <h3 style="color:var(--pink);margin-bottom:8px">${escHtml(goal.name)}</h3>
      <div style="font-size:1.8rem;font-weight:800;color:var(--purple);margin-bottom:4px">${balance} / ${goal.required_points}</div>
      <div style="color:var(--text-lt);margin-bottom:16px">${pct}% 完成</div>
      <div class="progress-mini" style="height:10px;margin-bottom:20px"><div class="progress-mini-fill" style="width:${pct}%"></div></div>
      <button class="btn-secondary" onclick="closeModal()">關閉</button>
    </div>`);
}

// 新增/編輯目標
let editGoalId = null;
function openAddGoal(goalId = null) {
  editGoalId = goalId;
  const d = loadData();
  const goal = goalId ? d.goals.find(g => g.id === goalId) : null;
  showModal(`
    <div class="modal-title">${goal ? '編輯目標' : '新增目標'}</div>
    <div class="form-group">
      <label>目標名稱</label>
      <input type="text" id="goal-name-input" placeholder="例如：積木、書包..." value="${goal ? escHtml(goal.name) : ''}">
    </div>
    <div class="form-group">
      <label>需要幾分</label>
      <input type="number" id="goal-pts-input" placeholder="例如：50" min="1" value="${goal ? goal.required_points : ''}">
    </div>
    <div class="form-group">
      <label>目標圖片</label>
      <div class="upload-area" onclick="document.getElementById('goal-img-file').click()">
        <div style="font-size:2rem">📷</div>
        <div style="font-size:0.85rem;color:var(--text-lt);margin-top:4px">點擊上傳圖片</div>
        ${goal && getGoalImage(goal.id) ? `<img src="${getGoalImage(goal.id)}" class="upload-preview" id="upload-preview">` : '<img id="upload-preview" style="display:none">'}
      </div>
      <input type="file" id="goal-img-file" accept="image/*" style="display:none" onchange="previewImage(this)">
    </div>
    <button class="btn-primary" style="width:100%" onclick="saveGoal()">💾 儲存</button>
    ${goal ? `<button class="btn-secondary" style="width:100%;margin-top:8px" onclick="deleteGoalConfirm('${goal.id}')">🗑️ 刪除目標</button>` : ''}
  `);
}

let pendingImageBase64 = null;
function compressImage(file, onDone) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX_PX = 300;
      const MAX_BYTES = 50 * 1024;
      let { width: w, height: h } = img;
      if (w > MAX_PX || h > MAX_PX) {
        if (w > h) { h = Math.round(h * MAX_PX / w); w = MAX_PX; }
        else       { w = Math.round(w * MAX_PX / h); h = MAX_PX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      // 從高品質開始，逐步降低直到 50KB 以內
      let quality = 0.85;
      let result;
      do {
        result = canvas.toDataURL('image/jpeg', quality);
        quality -= 0.1;
      } while (result.length > MAX_BYTES * 1.37 && quality > 0.1);
      onDone(result);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function previewImage(input) {
  const file = input.files[0];
  if (!file) return;
  compressImage(file, compressed => {
    pendingImageBase64 = compressed;
    const prev = document.getElementById('upload-preview');
    prev.src = compressed;
    prev.style.display = 'block';
  });
}

function saveGoal() {
  const name = document.getElementById('goal-name-input').value.trim();
  const pts  = parseInt(document.getElementById('goal-pts-input').value);
  if (!name) { alert('請輸入目標名稱'); return; }
  if (!pts || pts < 1) { alert('請輸入正確的積分'); return; }

  if (editGoalId) {
    updateGoal(editGoalId, name, pendingImageBase64 || null, pts);
  } else {
    addGoal(name, pendingImageBase64 || null, pts);
  }
  pendingImageBase64 = null;
  closeModal();
  renderGoals();
}

function deleteGoalConfirm(goalId) {
  const d = loadData();
  const goal = d.goals.find(g => g.id === goalId);
  showModal(`
    <div style="text-align:center;padding:8px">
      <div style="font-size:2.5rem;margin-bottom:8px">🗑️</div>
      <p style="margin-bottom:16px">確定刪除「${escHtml(goal.name)}」嗎？</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn-primary" style="background:linear-gradient(135deg,#FF6B6B,#FF8080)" onclick="confirmDeleteGoal('${goalId}')">刪除</button>
        <button class="btn-secondary" onclick="closeModal()">取消</button>
      </div>
    </div>`);
}

function confirmDeleteGoal(goalId) {
  deleteGoal(goalId);
  closeModal();
  renderGoals();
}

// ══════════════════════════════════════════════
// 記錄本
// ══════════════════════════════════════════════
function renderJournal() {
  const d = loadData();
  const log = d.daily_log;
  const days = Object.keys(log).sort().reverse();

  let html = `<div class="section-title">📖 學習記錄本</div>`;

  if (days.length === 0) {
    html += `<div style="text-align:center;padding:48px;color:var(--text-lt)">還沒有記錄，快去學習吧！</div>`;
  } else {
    html += days.map(day => {
      const entry = log[day];
      const total = (entry.math || 0) + (entry.english || 0) + (entry.zhuyin || 0);
      const dateObj = new Date(day + 'T00:00:00');
      const weekday = ['日','一','二','三','四','五','六'][dateObj.getDay()];
      return `<div class="journal-entry">
        <div class="journal-date">📅 ${day}（${weekday}）</div>
        <div class="journal-subjects">
          ${entry.math    ? `<div class="journal-subject">🔢 數學 <strong>+${entry.math}</strong></div>` : ''}
          ${entry.english ? `<div class="journal-subject">🔤 英文 <strong>+${entry.english}</strong></div>` : ''}
          ${entry.zhuyin  ? `<div class="journal-subject">ㄅ 注音 <strong>+${entry.zhuyin}</strong></div>` : ''}
        </div>
        <div class="journal-total">當日小計：<strong>+${total} 分</strong> ⭐</div>
      </div>`;
    }).join('');
  }

  document.getElementById('journal-inner').innerHTML = html;
}

// ══════════════════════════════════════════════
// 家長後台
// ══════════════════════════════════════════════
function renderParent() {
  if (state.parentUnlocked) {
    renderParentAdmin();
  } else {
    renderParentGate();
  }
}

function renderParentGate() {
  state.parentPwInput = '';
  document.getElementById('parent-inner').innerHTML = `
    <div class="parent-gate">
      <div style="font-size:3rem;margin-bottom:12px">🔐</div>
      <h3>家長專區</h3>
      <div class="pw-dots">
        <div class="pw-dot" id="pd0"></div>
        <div class="pw-dot" id="pd1"></div>
        <div class="pw-dot" id="pd2"></div>
        <div class="pw-dot" id="pd3"></div>
      </div>
      <div class="numpad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(n =>
          n === '' ? '<div></div>' :
          `<button class="numpad-btn" onclick="pwInput('${n}')">${n}</button>`
        ).join('')}
      </div>
    </div>`;
}

function pwInput(val) {
  if (val === '⌫') {
    state.parentPwInput = state.parentPwInput.slice(0, -1);
  } else {
    if (state.parentPwInput.length >= 4) return;
    state.parentPwInput += val;
  }
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pd' + i);
    if (dot) dot.classList.toggle('filled', i < state.parentPwInput.length);
  }
  if (state.parentPwInput.length === 4) {
    setTimeout(() => {
      if (verifyParentPassword(state.parentPwInput)) {
        state.parentUnlocked = true;
        renderParentAdmin();
      } else {
        state.parentPwInput = '';
        for (let i = 0; i < 4; i++) {
          const dot = document.getElementById('pd' + i);
          if (dot) dot.classList.remove('filled');
        }
        document.querySelector('.parent-gate').style.animation = 'none';
        setTimeout(() => document.querySelector('.parent-gate') && (document.querySelector('.parent-gate').style.animation = ''), 100);
      }
    }, 300);
  }
}

function renderParentAdmin() {
  const d = loadData();
  const balance = d.points.total_earned - d.points.total_redeemed;
  const totalDays = Object.keys(d.daily_log).length;

  let subjectTotals = { math: 0, english: 0, zhuyin: 0 };
  Object.values(d.daily_log).forEach(day => {
    subjectTotals.math    += day.math || 0;
    subjectTotals.english += day.english || 0;
    subjectTotals.zhuyin  += day.zhuyin || 0;
  });

  document.getElementById('parent-inner').innerHTML = `
    <div class="section-title">👩‍💼 家長專區</div>

    <div class="parent-section">
      <h4>學習總覽</h4>
      <div class="stats-grid">
        <div class="stat-pill"><div class="num">${d.points.total_earned}</div><div class="lbl">總獲得</div></div>
        <div class="stat-pill"><div class="num">${d.points.total_redeemed}</div><div class="lbl">總兌換</div></div>
        <div class="stat-pill"><div class="num">${balance}</div><div class="lbl">剩餘</div></div>
        <div class="stat-pill"><div class="num">${subjectTotals.math}</div><div class="lbl">數學分</div></div>
        <div class="stat-pill"><div class="num">${subjectTotals.english}</div><div class="lbl">英文分</div></div>
        <div class="stat-pill"><div class="num">${subjectTotals.zhuyin}</div><div class="lbl">注音分</div></div>
      </div>
    </div>

    <div class="parent-section">
      <h4>目標管理</h4>
      ${d.goals.length === 0
        ? `<div style="color:var(--text-lt);font-size:0.9rem">還沒有目標</div>`
        : d.goals.map(g => `
          <div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 14px">
            ${getGoalImage(g.id) ? `<img src="${getGoalImage(g.id)}" style="width:46px;height:46px;object-fit:cover;border-radius:10px">` : '<span style="font-size:2rem">🎁</span>'}
            <div style="flex:1">
              <div style="font-weight:700">${escHtml(g.name)}</div>
              <div style="font-size:0.8rem;color:var(--text-lt)">${g.required_points} 分${g.redeemed ? ' · ✅ 已兌換' : ''}</div>
            </div>
            <button class="btn-secondary" style="padding:6px 12px;font-size:0.8rem" onclick="openAddGoal('${g.id}')">編輯</button>
          </div>`).join('')}
      <button class="btn-primary" style="width:100%;margin-top:8px" onclick="openAddGoal()">＋ 新增目標</button>
    </div>

    <div class="parent-section">
      <h4>修改密碼</h4>
      <div class="card">
        <div class="form-group">
          <label>新密碼（4位數字）</label>
          <input type="password" id="new-pw" maxlength="4" inputmode="numeric" placeholder="輸入新密碼">
        </div>
        <button class="btn-primary" onclick="changePassword()">更新密碼</button>
      </div>
    </div>

    <button class="btn-secondary" style="width:100%;margin-top:4px" onclick="logoutParent()">🔒 離開家長專區</button>`;
}

function changePassword() {
  const pw = document.getElementById('new-pw').value.trim();
  if (!/^\d{4}$/.test(pw)) { alert('請輸入4位數字密碼'); return; }
  setParentPassword(pw);
  alert('密碼已更新！');
}

function logoutParent() {
  state.parentUnlocked = false;
  renderParentGate();
}

// ══════════════════════════════════════════════
// Modal
// ══════════════════════════════════════════════
function showModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-bg').classList.add('open');
  pendingImageBase64 = null;
}
function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
  pendingImageBase64 = null;
}

// ── 音效 ──
let audioCtx = null;
async function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  return audioCtx;
}

async function playCorrectSound() {
  try {
    const ctx = await getAudioCtx();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.3);
    });
  } catch {}
}

async function playWrongSound() {
  try {
    const ctx = await getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

async function playPerfectSound() {
  try {
    const ctx = await getAudioCtx();
    const notes = [523,587,659,698,784,880,988,1047];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.35);
    });
  } catch {}
}

// ── 工具 ──
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.addEventListener('DOMContentLoaded', init);
