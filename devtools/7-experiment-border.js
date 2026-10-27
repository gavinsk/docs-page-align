// Docs Page Align — experiment 5: give the scrolling area a wide transparent border on one side.
// The scroller keeps its full on-screen size (so annotate.net and the wheel still cover the blank
// area), but its inner content area shrinks, which may make Docs lay the page out to one side.
// Commands:  dpaB('left')   dpaB('right')   dpaB()  (off)
window.dpaB = async (side, px = 900) => {
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const st = document.getElementById('dpa-b') ||
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dpa-b' }));
  const edge = side === 'left' ? 'right' : 'left';  // page left => blank border on the right
  st.textContent = side ? `.kix-appview-editor{border-${edge}:${px}px solid transparent !important}` : '';
  dispatchEvent(new Event('resize'));
  const sc = $('.kix-appview-editor');
  let last = 0;
  for (const t of [500, 1500, 3000, 6000]) {
    await sleep(t - last); last = t;
    const p = $('.kix-page-paginated').getBoundingClientRect(), r = sc.getBoundingClientRect();
    console.log(`dpaB ${side || 'off'} +${t}ms: page x=${Math.round(p.left)}..${Math.round(p.right)} ` +
      `scroller x=${Math.round(r.left)}..${Math.round(r.right)} client=${sc.clientWidth} ` +
      `sideways=${sc.scrollWidth - sc.clientWidth}`);
  }
};
console.log("dpaB ready: type dpaB('left') or dpaB('right'); dpaB() to turn off");
