// phonics: 自然發音（模擬 a-a-ㄚ 的節奏），TTS 會念出來
// name = 字母發音拼法（美式），phonics = 自然發音（美式）
const LETTERS = [
  { letter: 'A', word: 'Apple',      emoji: '🍎', name: 'ay',         phonics: 'ah, ah, ah' },
  { letter: 'B', word: 'Bear',       emoji: '🐻', name: 'bee',        phonics: 'buh, buh, buh' },
  { letter: 'C', word: 'Cat',        emoji: '🐱', name: 'see',        phonics: 'kuh, kuh, kuh' },
  { letter: 'D', word: 'Dog',        emoji: '🐶', name: 'dee',        phonics: 'duh, duh, duh' },
  { letter: 'E', word: 'Elephant',   emoji: '🐘', name: 'ee',         phonics: 'eh, eh, eh' },
  { letter: 'F', word: 'Fish',       emoji: '🐟', name: 'ef',         phonics: 'fff, fff, fff' },
  { letter: 'G', word: 'Grape',      emoji: '🍇', name: 'jee',        phonics: 'guh, guh, guh' },
  { letter: 'H', word: 'Heart',      emoji: '❤️', name: 'aych',       phonics: 'huh, huh, huh' },
  { letter: 'I', word: 'Ice cream',  emoji: '🍦', name: 'eye',        phonics: 'ih, ih, ih' },
  { letter: 'J', word: 'Juice',      emoji: '🧃', name: 'jay',        phonics: 'juh, juh, juh' },
  { letter: 'K', word: 'Koala',      emoji: '🐨', name: 'kay',        phonics: 'kuh, kuh, kuh' },
  { letter: 'L', word: 'Lion',       emoji: '🦁', name: 'el',         phonics: 'lll, lll, lll' },
  { letter: 'M', word: 'Moon',       emoji: '🌙', name: 'em',         phonics: 'mmm, mmm, mmm' },
  { letter: 'N', word: 'Nest',       emoji: '🪺', name: 'en',         phonics: 'nnn, nnn, nnn' },
  { letter: 'O', word: 'Orange',     emoji: '🍊', name: 'oh',         phonics: 'oh, oh, oh' },
  { letter: 'P', word: 'Pig',        emoji: '🐷', name: 'pee',        phonics: 'puh, puh, puh' },
  { letter: 'Q', word: 'Queen',      emoji: '👑', name: 'cue',        phonics: 'kwuh, kwuh, kwuh' },
  { letter: 'R', word: 'Rainbow',    emoji: '🌈', name: 'ar',         phonics: 'rrr, rrr, rrr' },
  { letter: 'S', word: 'Star',       emoji: '⭐', name: 'es',         phonics: 'sss, sss, sss' },
  { letter: 'T', word: 'Tiger',      emoji: '🐯', name: 'tee',        phonics: 'tuh, tuh, tuh' },
  { letter: 'U', word: 'Umbrella',   emoji: '☂️', name: 'you',        phonics: 'uh, uh, uh' },
  { letter: 'V', word: 'Violin',     emoji: '🎻', name: 'vee',        phonics: 'vvv, vvv, vvv' },
  { letter: 'W', word: 'Watermelon', emoji: '🍉', name: 'double-you', phonics: 'wuh, wuh, wuh' },
  { letter: 'X', word: 'Xylophone',  emoji: '🎵', name: 'ex',         phonics: 'ks, ks, ks' },
  { letter: 'Y', word: 'Yacht',      emoji: '⛵', name: 'why',        phonics: 'yuh, yuh, yuh' },
  { letter: 'Z', word: 'Zebra',      emoji: '🦓', name: 'zee',        phonics: 'zzz, zzz, zzz' }
];

function speak(text, lang = 'en-US') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

// 字母發音 + 自然發音連續播放
function playLetterSounds(letterObj) {
  speakLetterName(letterObj.letter);
  setTimeout(() => speakNaturalSound(letterObj), 1300);
}

// 字母發音（letter name）：念出字母本身，如 "A" → "ay"
function speakLetterName(letter) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(letter);
  u.lang = 'en-US';
  u.rate = 0.7;
  window.speechSynthesis.speak(u);
}

// 自然發音（phonics）：播音檔，備案用 TTS 念 phonics 文字
function speakNaturalSound(letterObj) {
  if (!window.speechSynthesis) return;
  const audio = new Audio(`audio/phonics/${letterObj.letter.toLowerCase()}.mp3`);
  audio.play().catch(() => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(letterObj.phonics);
    u.lang = 'en-US';
    u.rate = 0.7;
    window.speechSynthesis.speak(u);
  });
}

// 自然發音（舊：播音檔後念單字，供 Level 2/3 使用）
function speakPhonics(letterObj) {
  const audio = new Audio(`audio/phonics/${letterObj.letter.toLowerCase()}.mp3`);
  audio.play().then(() => {
    audio.onended = () => {
      const u = new SpeechSynthesisUtterance(letterObj.word);
      u.lang = 'en-US';
      u.rate = 0.8;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    };
  }).catch(() => {
    const u = new SpeechSynthesisUtterance(letterObj.word);
    u.lang = 'en-US';
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  });
}

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function generateEnglishQuestion(level) {
  if (level === 1) {
    // 顯示發音拼法，潼潼聽完後選正確字母
    const correct = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const distractors = pickRandom(LETTERS.filter(l => l.letter !== correct.letter), 3);
    const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
    return {
      type: 'english',
      level: 1,
      letter_obj: correct,
      answer: correct.letter,
      choices: choices.map(c => c.letter)
    };
  } else if (level === 2) {
    // 大寫配小寫
    const correct = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const distractors = pickRandom(LETTERS.filter(l => l.letter !== correct.letter), 3);
    const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
    return {
      type: 'english',
      level: 2,
      prompt_upper: correct.letter,
      answer: correct.letter.toLowerCase(),
      choices: choices.map(c => c.letter.toLowerCase())
    };
  } else {
    // 聽音選字母
    const correct = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const distractors = pickRandom(LETTERS.filter(l => l.letter !== correct.letter), 3);
    const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
    return {
      type: 'english',
      level: 3,
      answer: correct.letter,
      speak_text: correct.letter,
      choices: choices.map(c => c.letter)
    };
  }
}
