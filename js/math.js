function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMathQuestion(level) {
  let a, b, answer, question;

  if (level === 1) {
    // 進位加法 + 無借位減法
    if (Math.random() < 0.5) {
      // 進位加法: 個位相加 > 10
      do {
        a = randInt(2, 9);
        b = randInt(2, 9);
      } while (a + b <= 10);
      answer = a + b;
      question = `${a} + ${b}`;
    } else {
      // 無借位減法
      const tens = randInt(1, 8);
      const onesA = randInt(1, 9);
      const onesB = randInt(0, onesA);
      a = tens * 10 + onesA;
      b = onesB;
      answer = a - b;
      question = `${a} − ${b}`;
    }
  } else if (level === 2) {
    // 借位減法 + 兩位數加法
    if (Math.random() < 0.5) {
      // 借位減法
      do {
        a = randInt(12, 50);
        b = randInt(3, 19);
      } while (a <= b || (a % 10) >= (b % 10) || a - b < 1);
      answer = a - b;
      question = `${a} − ${b}`;
    } else {
      // 兩位數加法 (可進位)
      a = randInt(11, 59);
      b = randInt(11, 39);
      answer = a + b;
      question = `${a} + ${b}`;
    }
  } else {
    // Level 3: 混合挑戰到千位
    const type = randInt(1, 4);
    if (type === 1) {
      a = randInt(100, 499); b = randInt(100, 499);
      answer = a + b; question = `${a} + ${b}`;
    } else if (type === 2) {
      a = randInt(200, 999); b = randInt(100, a - 1);
      answer = a - b; question = `${a} − ${b}`;
    } else if (type === 3) {
      a = randInt(1000, 4999); b = randInt(100, 999);
      answer = a + b; question = `${a} + ${b}`;
    } else {
      a = randInt(1000, 9999); b = randInt(100, Math.min(999, a - 1));
      answer = a - b; question = `${a} − ${b}`;
    }
  }

  const choices = generateChoices(answer);
  return { question, answer, choices, type: 'math' };
}

function generateChoices(correct) {
  const s = new Set([correct]);
  const deltas = [1, 2, 3, 5, 10, 11, 9];
  while (s.size < 4) {
    const delta = deltas[randInt(0, deltas.length - 1)] * (Math.random() < 0.5 ? 1 : -1);
    const v = correct + delta;
    if (v >= 0 && v !== correct) s.add(v);
  }
  return shuffle([...s]);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
