// Docs Page Align — experiment 3: keep the scrolling area full width, but make Docs lay the page out
// as if it were narrower (or wider). Runs each variant automatically, then resets.
// Afterwards:  dpa.try('A') … dpa.try('F') to keep one applied for click/annotate testing,  dpa.off()
(async () => {
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const sc = $('.kix-appview-editor'), ed = $('#docs-editor');
  if (!sc || !ed || !$('.kix-page-paginated')) return console.warn('Docs elements not found');
  const st = document.getElementById('dpa-exp') ||
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dpa-exp' }));
  st.textContent = '';
  const child = [...sc.children].find(c => c.tagName === 'DIV' && !c.className);
  if (child) child.setAttribute('data-dpa-child', '');
  const base = parseFloat(ed.style.width) || innerWidth;
  const w0 = child ? child.offsetWidth : 0;
  const B = Math.round(sc.clientWidth * 0.3);  // amount of space to try to free

  const V = {
    A: `.kix-appview-editor{padding-right:${B}px !important}`,
    B: `.kix-appview-editor{border-right:${B}px solid transparent !important}`,
    C: `[data-dpa-child]{width:${w0 - B}px !important}`,
    D: `[data-dpa-child]{width:${w0 + B}px !important}`,
    E: `#docs-editor{width:${base - B}px !important} .kix-appview-editor-container{width:${base}px !important}`,
    F: `#kix-appview{width:${base - B}px !important} .kix-appview-editor-container{width:${base}px !important}`,
  };
  const NAMES = { A: 'scroller padding-right', B: 'scroller border-right', C: 'inner div narrower',
    D: 'inner div wider', E: 'editor narrow + scroller full', F: 'appview narrow + scroller full' };

  const out = [`base=${base} clientWidth=${sc.clientWidth} B=${B} innerDiv=${child ? w0 : 'none'}`,
    'children: ' + [...sc.children].map(c => `${c.tagName.toLowerCase()}.${[...c.classList].join('.')}(${c.offsetWidth})`).join(' ')];
  const measure = async label => {
    dispatchEvent(new Event('resize'));
    await sleep(800);
    const t = $('.kix-rotatingtilemanager'), p = $('.kix-page-paginated').getBoundingClientRect(),
          s = sc.getBoundingClientRect(), ri = $('.docs-ruler-inner');
    out.push(`${label}: tiles left=${t && t.style.left} page x=${Math.round(p.left)}..${Math.round(p.right)} ` +
      `scroller x=${Math.round(s.left)}..${Math.round(s.right)} client=${sc.clientWidth} ` +
      `sideways=${sc.scrollWidth - sc.clientWidth} ruler x=${ri ? Math.round(ri.getBoundingClientRect().left) : '?'}`);
  };

  console.log('dpa: testing 6 variants, ~6 seconds…');
  await measure('0 baseline');
  for (const k of Object.keys(V)) { st.textContent = V[k]; await measure(`${k} ${NAMES[k]}`); }
  st.textContent = '';
  await measure('reset');

  window.dpa = {
    try(k) { st.textContent = V[k] || ''; dispatchEvent(new Event('resize')); console.log('dpa: applied ' + k); },
    off() { st.textContent = ''; dispatchEvent(new Event('resize')); console.log('dpa: off'); },
  };
  const text = out.join('\n');
  console.log(text);
  try { copy(text); console.log('%c(report copied to clipboard)', 'color:green'); } catch {}
})();
