import { buildWordSearch } from "./wordSearchGrid";
import { spellFromPhonemes } from "./phonemes";
import { esc, scriptJson } from "./html";

// config: { words: {phonemes:string[], english:string, hint?:string}[], size:number,
//           allowDiagonal:boolean, allowBackwards:boolean, showHints:boolean,
//           activityTitle, studentName, studentNumber }
export function generateWordSearchHtml(config) {
  const {
    words,
    size = 10,
    allowDiagonal = true,
    allowBackwards = true,
    showHints = true,
    activityTitle = "Phoneme Word Search",
    studentName = "",
    studentNumber = "",
  } = config;

  const entries = words.map((w) => ({
    word: spellFromPhonemes(w.phonemes),
    meta: { phonemes: w.phonemes, english: w.english, hint: w.hint ?? "" },
  }));

  const { grid, placements } = buildWordSearch(entries, { size, allowDiagonal, allowBackwards });

  const payload = {
    grid,
    size,
    showHints: !!showHints,
    words: placements
      .filter((p) => !p.failed)
      .map((p) => ({
        word: p.word,
        phonemes: p.meta.phonemes,
        english: p.meta.english,
        hint: p.meta.hint,
      })),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(activityTitle)}</title>
<style>
  :root{--bg:#f4f7f5; --surface:#fff; --ink:#182420; --ink-soft:#4b5b55; --primary:#0f6e63; --border:#dbe4e0; --found:#2f8f5b;}
  *{box-sizing:border-box;}
  body{margin:0; background:var(--bg); color:var(--ink); font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
    min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:2rem 1rem 3rem;}
  h1{font-family:Georgia,"Iowan Old Style",serif; margin:0 0 .25rem;}
  .sub{color:var(--ink-soft); margin:0 0 1.5rem; text-align:center; max-width:32rem;}
  .layout{display:flex; gap:2rem; flex-wrap:wrap; justify-content:center; align-items:flex-start;}
  table{border-collapse:collapse; background:var(--surface); border:1px solid var(--border); border-radius:8px; overflow:hidden;}
  td{
    width:2.1rem; height:2.1rem; text-align:center; vertical-align:middle; border:1px solid var(--border);
    font-family:"SFMono-Regular",Consolas,Menlo,monospace; font-weight:700; cursor:pointer; user-select:none;
  }
  td.selected{background:#fde3c9;}
  td.found{background:var(--found); color:#fff;}
  .clues{min-width:14rem;}
  .clues h2{font-size:1rem; margin:0 0 .75rem;}
  .clue{
    border:1px solid var(--border); border-radius:8px; padding:.6rem .75rem; margin-bottom:.5rem;
    background:var(--surface); position:relative; cursor:default;
  }
  .clue.found{opacity:.55; text-decoration:line-through;}
  .clue .phon{font-family:"SFMono-Regular",Consolas,Menlo,monospace;}
  .clue .eng{display:none; color:var(--primary); font-weight:600; margin-top:.2rem;}
  .clue.found .eng{display:block;}
  .clue:hover .hoverEng{display:block;}
  .hoverEng{display:none; color:var(--ink-soft); font-size:.8rem; margin-top:.25rem;}
  .teacherHint{color:var(--ink-soft); font-size:.8rem; margin-top:.2rem;}
  .msg{min-height:1.6rem; font-weight:600; margin:1rem 0; color:var(--found); text-align:center;}
  footer{margin-top:2.5rem; color:var(--ink-soft); font-size:.85rem; text-align:center;}
</style>
</head>
<body>
  <h1>${esc(activityTitle)}</h1>
  <p class="sub">Find each word hidden in the grid. ${showHints ? "Hover a clue to see the phonetic-to-English hint, then click" : "Click"} the first and last letter of the word in the grid.</p>
  <div class="layout">
    <table id="grid"></table>
    <div class="clues">
      <h2>Find these words</h2>
      <div id="clueList"></div>
    </div>
  </div>
  <div id="msg" class="msg" role="status" aria-live="polite"></div>
  <footer>${esc(studentName)}${studentName && studentNumber ? ", " : ""}${esc(studentNumber)}</footer>

<script>
  const DATA = ${scriptJson(payload)};
  const tableEl = document.getElementById('grid');
  const clueListEl = document.getElementById('clueList');
  const msgEl = document.getElementById('msg');
  let selectStart = null;
  const foundWords = new Set();

  for (let r = 0; r < DATA.size; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < DATA.size; c++) {
      const td = document.createElement('td');
      td.id = 'cell-' + r + '-' + c;
      td.textContent = DATA.grid[r][c];
      td.addEventListener('click', () => handleCellClick(r, c));
      tr.appendChild(td);
    }
    tableEl.appendChild(tr);
  }

  function addLine(parent, className, text) {
    const line = document.createElement('div');
    line.className = className;
    line.textContent = text;
    parent.appendChild(line);
  }

  DATA.words.forEach((w) => {
    const div = document.createElement('div');
    div.className = 'clue';
    div.id = 'clue-' + w.word;
    addLine(div, 'phon', '/' + w.phonemes.join(' ') + '/');
    if (DATA.showHints) {
      if (w.hint) addLine(div, 'teacherHint', w.hint);
      addLine(div, 'hoverEng', 'Letters: ' + w.word.split('').join('-'));
    }
    addLine(div, 'eng', w.english);
    clueListEl.appendChild(div);
  });

  function handleCellClick(r, c) {
    const cellEl = document.getElementById('cell-' + r + '-' + c);
    if (!selectStart) {
      selectStart = { r, c };
      cellEl.classList.add('selected');
      return;
    }
    const path = straightPath(selectStart, { r, c });
    clearSelectedVisuals();
    if (!path) {
      selectStart = { r, c };
      cellEl.classList.add('selected');
      return;
    }
    const letters = path.map((p) => DATA.grid[p.r][p.c]).join('');
    const reversed = letters.split('').reverse().join('');
    const match = DATA.words.find(
      (w) => !foundWords.has(w.word) && (w.word === letters || w.word === reversed)
    );
    if (match) {
      foundWords.add(match.word);
      path.forEach((p) => document.getElementById('cell-' + p.r + '-' + p.c).classList.add('found'));
      document.getElementById('clue-' + match.word).classList.add('found');
      if (foundWords.size === DATA.words.length) {
        msgEl.textContent = 'All words found! Great work.';
      }
    }
    selectStart = null;
  }

  function clearSelectedVisuals() {
    document.querySelectorAll('td.selected').forEach((el) => el.classList.remove('selected'));
  }

  function straightPath(a, b) {
    const dr = Math.sign(b.r - a.r);
    const dc = Math.sign(b.c - a.c);
    const len = Math.max(Math.abs(b.r - a.r), Math.abs(b.c - a.c)) + 1;
    if (a.r !== b.r && a.c !== b.c && Math.abs(b.r - a.r) !== Math.abs(b.c - a.c)) return null;
    const path = [];
    for (let i = 0; i < len; i++) {
      path.push({ r: a.r + dr * i, c: a.c + dc * i });
    }
    return path;
  }
</script>
</body>
</html>`;
}
