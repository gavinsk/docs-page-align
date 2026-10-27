// Docs Page Align — DOM inspector (read-only).
// Paste into the DevTools Console on an open Google Doc. Prints a report and copies it to the clipboard.
(() => {
  const out = [];
  const log = s => out.push(s);
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const cls = el => (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
  const name = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    cls(el).map(c => '.' + c).join('')).slice(0, 160);
  const desc = el => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const st = (el.getAttribute('style') || '').replace(/\s+/g, ' ').slice(0, 200);
    return name(el) +
      `\n      rect x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)}` +
      ` | pos=${cs.position} disp=${cs.display} w=${cs.width} pad=${cs.padding} mar=${cs.margin}` +
      ` tf=${cs.transform} ovf=${cs.overflowX}/${cs.overflowY} left=${cs.left}` +
      (cs.display.includes('flex') ? ` jc=${cs.justifyContent}` : '') +
      (el.scrollHeight > el.clientHeight + 5 ? ` scrollH=${el.scrollHeight}/${el.clientHeight}` : '') +
      (st ? `\n      style="${st}"` : '');
  };
  const chain = (label, el) => {
    log(`\n=== CHAIN: ${label} (element -> html) ===`);
    if (!el) return log('  (not found)');
    for (let i = 0; el && el.nodeType === 1 && i < 30; el = el.parentElement, i++) log(`  [${i}] ` + desc(el));
  };
  const all = s => { try { return [...document.querySelectorAll(s)]; } catch { return []; } };
  const first = sels => {
    for (const s of sels) { const els = all(s); const v = els.find(vis) || els[0]; if (v) return v; }
    return null;
  };
  const tokens = (root, re, max = 80) => {
    const set = new Set();
    root.querySelectorAll('[class]').forEach(e => cls(e).forEach(c => re.test(c) && set.add(c)));
    return [...set].slice(0, max).join(' ') || '(none)';
  };

  // Candidate selectors (guesses — the report tells us which ones actually exist).
  const T = {
    page:       ['.kix-page-paginated', '.kix-page', 'canvas.kix-canvas-tile-content'],
    docPlugin:  ['.kix-paginateddocumentplugin', '.kix-zoomdocumentplugin-outer', '.kix-rotatingtilemanager', '.kix-rotatingtilemanager-content'],
    scroller:   ['.kix-appview-editor'],
    editorWrap: ['.kix-appview-editor-container'],
    ruler:      ['#kix-horizontal-ruler', '.kix-ruler', '#docs-ruler', '.docs-ruler'],
    cursor:     ['#kix-current-user-cursor-caret', '.kix-cursor', '.kix-cursor-caret'],
    selection:  ['.kix-canvas-tile-selection', '.kix-selection-overlay', '.kix-canvas-tile-selection-overlay'],
    textInput:  ['.docs-texteventtarget-iframe'],
    toolbar:    ['#docs-toolbar-wrapper', '#docs-toolbar'],
    menubar:    ['#docs-menubar'],
    titlebar:   ['#docs-titlebar-container', '.docs-titlebar-container'],
    chrome:     ['#docs-chrome'],
  };

  const zoomEl = first(['#zoomSelect input', '#zoomSelect', '[aria-label="Zoom"]']);
  log('=== ENV ===');
  log(`  innerWidth=${innerWidth} innerHeight=${innerHeight} dpr=${devicePixelRatio}` +
      ` zoom="${zoomEl ? (zoomEl.value || zoomEl.textContent || '').trim().slice(0, 20) : '?'}"`);
  log(`  html class="${document.documentElement.className}"`);
  log(`  body class="${document.body.className}"`);

  log('\n=== SELECTOR MATCHES (selector -> count, first visible match) ===');
  for (const [k, sels] of Object.entries(T)) for (const s of sels) {
    const els = all(s);
    if (!els.length) { log(`${k}: ${s} -> 0`); continue; }
    const v = els.filter(vis);
    log(`${k}: ${s} -> ${els.length} (visible ${v.length})\n    ` + desc(v[0] || els[0]));
  }

  const page = first(T.page), toolbar = first(T.toolbar);
  const pages = all('.kix-page-paginated').filter(vis).slice(0, 3);
  log(`\n=== FIRST VISIBLE PAGES (x positions) ===`);
  pages.forEach((p, i) => { const r = p.getBoundingClientRect(); log(`  page${i}: x=${Math.round(r.x)} w=${Math.round(r.width)} style="${(p.getAttribute('style') || '').slice(0, 160)}"`); });

  chain('PAGE', page);
  chain('TOOLBAR', toolbar);
  chain('RULER', first(T.ruler));
  chain('CURSOR', first(T.cursor));
  chain('SELECTION', first(T.selection));
  chain('TEXT INPUT IFRAME', first(T.textInput));

  if (page && toolbar) {
    let a = page; while (a && !a.contains(toolbar)) a = a.parentElement;
    log('\n=== LOWEST COMMON ANCESTOR of page + toolbar (must NOT be moved) ===\n  ' + (a ? desc(a) : 'none'));
  }

  let sc = page;
  while (sc && sc !== document.documentElement) {
    const cs = getComputedStyle(sc);
    if (/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 5) break;
    sc = sc.parentElement;
  }
  log('\n=== NEAREST SCROLLING ANCESTOR OF PAGE ===\n  ' + (sc ? desc(sc) : 'none'));

  const editorRoot = sc && sc !== document.documentElement ? sc : document.body;
  log('\n=== CLASS TOKENS inside scroller (cursor/selection/caret/page/tile/overlay/ruler) ===\n  ' +
      tokens(editorRoot, /cursor|caret|selection|overlay|page|tile|ruler|zoom|canvas/i));
  log('\n=== CLASS TOKENS anywhere (pageless/sidebar/panel/companion/docos/outline/navigation) ===\n  ' +
      tokens(document, /pageless|sidebar|side-panel|sidepanel|companion|docos|outline|navigation|gemini/i));

  const panelSel = '[class*="sidebar" i],[id*="sidebar" i],[class*="companion" i],[class*="side-panel" i],' +
                   '[class*="sidepanel" i],[class*="navigation-widget" i],[class*="docos-stream" i]';
  const panels = all(panelSel)
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 100 && r.height > 200; })
    .filter((e, _, arr) => !arr.some(o => o !== e && o.contains(e))).slice(0, 15);
  log('\n=== VISIBLE SIDE-PANEL CANDIDATES (outermost) ===');
  panels.length ? panels.forEach(p => log('  ' + desc(p))) : log('  (none)');

  const text = out.join('\n');
  console.log(text);
  try { copy(text); console.log('%c(report copied to clipboard)', 'color:green'); } catch { console.log('(select and copy the text above)'); }
})();
