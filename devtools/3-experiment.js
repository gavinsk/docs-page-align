// Docs Page Align — live shift experiment (temporary, nothing saved; reload the tab to fully reset).
// Commands after pasting:  dpa.set('left', 24)   dpa.set('right', 24)   dpa.off()
(() => {
  const SEL = {
    scroller: '.kix-appview-editor',
    tiles:    '.kix-rotatingtilemanager',                    // holds the page canvases; Docs sets inline left
    overlay:  '.kix-appview-clipped-ui-elements-container',  // holds the text cursor
    page:     '.kix-page-paginated',
    ruler:    '#kix-horizontal-ruler',
  };
  const $ = s => document.querySelector(s);
  const style = document.getElementById('dpa-test') ||
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dpa-test' }));
  let side = 'left', gap = 24, on = true, watched = null;
  const mo = new MutationObserver(() => apply());

  function apply() {
    const sc = $(SEL.scroller), t = $(SEL.tiles);
    if (!on || !sc || !t || !$(SEL.page)) { style.textContent = ''; return; }
    if (watched !== t) { mo.disconnect(); mo.observe(t, { attributes: true, attributeFilter: ['style'] }); watched = t; }
    const docsLeft = parseFloat(t.style.left) || 0;  // where Docs wants the page (inline style)
    const target = side === 'left' ? gap : Math.max(gap, sc.clientWidth - t.offsetWidth - gap);
    const delta = Math.round(target - docsLeft);
    style.textContent =
      `${SEL.tiles}{left:${Math.round(target)}px !important}\n` +
      `${SEL.overlay}{left:${delta}px !important}`;
    console.log(`dpa: ${side} gap=${gap} docsLeft=${docsLeft} target=${Math.round(target)} delta=${delta}`);
  }

  window.dpa = {
    set(s = 'left', g = 24) { side = s; gap = g; on = true; apply(); },
    off() { on = false; mo.disconnect(); watched = null; style.textContent = ''; console.log('dpa: off'); },
  };
  window.addEventListener('resize', () => on && apply());

  // Diagnostics for the ruler and comments, so I can decide how to handle them.
  const d = el => {
    if (!el) return '(not found)';
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} ` +
      `x=${Math.round(r.x)} w=${Math.round(r.width)} pos=${cs.position} left=${cs.left} ` +
      `mar=${cs.marginLeft} tf=${cs.transform} style="${(el.getAttribute('style') || '').slice(0, 120)}"`;
  };
  const lines = ['=== RULER CHILDREN ==='];
  const ruler = $(SEL.ruler);
  if (ruler) [...ruler.children].forEach(c => {
    lines.push('  ' + d(c));
    [...c.children].slice(0, 6).forEach(g => lines.push('      ' + d(g)));
  });
  lines.push('=== OVERLAY CHILDREN ===');
  const ov = $(SEL.overlay);
  if (ov) [...ov.children].slice(0, 10).forEach(c => lines.push('  ' + d(c)));
  lines.push('=== COMMENTS ===');
  const docos = $('.docos-stream-view');
  lines.push('  ' + d(docos));
  for (let p = docos && docos.parentElement, i = 0; p && i < 6; p = p.parentElement, i++) lines.push('    ^ ' + d(p));
  lines.push('=== OUTLINE ===', '  ' + d($('.left-sidebar-container')));

  apply();
  const text = lines.join('\n');
  console.log(text);
  try { copy(text); console.log('%c(diagnostics copied to clipboard)', 'color:green'); } catch {}
})();
