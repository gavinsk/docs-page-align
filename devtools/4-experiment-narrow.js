// Docs Page Align — experiment 2: narrow the editor column so Docs does its own centering inside it.
// Temporary; reload the tab to fully reset.
// Commands:  dpa.set('left', 400)  dpa.set('right', 400)  dpa.level(0|1|2)  dpa.report()  dpa.off()
(() => {
  if (window.dpa && window.dpa.off) window.dpa.off();  // clear experiment 1 if still active
  const LEVELS = ['#docs-editor', '#kix-appview', '.kix-appview-editor-container'];
  const $ = s => document.querySelector(s);
  const style = document.getElementById('dpa-test') ||
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dpa-test' }));
  let side = 'left', blank = 400, level = 0, on = true;

  function apply() {
    let css = '';
    const ed = $('#docs-editor');
    if (on && ed && $('.kix-page-paginated')) {
      const base = parseFloat(ed.style.width) || innerWidth;  // width Docs assigned (shrinks when side panels open)
      const w = Math.max(300, Math.round(base - blank));
      css = `${LEVELS[level]}{width:${w}px !important;` +
            (side === 'right' ? `margin-left:${Math.round(base - w)}px !important;` : '') + '}';
    }
    if (css === style.textContent) return;
    style.textContent = css;
    window.dispatchEvent(new Event('resize'));  // ask Docs to re-measure and re-center
    setTimeout(report, 600);
  }

  function report() {
    const t = $('.kix-rotatingtilemanager'), p = $('.kix-page-paginated'), sc = $('.kix-appview-editor'),
          ri = $('.docs-ruler-inner');
    const x = el => el ? Math.round(el.getBoundingClientRect().x) : '?';
    const text = `dpa: on=${on} side=${side} blank=${blank} level=${level} (${LEVELS[level]})\n` +
      `  css: ${style.textContent || '(none)'}\n` +
      `  docs-editor inline width=${$('#docs-editor')?.style.width}\n` +
      `  scroller x=${x(sc)} clientWidth=${sc?.clientWidth}\n` +
      `  tiles inline left=${t?.style.left}  page x=${x(p)}\n` +
      `  ruler-inner inline left=${ri?.style.left}  ruler x=${x(ri)}`;
    console.log(text);
    try { copy(text); } catch {}
  }

  new MutationObserver(apply).observe($('#docs-editor'), { attributes: true, attributeFilter: ['style'] });

  window.dpa = {
    set(s = 'left', b = 400) { side = s; blank = b; on = true; apply(); },
    level(n) { level = n; on = true; apply(); },
    off() { on = false; apply(); console.log('dpa: off'); },
    report,
  };
  apply();
})();
