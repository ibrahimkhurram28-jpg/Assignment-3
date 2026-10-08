import { CONSONANTS, VOWELS } from "./phonemes";
import { esc, scriptJson } from "./html";

// config: {
//   words: { phonemes: string[], english: string, hint?: string }[],
//   numGuesses: number, showHints: boolean,
//   activityTitle: string, studentName: string, studentNumber: string
// }
// For compatibility with Assessment 1, a single word can still be passed as
// { phonemeWord: string[], englishWord: string }.
export function generateWordleHtml(config) {
  const {
    words,
    phonemeWord,
    englishWord,
    numGuesses = 6,
    showHints = true,
    activityTitle = "Phoneme'le",
    studentName = "",
    studentNumber = "",
  } = config;

  const sourceWords = Array.isArray(words) && words.length
    ? words
    : [{ phonemes: phonemeWord ?? [], english: englishWord ?? "" }];

  const rounds = sourceWords
    .map((w) => ({
      answer: (w.phonemes ?? []).map((p) => String(p).trim()).filter(Boolean),
      english: w.english ?? "",
      hint: w.hint ?? "",
    }))
    .filter((w) => w.answer.length > 0);

  const keyboardRows = [CONSONANTS, VOWELS];

  const dataPayload = {
    rounds,
    numGuesses: Math.max(1, Number(numGuesses) || 6),
    showHints: !!showHints,
    keyboardRows: keyboardRows.map((row) => row.map((p) => ({ ipa: p.ipa, label: p.label, example: p.example }))),
  };

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(activityTitle)}: Phoneme Wordle</title>
<style>
  :root{
    --bg:#f4f7f5; --surface:#fff; --ink:#182420; --ink-soft:#4b5b55;
    --primary:#0f6e63; --border:#dbe4e0; --accent:#e8823c;
    --present:#e8823c; --correct:#2f8f5b; --absent:#8a948f;
  }
  *{box-sizing:border-box;}
  body{
    margin:0; background:var(--bg); color:var(--ink);
    font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
    min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:2rem 1rem 3rem;
  }
  h1{font-family:Georgia,"Iowan Old Style",serif; margin:0 0 .25rem; text-align:center;}
  .sub{color:var(--ink-soft); margin:0 0 1rem; text-align:center; max-width:32rem;}
  .round{font-weight:600; color:var(--primary); margin:0 0 .5rem;}
  .clue{min-height:1.4rem; margin:0 0 1rem; color:var(--ink-soft); text-align:center;}
  .clue button{font:inherit; color:var(--primary); background:none; border:0; text-decoration:underline; cursor:pointer;}
  .grid{display:grid; gap:.5rem; margin-bottom:1.5rem;}
  .row{display:grid; gap:.5rem; grid-auto-flow:column;}
  .tile{
    width:3.4rem; height:3.4rem; border:2px solid var(--border); border-radius:8px;
    display:flex; align-items:center; justify-content:center; font-size:1.1rem;
    font-family:"SFMono-Regular",Consolas,Menlo,monospace; background:var(--surface); font-weight:600;
  }
  .tile.correct{background:var(--correct); border-color:var(--correct); color:#fff;}
  .tile.present{background:var(--present); border-color:var(--present); color:#fff;}
  .tile.absent{background:var(--absent); border-color:var(--absent); color:#fff;}
  .msg{min-height:1.6rem; font-weight:600; margin-bottom:1rem; text-align:center;}
  .msg.win{color:var(--correct);}
  .msg.lose{color:#c0503b;}
  .keyboard{display:flex; flex-direction:column; gap:.6rem; max-width:40rem;}
  .kbrow{display:flex; flex-wrap:wrap; gap:.4rem; justify-content:center;}
  .key{
    position:relative; border:1px solid var(--border); background:var(--surface); color:var(--ink);
    border-radius:6px; padding:.5rem .6rem; font-family:"SFMono-Regular",Consolas,Menlo,monospace;
    cursor:pointer; font-size:1rem; min-width:2.6rem;
  }
  .key:hover{border-color:var(--primary);}
  .key.correct{background:var(--correct); color:#fff; border-color:var(--correct);}
  .key.present{background:var(--present); color:#fff; border-color:var(--present);}
  .key.absent{background:var(--absent); color:#fff; border-color:var(--absent); opacity:.7;}
  .key .hint{
    display:block; font-family:-apple-system,Arial,sans-serif; font-size:.6rem; color:var(--ink-soft); margin-top:.15rem;
  }
  .controls{display:flex; flex-wrap:wrap; justify-content:center; gap:.6rem; margin:1.25rem 0;}
  .btn{
    border-radius:8px; padding:.6rem 1.1rem; border:1px solid var(--border); background:var(--surface);
    cursor:pointer; font-weight:600; font-family:inherit; color:var(--ink);
  }
  .btn.primary{background:var(--primary); border-color:var(--primary); color:#fff;}
  .btn[hidden]{display:none;}
  footer{margin-top:2.5rem; color:var(--ink-soft); font-size:.85rem; text-align:center;}
</style>
</head>
<body>
  <h1>${esc(activityTitle)}</h1>
  <p class="sub">Build the target word one phoneme at a time. Click phoneme tiles below to fill a row, then press Enter.</p>
  <p id="round" class="round"></p>
  <p id="clue" class="clue"></p>
  <div id="grid" class="grid"></div>
  <div id="msg" class="msg" role="status" aria-live="polite"></div>
  <div class="controls">
    <button class="btn" id="backspace" type="button">⌫ Remove</button>
    <button class="btn primary" id="enter" type="button">Enter ↵</button>
    <button class="btn primary" id="next" type="button" hidden>Next word</button>
    <button class="btn" id="restart" type="button" hidden>Play again</button>
  </div>
  <div id="keyboard" class="keyboard"></div>
  <footer>${esc(studentName)}${studentName && studentNumber ? ", " : ""}${esc(studentNumber)}</footer>

<script>
  const DATA = ${scriptJson(dataPayload)};
  const maxGuesses = DATA.numGuesses;
  const rank = { absent: 0, present: 1, correct: 2 };

  const gridEl = document.getElementById('grid');
  const msgEl = document.getElementById('msg');
  const kbEl = document.getElementById('keyboard');
  const roundEl = document.getElementById('round');
  const clueEl = document.getElementById('clue');
  const nextBtn = document.getElementById('next');
  const restartBtn = document.getElementById('restart');

  let order = [];
  let roundIndex = 0;
  let answer = [];
  let wordLen = 0;
  let currentRow = 0;
  let currentGuess = [];
  let gameOver = false;
  let keyStatus = {};

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }

  DATA.keyboardRows.forEach((group) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kbrow';
    group.forEach((p) => {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'key';
      key.id = 'key-' + p.ipa;
      key.textContent = '/' + p.ipa + '/';
      if (DATA.showHints) {
        const hint = document.createElement('span');
        hint.className = 'hint';
        hint.textContent = p.label;
        key.appendChild(hint);
        key.title = p.label + ' (as in ' + p.example + ')';
      }
      key.addEventListener('click', () => pressPhoneme(p.ipa));
      rowEl.appendChild(key);
    });
    kbEl.appendChild(rowEl);
  });

  document.getElementById('backspace').addEventListener('click', backspace);
  document.getElementById('enter').addEventListener('click', submitGuess);
  nextBtn.addEventListener('click', () => startRound(roundIndex + 1));
  restartBtn.addEventListener('click', startGame);

  function startGame() {
    if (!DATA.rounds.length) {
      msgEl.textContent = 'This activity has no words yet.';
      return;
    }
    order = DATA.rounds.length > 1 ? shuffle(DATA.rounds.map((_, i) => i)) : [0];
    startRound(0);
  }

  function startRound(index) {
    roundIndex = index;
    const round = DATA.rounds[order[index]];
    answer = round.answer;
    wordLen = answer.length;
    currentRow = 0;
    currentGuess = [];
    gameOver = false;
    keyStatus = {};

    document.querySelectorAll('.key').forEach((k) => k.classList.remove('correct', 'present', 'absent'));
    msgEl.textContent = '';
    msgEl.className = 'msg';
    nextBtn.hidden = true;
    restartBtn.hidden = true;

    roundEl.textContent = DATA.rounds.length > 1
      ? 'Word ' + (index + 1) + ' of ' + DATA.rounds.length + ' (' + wordLen + ' phonemes)'
      : wordLen + ' phonemes';

    clueEl.textContent = '';
    if (DATA.showHints && round.hint) {
      const reveal = document.createElement('button');
      reveal.type = 'button';
      reveal.textContent = 'Show clue';
      reveal.addEventListener('click', () => { clueEl.textContent = 'Clue: ' + round.hint; });
      clueEl.appendChild(reveal);
    }

    gridEl.innerHTML = '';
    gridEl.style.gridTemplateRows = 'repeat(' + maxGuesses + ', auto)';
    for (let r = 0; r < maxGuesses; r++) {
      const row = document.createElement('div');
      row.className = 'row';
      row.style.gridTemplateColumns = 'repeat(' + wordLen + ', auto)';
      for (let c = 0; c < wordLen; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.id = 'tile-' + r + '-' + c;
        row.appendChild(tile);
      }
      gridEl.appendChild(row);
    }
  }

  function pressPhoneme(ipa) {
    if (gameOver) return;
    if (currentGuess.length >= wordLen) return;
    currentGuess.push(ipa);
    renderCurrentRow();
  }

  function backspace() {
    if (gameOver) return;
    currentGuess.pop();
    renderCurrentRow();
  }

  function renderCurrentRow() {
    for (let c = 0; c < wordLen; c++) {
      const tile = document.getElementById('tile-' + currentRow + '-' + c);
      tile.textContent = currentGuess[c] ? currentGuess[c] : '';
    }
  }

  function finishRound(text, className) {
    gameOver = true;
    msgEl.textContent = text;
    msgEl.className = 'msg ' + className;
    const more = roundIndex + 1 < DATA.rounds.length;
    nextBtn.hidden = !more;
    restartBtn.hidden = more;
  }

  function submitGuess() {
    if (gameOver) return;
    if (currentGuess.length !== wordLen) {
      msgEl.textContent = 'Fill all ' + wordLen + ' phoneme tiles before submitting.';
      msgEl.className = 'msg';
      return;
    }
    const result = scoreGuess(currentGuess, answer);
    for (let c = 0; c < wordLen; c++) {
      const tile = document.getElementById('tile-' + currentRow + '-' + c);
      tile.classList.add(result[c]);
      const keyEl = document.getElementById('key-' + currentGuess[c]);
      if (keyEl) {
        const prev = keyStatus[currentGuess[c]] || 'absent';
        if (rank[result[c]] >= rank[prev]) {
          keyStatus[currentGuess[c]] = result[c];
          keyEl.classList.remove('correct', 'present', 'absent');
          keyEl.classList.add(result[c]);
        }
      }
    }

    const round = DATA.rounds[order[roundIndex]];
    const reveal = '/' + answer.join(' ') + '/ = "' + round.english + '"';
    if (result.every((r) => r === 'correct')) {
      finishRound('Correct! Phoneme word ' + reveal, 'win');
    } else {
      currentRow++;
      currentGuess = [];
      if (currentRow >= maxGuesses) {
        finishRound('Out of guesses. The word was ' + reveal, 'lose');
      } else {
        msgEl.textContent = '';
      }
    }
  }

  function scoreGuess(guess, ans) {
    const result = Array(guess.length).fill('absent');
    const ansCopy = [...ans];
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === ans[i]) {
        result[i] = 'correct';
        ansCopy[i] = null;
      }
    }
    for (let i = 0; i < guess.length; i++) {
      if (result[i] === 'correct') continue;
      const idx = ansCopy.indexOf(guess[i]);
      if (idx !== -1) {
        result[i] = 'present';
        ansCopy[idx] = null;
      }
    }
    return result;
  }

  startGame();
</script>
</body>
</html>`;
}
