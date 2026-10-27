// Docs Page Align — mutation watcher (read-only).
// Paste into the Console, then for 30 seconds: resize the window, change zoom,
// open/close comments, outline, and Gemini. Reports which elements Docs restyles.
(() => {
  const counts = new Map();
  const name = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    [...el.classList].map(c => '.' + c).join('')).slice(0, 120);
  const mo = new MutationObserver(ms => {
    for (const m of ms) {
      if (m.target.nodeType !== 1) continue;
      const k = `${m.attributeName}  ${name(m.target)}`;
      const e = counts.get(k) || { n: 0, last: '' };
      e.n++;
      e.last = (m.target.getAttribute(m.attributeName) || '').replace(/\s+/g, ' ').slice(0, 160);
      counts.set(k, e);
    }
  });
  mo.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'], subtree: true });
  console.log('%cWatching for 30s — resize window, change zoom, toggle comments / outline / Gemini now…', 'color:blue');
  setTimeout(() => {
    mo.disconnect();
    const rows = [...counts].sort((a, b) => b[1].n - a[1].n).slice(0, 40)
      .map(([k, v]) => `${v.n}x ${k}\n      last="${v.last}"`);
    const text = '=== STYLE/CLASS MUTATIONS (top 40) ===\n' + rows.join('\n');
    console.log(text);
    try { copy(text); console.log('%c(report copied to clipboard)', 'color:green'); } catch { console.log('(select and copy the text above)'); }
  }, 30000);
})();
