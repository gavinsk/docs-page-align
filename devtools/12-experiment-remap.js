// Docs Page Align — experiment 10: shift the page inside the full-width scroller (R1 / L1 from before,
// where annotate.net, scrolling and the ruler all worked), then correct mouse positions for Docs.
// Each real mouse/pointer event over the document is stopped and re-sent with clientX moved back by
// the shift, so Docs maps the click to where the page really is.
// Commands:  dpaX('R', 24)   dpaX('L', 24)   dpaX()  (off)
(() => {
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const TYPES = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'mousedown', 'mousemove',
                 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu'];
  let delta = 0, pressed = false, count = 0;

  function remap(e) {
    if (!delta || !e.isTrusted) return;                 // only real events; our re-sent ones pass through
    const sc = $('.kix-appview-editor');
    if (!sc) return;
    const r = sc.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom &&
                   sc.contains(e.target);
    if (e.type === 'pointerdown' || e.type === 'mousedown') pressed = inside;
    if (!inside && !pressed) return;                     // keep dragging remapped even outside the scroller
    if (e.type === 'pointerup' || e.type === 'mouseup') setTimeout(() => { pressed = false; }, 0);

    e.stopImmediatePropagation();
    const init = {
      bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed, view: window, detail: e.detail,
      screenX: e.screenX - delta, screenY: e.screenY, clientX: e.clientX - delta, clientY: e.clientY,
      ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
      button: e.button, buttons: e.buttons, relatedTarget: e.relatedTarget,
    };
    if (e instanceof PointerEvent) Object.assign(init, {
      pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary,
      width: e.width, height: e.height, pressure: e.pressure,
    });
    const clone = new e.constructor(e.type, init);
    if (!e.target.dispatchEvent(clone)) e.preventDefault();
    if (e.type === 'mousedown') console.log(`dpaX: mousedown re-sent ${++count} (x ${e.clientX} -> ${e.clientX - delta})`);
  }
  TYPES.forEach(t => window.addEventListener(t, remap, true));

  const st = document.getElementById('dpa-x') ||
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dpa-x' }));

  window.dpaX = async (side, gap = 24) => {
    delta = 0;
    st.textContent = '';
    await sleep(1500);
    if (!side) return console.log('dpaX: off');
    const ed = $('#docs-editor'), sc = $('.kix-appview-editor'), p = $('.kix-page-paginated');
    if (!ed || !sc || !p) return console.warn('dpaX: Docs elements not found');
    const base = parseFloat(ed.style.width) || innerWidth;
    const r = p.getBoundingClientRect();
    const ruler = d => `.docs-ruler-inner{margin-left:${d}px !important}`;
    if (side === 'R') {
      const s = Math.max(0, Math.round(sc.clientWidth - gap - r.right));
      st.textContent = `.kix-appview-editor{border-left:${s}px solid transparent !important}` + ruler(s);
    } else {
      const s = Math.max(0, Math.round(r.left - gap));
      st.textContent = `.kix-appview-editor{margin-left:-${s}px !important;width:${base + s}px !important}` + ruler(-s);
    }
    await sleep(1500);
    delta = Math.round(p.getBoundingClientRect().left - r.left);  // how far the page actually moved
    console.log(`dpaX ${side}: page moved ${delta}px; click and select now`);
  };
  console.log("dpaX ready: dpaX('R', 24) or dpaX('L', 24); dpaX() to turn off");
})();
