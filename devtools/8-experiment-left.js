// Docs Page Align — experiment 6.
// Left: make the element Docs measures narrower (so Docs lays the page out at the left) while
//       forcing the scrolling area itself back to full width. Three candidates: E, F, G.
// Right: transparent left border on the scroller, sized exactly from the gap (R).
// Commands:  dpaT('E')  dpaT('F')  dpaT('G')  dpaT('R', 24)  dpaT()  (off)
window.dpaT = async (mode, gap = 24) => {
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const st = document.getElementById('dpa-t') ||
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dpa-t' }));
  st.textContent = '';
  dispatchEvent(new Event('resize'));
  await sleep(1500);  // let Docs settle into its normal centered layout first

  const ed = $('#docs-editor'), sc = $('.kix-appview-editor'), p = $('.kix-page-paginated');
  if (!ed || !sc || !p) return console.warn('dpaT: Docs elements not found');
  const base = parseFloat(ed.style.width) || innerWidth;
  const r = p.getBoundingClientRect();
  const sb = sc.offsetWidth - sc.clientWidth;
  const narrow = Math.round(r.width + 220 + sb);  // just wider than the page
  const CSS = {
    E: `#docs-editor{width:${narrow}px !important} .kix-appview-editor-container{width:${base}px !important}`,
    F: `#kix-appview{width:${narrow}px !important} .kix-appview-editor-container{width:${base}px !important}`,
    G: `.kix-appview-editor-container{width:${narrow}px !important} .kix-appview-editor{width:${base}px !important}`,
    R: `.kix-appview-editor{border-left:${Math.max(0, Math.round(sc.clientWidth - gap - r.right))}px solid transparent !important;` +
       `overflow-x:hidden !important}`,
  };
  st.textContent = CSS[mode] || '';
  dispatchEvent(new Event('resize'));
  let last = 0;
  for (const t of [500, 1500, 3000, 6000]) {
    await sleep(t - last); last = t;
    const pr = $('.kix-page-paginated').getBoundingClientRect(), s = sc.getBoundingClientRect();
    console.log(`dpaT ${mode || 'off'} +${t}ms: page x=${Math.round(pr.left)}..${Math.round(pr.right)} ` +
      `scroller x=${Math.round(s.left)}..${Math.round(s.right)} client=${sc.clientWidth} ` +
      `sideways=${sc.scrollWidth - sc.clientWidth}`);
  }
};
console.log("dpaT ready: dpaT('E'), dpaT('F'), dpaT('G'), dpaT('R', 24); dpaT() to turn off");
