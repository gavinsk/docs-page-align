// Docs Page Align — experiment 9: make the whole editor column (#docs-editor) WIDER than the window,
// extending off one edge, and let Docs center the page in it (Docs lays out the page itself, which is
// what kept clicks accurate before). Waits long enough for Docs to react (~1s).
// R: column extends past the RIGHT edge  -> centered page lands on the right of the screen
// L: column extends past the LEFT edge   -> centered page lands on the left of the screen
// Commands:  dpaW('R', 24)   dpaW('L', 24)   dpaW()  (off)
window.dpaW = async (side, gap = 24) => {
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const st = document.getElementById('dpa-w') ||
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dpa-w' }));
  const log = label => {
    const pr = $('.kix-page-paginated').getBoundingClientRect(), s = $('.kix-appview-editor').getBoundingClientRect(),
          ri = $('.docs-ruler-inner');
    console.log(`dpaW ${side || 'off'} ${label}: page x=${Math.round(pr.left)}..${Math.round(pr.right)} ` +
      `scroller x=${Math.round(s.left)}..${Math.round(s.right)} ruler x=${ri ? Math.round(ri.getBoundingClientRect().left) : '?'}`);
  };
  st.textContent = '';
  await sleep(2000);
  if (!side) return log('off');

  const ed = $('#docs-editor'), p = $('.kix-page-paginated');
  if (!ed || !p) return console.warn('dpaW: Docs elements not found');
  const base = parseFloat(ed.style.width) || innerWidth;
  const pw = p.getBoundingClientRect().width + 20;   // page plus Docs' inset
  // Width W centered => page center at W/2 from the column's left edge.
  const W = Math.round(2 * (base - gap) - pw);        // R: page right edge lands at base - gap
  const X = Math.round(base - pw - 2 * gap);          // L: column starts X px off-screen to the left
  st.textContent = side === 'R'
    ? `#docs-editor{width:${W}px !important}`
    : `#docs-editor{width:${base + X}px !important;margin-left:-${X}px !important}`;
  for (const t of [1000, 2000, 4000]) { await sleep(t === 1000 ? 1000 : t / 2); log(`+${t}ms`); }
  console.log('dpaW: test clicking now');
};
console.log("dpaW ready: dpaW('R', 24) or dpaW('L', 24); dpaW() to turn off");
