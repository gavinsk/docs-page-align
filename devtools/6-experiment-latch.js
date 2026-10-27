// Docs Page Align — experiment 4: show Docs a fake editor width just long enough for it to lay out the
// page, then restore the real width without telling Docs. Checks whether the page stays put.
// Commands:  dpa.left()   dpa.right(24)   dpa.off()
(() => {
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const st = document.getElementById('dpa-exp') ||
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dpa-exp' }));
  st.textContent = '';
  let run = 0;

  const snap = label => {
    const sc = $('.kix-appview-editor'), p = $('.kix-page-paginated'), ri = $('.docs-ruler-inner');
    if (!sc || !p) return console.warn('dpa: Docs elements not found');
    const r = p.getBoundingClientRect(), s = sc.getBoundingClientRect();
    console.log(`dpa ${label}: page x=${Math.round(r.left)}..${Math.round(r.right)} ` +
      `scroller x=${Math.round(s.left)}..${Math.round(s.right)} client=${sc.clientWidth} ` +
      `sideways=${sc.scrollWidth - sc.clientWidth} ruler x=${ri ? Math.round(ri.getBoundingClientRect().left) : '?'}`);
  };

  async function latch(side, gap) {
    const id = ++run;
    st.textContent = '';
    dispatchEvent(new Event('resize'));        // start from Docs' normal centered layout
    await sleep(400);
    const ed = $('#docs-editor'), sc = $('.kix-appview-editor'), p = $('.kix-page-paginated');
    if (!ed || !sc || !p) return console.warn('dpa: Docs elements not found');
    const base = parseFloat(ed.style.width) || innerWidth;
    const r = p.getBoundingClientRect();
    const pageW = r.width + 20;                 // page plus Docs' inset
    // Fake width: narrow pushes the page left; wide pushes the centered page right.
    const fake = side === 'left'
      ? Math.round(pageW + 2 * 100 + (sc.offsetWidth - sc.clientWidth))
      : Math.round(base + 2 * ((sc.clientWidth - gap) - r.right));
    snap('before');
    st.textContent = `#docs-editor{width:${fake}px !important}`;
    dispatchEvent(new Event('resize'));        // Docs measures the fake width and lays out the page
    await sleep(400);
    snap(`with fake width ${fake}`);
    st.textContent = '';                        // restore the real width, no resize event
    await sleep(300);
    if (id !== run) return;
    snap('restored, +0.3s');
    await sleep(3000);
    if (id === run) snap('restored, +3s');
    await sleep(10000);
    if (id === run) snap('restored, +13s');
  }

  window.dpa = {
    left() { latch('left', 0); },
    right(gap = 24) { latch('right', gap); },
    off() { run++; st.textContent = ''; dispatchEvent(new Event('resize')); console.log('dpa: off'); },
  };
  console.log("dpa ready: type dpa.left() or dpa.right(24)");
})();
