// Docs Page Align — experiment 7. All variants keep the scroller covering the full window.
// R1: left border pushes the page right (no overflow change)           — like dpaB('right'), exact size
// R2: same, plus cap the tile container's width to stop sideways scroll  — no overflow-x:hidden
// L1: scroller widened off the LEFT edge of the screen; Docs ignores extra width, so the page shifts left
// All variants also shift the ruler by the same amount.
// Commands:  dpaV('R1', 24)  dpaV('R2', 24)  dpaV('L1', 24)  dpaV()  (off)
window.dpaV = async (mode, gap = 24) => {
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const st = document.getElementById('dpa-v') ||
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dpa-v' }));
  st.textContent = '';
  dispatchEvent(new Event('resize'));
  await sleep(1500);  // normal centered layout first

  const ed = $('#docs-editor'), sc = $('.kix-appview-editor'), p = $('.kix-page-paginated'),
        tiles = $('.kix-rotatingtilemanager');
  if (!ed || !sc || !p || !tiles) return console.warn('dpaV: Docs elements not found');
  const base = parseFloat(ed.style.width) || innerWidth;
  const r = p.getBoundingClientRect();
  const shiftR = Math.max(0, Math.round(sc.clientWidth - gap - r.right));  // how far right to move
  const shiftL = Math.max(0, Math.round(r.left - gap));                    // how far left to move
  const tilesLeft = parseFloat(tiles.style.left) || 0;
  const ruler = d => `.docs-ruler-inner{margin-left:${d}px !important}`;

  const CSS = {
    R1: `.kix-appview-editor{border-left:${shiftR}px solid transparent !important}` + ruler(shiftR),
    R2: `.kix-appview-editor{border-left:${shiftR}px solid transparent !important}` +
        `.kix-rotatingtilemanager{max-width:${Math.round(sc.clientWidth - shiftR - tilesLeft)}px !important}` + ruler(shiftR),
    L1: `.kix-appview-editor{margin-left:-${shiftL}px !important;width:${base + shiftL}px !important}` + ruler(-shiftL),
  };
  st.textContent = CSS[mode] || '';
  dispatchEvent(new Event('resize'));
  let last = 0;
  for (const t of [500, 1500, 3000, 6000]) {
    await sleep(t - last); last = t;
    const pr = $('.kix-page-paginated').getBoundingClientRect(), s = sc.getBoundingClientRect(),
          ri = $('.docs-ruler-inner');
    console.log(`dpaV ${mode || 'off'} +${t}ms: page x=${Math.round(pr.left)}..${Math.round(pr.right)} ` +
      `scroller x=${Math.round(s.left)}..${Math.round(s.right)} client=${sc.clientWidth} ` +
      `sideways=${sc.scrollWidth - sc.clientWidth} ruler x=${ri ? Math.round(ri.getBoundingClientRect().left) : '?'}`);
  }
};
console.log("dpaV ready: dpaV('R1', 24), dpaV('R2', 24), dpaV('L1', 24); dpaV() to turn off");
