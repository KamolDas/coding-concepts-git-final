/* Coding Concepts — shared renderer.
   Content lives in data/*.json. This file turns that data into
   the same visual chapter/index pages the static build had. */

(function () {
  'use strict';

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Minimal Python syntax highlighter — comments, strings, keywords.
  // Works line-by-line so a "#" inside a string isn't mistaken for a comment.
  const KEYWORDS = ['import','from','as','def','class','return','for','in','try','except',
    'True','False','None','with','if','elif','else','lambda','and','or','not','is','while',
    'break','continue','pass','raise','yield','global','self','super',
    'struct','typedef','const','void','static','int','char','float','double','unsigned',
    'switch','case','default','sizeof','enum','union','extern','volatile','goto','do',
    'long','short','signed','include','define','NULL','bool','true','false','new','delete',
    'public','private','protected','virtual','namespace','using'];
  const KW_RE = new RegExp('\\b(' + KEYWORDS.join('|') + ')\\b', 'g');

  function highlightLine(line) {
    // Split off a trailing comment first (naively — good enough for this book's code).
    const hashIdx = findUnquotedHash(line);
    const codePart = hashIdx === -1 ? line : line.slice(0, hashIdx);
    const commentPart = hashIdx === -1 ? '' : line.slice(hashIdx);

    // Tokenize the code part into string-literal vs. plain segments on the RAW
    // text, so escaping and keyword/string spans never fight each other.
    const strRe = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
    const tokens = [];
    let last = 0, m;
    while ((m = strRe.exec(codePart)) !== null) {
      if (m.index > last) tokens.push({ str: false, text: codePart.slice(last, m.index) });
      tokens.push({ str: true, text: m[0] });
      last = m.index + m[0].length;
    }
    if (last < codePart.length) tokens.push({ str: false, text: codePart.slice(last) });

    let out = tokens.map(t => {
      if (t.str) return '<span class="st">' + escapeHtml(t.text) + '</span>';
      let c = escapeHtml(t.text);
      c = c.replace(/\bdef (\w+)/g, 'def <span class="fn">$1</span>');
      c = c.replace(KW_RE, '<span class="kw">$1</span>');
      return c;
    }).join('');

    if (commentPart) out += '<span class="cm">' + escapeHtml(commentPart) + '</span>';
    return out;
  }

  function findUnquotedHash(line) {
    // Finds the start of a line comment outside any string literal.
    // '#' covers Python/R/bash; '//' covers C/C++/Arduino (Arduino's own
    // '#include' preprocessor lines are directives, not comments, so '#' is
    // only treated as a comment starter when NOT immediately followed by a
    // letter). '//' is only a comment start when NOT immediately preceded by
    // ':' -- otherwise "https://example.com" in a git/bash example would be
    // misread as a comment starting mid-URL.
    let inStr = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inStr) { if (c === inStr && line[i - 1] !== '\\') inStr = null; continue; }
      if (c === '"' || c === "'") { inStr = c; continue; }
      if (c === '/' && line[i + 1] === '/' && line[i - 1] !== ':') return i;
      if (c === '#' && !/[A-Za-z_]/.test(line[i + 1] || '')) return i;
    }
    return -1;
  }

  function highlightPython(code) {
    return code.split('\n').map(highlightLine).join('\n');
  }

  function navHtml(chapters, curId) {
    return chapters.map(c =>
      `<a href="chapter.html?ch=${c.id}"${c.id === curId ? ' class="cur"' : ''}><span class="n">${c.module}</span> ${c.navLabel}</a>`
    ).join('\n');
  }

  function conceptTableHtml(rows) {
    return '<table class="concept-table">' +
      rows.map(r => `<tr><th>${r.label}</th><td>${r.text}</td></tr>`).join('') +
      '</table>';
  }

  function cycleHtml(steps, chapterId) {
    return '<div class="cycle"><div class="cycle-head">◈ Learning Cycle — Chapter ' +
      String(chapterId).padStart(2, '0') + '</div>' +
      steps.map((s, i) => {
        let inner = `<h4>${s.title}</h4>`;
        if (s.text) inner += `<p>${s.text}</p>`;
        if (s.hint) inner += `<div class="step-hint">${s.hint}</div>`;
        if (s.notes) inner += `<textarea class="notes-area" id="notes" placeholder="${escapeHtml(s.placeholder || '')}"></textarea>`;
        if (s.checklist) {
          inner += '<ul class="checklist" id="checklist">' +
            s.checklist.map((item, j) => `<li><input type="checkbox" id="c${j + 1}"><label for="c${j + 1}">${item}</label></li>`).join('') +
            '</ul>';
        }
        return `<div class="cycle-step"><span class="step-num">${i + 1}</span><div class="step-content">${inner}</div></div>`;
      }).join('') + '</div>';
  }

  function wirePersistence(chapterId) {
    const KEY = 'coding-concepts-ch' + chapterId;
    document.querySelectorAll('#checklist input[type=checkbox]').forEach((box, i) => {
      const k = KEY + '-check-' + i;
      try { if (localStorage.getItem(k) === 'true') box.checked = true; } catch (e) {}
      box.addEventListener('change', () => { try { localStorage.setItem(k, box.checked); } catch (e) {} });
    });
    const notes = document.getElementById('notes');
    if (notes) {
      try { const s = localStorage.getItem(KEY + '-notes'); if (s) notes.value = s; } catch (e) {}
      notes.addEventListener('input', () => { try { localStorage.setItem(KEY + '-notes', notes.value); } catch (e) {} });
    }
    const resetBtn = document.getElementById('resetAll');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      if (!confirm('Clear checklist and notes for Chapter ' + chapterId + '?')) return;
      try { Object.keys(localStorage).filter(k => k.startsWith(KEY)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
      document.querySelectorAll('#checklist input[type=checkbox]').forEach(b => b.checked = false);
      if (notes) notes.value = '';
    });
    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pre = btn.closest('.code-wrap').querySelector('pre');
        navigator.clipboard.writeText(pre.innerText).then(() => {
          btn.textContent = 'copied'; btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1500);
        });
      });
    });
  }

  async function initChapter() {
    const root = document.getElementById('app');
    const params = new URLSearchParams(location.search);
    const id = parseInt(params.get('ch') || '1', 10);
    try {
      const [chapters, data] = await Promise.all([
        fetch('data/chapters.json').then(r => r.json()),
        fetch(`data/chapter${id}.json`).then(r => { if (!r.ok) throw new Error('missing'); return r.json(); })
      ]);

      document.title = `Chapter ${id} — ${data.title} · Coding Concepts (Git & GitHub)`;

      let html = `
        <header class="site-header">
          <p class="kicker">git.workflow · learning studio</p>
          <h1>${data.title} <em>${data.titleEm}</em></h1>
        </header>
        <nav class="chapter-nav">${navHtml(chapters, id)}</nav>
        <div class="back-link"><a href="index.html">&larr; Back to book overview</a></div>
        <section class="chapter">
          <div class="chapter-head">
            <span class="mod-tag">Module ${data.module}</span>
            <h2>${data.title} <em>${data.titleEm}</em></h2>
            <p class="tagline">${data.tagline}</p>
          </div>
          <div class="chapter-body">
            ${conceptTableHtml(data.concept)}
            ${data.mnemonic ? `<div class="mnemonic"><span class="label">${data.mnemonic.label}</span><span>${data.mnemonic.text}</span></div>` : ''}
            ${data.sandboxNote ? `<div class="callout"><strong>${data.sandboxNote.strong}</strong> ${data.sandboxNote.text}</div>` : ''}
            <div class="code-wrap">
              <button class="copy-btn" data-copy>copy</button>
              <pre>${highlightPython(data.code)}</pre>
            </div>
            ${cycleHtml(data.cycle, id)}
          </div>
        </section>
        <footer class="site-footer">
          ${data.closingQuote ? `<p class="quote">${data.closingQuote}</p><div class="attrib">— Closing Principle · Kamol Das · CSE, Oxford University</div>` : ''}
          <div><button class="reset-btn" id="resetAll">Reset chapter progress</button></div>
        </footer>
      `;
      root.innerHTML = html;
      wirePersistence(id);
    } catch (err) {
      root.innerHTML = `<div class="loading">Couldn't load chapter ${id}. If you opened this file directly (file://), run a local server instead — see the README — since the browser blocks JSON loads from disk otherwise.</div>`;
      console.error(err);
    }
  }

  async function initIndex() {
    const root = document.getElementById('app');
    try {
      const chapters = await fetch('data/chapters.json').then(r => r.json());
      root.innerHTML = `
        <p class="kicker">git.workflow · learning studio</p>
        <h1>Coding <em>Concepts</em> <span style="font-size:0.5em;opacity:.6;">Git &amp; GitHub Edition</span></h1>
        <p class="intro">Nine modules, same W/H pattern throughout: read the concept table once, type the code yourself, apply it to your own data, then tick the checklist before moving on. Click any chapter to start — each one links to the rest.</p>
        <div class="grid">
          ${chapters.map(c => `
            <a class="card" href="chapter.html?ch=${c.id}">
              <div class="num">Module ${c.module}</div>
              <h2>${c.title} <em>${c.titleEm}</em></h2>
              <p>${c.tagline}</p>
            </a>`).join('')}
        </div>
        <p class="progress-note">Each chapter's checklist and notes are saved locally in your browser as you go — nothing is sent anywhere. Reopen this book any time and your progress on each chapter is still there.</p>
      `;
    } catch (err) {
      root.innerHTML = `<div class="loading">Couldn't load the chapter list. If you opened this file directly (file://), run a local server instead — see the README.</div>`;
      console.error(err);
    }
  }

  window.CodingConcepts = { initChapter, initIndex };
})();
