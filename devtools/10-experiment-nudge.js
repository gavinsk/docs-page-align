// Docs Page Align — experiment 8: same shifts as experiment 7, then "nudge" the scroller's width by 1px
// and back so Docs re-measures where the scroller is (theory: Docs caches the scroller's screen
// position and only refreshes it when the scroller's size changes).
// Commands:  dpaN('L1', 24)   dpaN('R1', 24)   dpaN()  (off)
window.dpaN = async (mode, gap = 24) => {
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const st = document.getElementById('dpa-n') ||
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dpa-n' }));
  const log = label => {
    const pr = $('.kix-page-paginated').getBoundingClientRect(), s = $('.kix-appview-editor').getBoundingClientRect();
    console.log(`dpaN ${mode || 'off'} ${label}: page x=${Math.round(pr.left)}..${Math.round(pr.right)} ` +
      `scroller x=${Math.round(s.left)}..${Math.round(s.right)}`);
  };
  st.textContent = '';
  dispatchEvent(new Event('resize'));
  await sleep(1500);
  if (!mode) return log('done');

  const ed = $('#docs-editor'), sc = $('.kix-appview-editor'), p = $('.kix-page-paginated');
  if (!ed || !sc || !p) return console.warn('dpaN: Docs elements not found');
  const base = parseFloat(ed.style.width) || innerWidth;
  const r = p.getBoundingClientRect();
  const shiftR = Math.max(0, Math.round(sc.clientWidth - gap - r.right));
  const shiftL = Math.max(0, Math.round(r.left - gap));
  const ruler = d => `.docs-ruler-inner{margin-left:${d}px !important}`;

  // Each mode: [shift CSS with normal width, same with width 1px smaller]
  const CSS = {
    L1: w => `.kix-appview-editor{margin-left:-${shiftL}px !important;width:${w}px !important}` + ruler(-shiftL),
    R1: w => `.kix-appview-editor{border-left:${shiftR}px solid transparent !important;width:${w}px !important}` + ruler(shiftR),
  };
  const full = mode === 'L1' ? base + shiftL : base;
  st.textContent = CSS[mode](full);
  await sleep(2000);
  log('shifted');
  st.textContent = CSS[mode](full - 1);   // nudge: size change makes Docs re-measure
  await sleep(2000);
  log('nudged');
  st.textContent = CSS[mode](full);       // back to the real size
  await sleep(2000);
  log('ready — test clicking now');
};
console.log("dpaN ready: dpaN('L1', 24) or dpaN('R1', 24); dpaN() to turn off");
