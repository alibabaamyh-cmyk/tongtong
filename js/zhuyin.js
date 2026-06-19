// Zhuyin symbols
const INITIALS = ['ㄅ','ㄆ','ㄇ','ㄈ','ㄉ','ㄊ','ㄋ','ㄌ','ㄍ','ㄎ','ㄏ','ㄐ','ㄑ','ㄒ','ㄓ','ㄔ','ㄕ','ㄖ','ㄗ','ㄘ','ㄙ'];
const FINALS   = ['ㄚ','ㄛ','ㄜ','ㄝ','ㄞ','ㄟ','ㄠ','ㄡ','ㄢ','ㄣ','ㄤ','ㄥ','ㄦ','ㄧ','ㄨ','ㄩ'];
const TONES    = ['ˉ','ˊ','ˇ','ˋ','˙'];

// Confused pairs for Level 1 (Montessori)
const CONFUSED_GROUPS = [
  ['ㄅ','ㄆ','ㄣ'],
  ['ㄉ','ㄊ','ㄌ'],
  ['ㄌ','ㄉ','ㄋ'],
  ['ㄅ','ㄣ','ㄆ'],
  ['ㄓ','ㄔ','ㄕ'],
  ['ㄗ','ㄘ','ㄙ'],
  ['ㄐ','ㄑ','ㄒ'],
  ['ㄢ','ㄣ','ㄤ'],
  ['ㄧ','ㄨ','ㄩ'],
];

// All zhuyin symbols for Level 2
const ALL_SYMBOLS = [...INITIALS, ...FINALS];

// Words for Level 3: [display_char, zhuyin_initial, zhuyin_final, tone_index (0-4), display_text]
const WORDS_L3 = [
  { char:'魚', initial:'ㄩ',  final:'',   tone:1, hint:'🐟' },
  { char:'馬', initial:'ㄇ',  final:'ㄚ', tone:2, hint:'🐴' },
  { char:'牛', initial:'ㄋ',  final:'ㄧㄡ', tone:1, hint:'🐄' },
  { char:'羊', initial:'ㄧ',  final:'ㄤ', tone:1, hint:'🐑' },
  { char:'狗', initial:'ㄍ',  final:'ㄡ', tone:2, hint:'🐶' },
  { char:'貓', initial:'ㄇ',  final:'ㄠ', tone:0, hint:'🐱' },
  { char:'書', initial:'ㄕ',  final:'ㄨ', tone:0, hint:'📚' },
  { char:'花', initial:'ㄏ',  final:'ㄨㄚ', tone:0, hint:'🌸' },
  { char:'水', initial:'ㄕ',  final:'ㄨㄟ', tone:2, hint:'💧' },
  { char:'火', initial:'ㄏ',  final:'ㄨㄛ', tone:2, hint:'🔥' },
  { char:'山', initial:'ㄕ',  final:'ㄢ', tone:0, hint:'⛰️' },
  { char:'天', initial:'ㄊ',  final:'ㄧㄢ', tone:0, hint:'🌤️' },
  { char:'大', initial:'ㄉ',  final:'ㄚ', tone:3, hint:'⬆️' },
  { char:'小', initial:'ㄒ',  final:'ㄧㄠ', tone:2, hint:'🔽' },
  { char:'好', initial:'ㄏ',  final:'ㄠ', tone:2, hint:'👍' },
  { char:'月', initial:'ㄩ',  final:'ㄝ', tone:3, hint:'🌙' },
  { char:'風', initial:'ㄈ',  final:'ㄥ', tone:0, hint:'🌬️' },
  { char:'雨', initial:'ㄩ',  final:'',   tone:2, hint:'🌧️' },
  { char:'手', initial:'ㄕ',  final:'ㄡ', tone:2, hint:'✋' },
  { char:'家', initial:'ㄐ',  final:'ㄧㄚ', tone:0, hint:'🏠' },
];

function speakZhuyin(text) {
  const audio = new Audio(`audio/zhuyin/${encodeURIComponent(text)}.wav`);
  audio.play().catch(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  });
}

function pickRandFrom(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function generateZhuyinQuestion(level) {
  if (level === 1) {
    const group = CONFUSED_GROUPS[Math.floor(Math.random() * CONFUSED_GROUPS.length)];
    const correct = group[Math.floor(Math.random() * group.length)];
    const choices = [...group].sort(() => Math.random() - 0.5);
    return { type: 'zhuyin', level: 1, answer: correct, choices, speak_text: correct };
  } else if (level === 2) {
    const correct = ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)];
    const distractors = pickRandFrom(ALL_SYMBOLS.filter(s => s !== correct), 3);
    const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
    return { type: 'zhuyin', level: 2, answer: correct, choices, speak_text: correct };
  } else {
    const word = WORDS_L3[Math.floor(Math.random() * WORDS_L3.length)];
    return {
      type: 'zhuyin',
      level: 3,
      char: word.char,
      hint: word.hint,
      answer_initial: word.initial,
      answer_final: word.final,
      answer_tone: word.tone,
      speak_text: word.char
    };
  }
}
