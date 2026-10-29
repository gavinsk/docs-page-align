// Docs Page Align — Slides editor inspector + experiment.
// Paste into the DevTools Console of a Slides presentation in the normal editor (zoom: Fit).
// 1. Prints the DOM around the slide canvas and copies the report to the clipboard.
// 2. Adds commands to move the slide and test whether Slides still maps clicks correctly:
//      dpaS(-150)          move everything in the slide area 150px left (CSS only)
//      dpaS(-150, true)    same, and also re-send mouse events with x corrected (the Docs fix)
//      dpaS()              undo
(() => {
  const out = [];
  const log = s => out.push(s);
  const $ = s => document.querySelector(s);
  const cls = el => (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
  const name = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    cls(el).map(c => '.' + c).join('')).slice(0, 160);
  const desc = el => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const st = (el.getAttribute('style') || '').replace(/\s+/g, ' ').slice(0, 200);
    return name(el) +
      `\n      rect x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)}` +
      ` | pos=${cs.position} bg=${cs.backgroundColor} ovf=${cs.overflowX}/${cs.overflowY} tf=${cs.transform}` +
      (el.getAttribute('transform') ? ` svg-tf="${el.getAttribute('transform')}"` : '') +
      (st ? `\n      style="${st}"` : '');
  };
  const tree = (el, depth, max, indent = '    ') => {
    if (!el || depth > max) return;
    log(indent + desc(el));
    [...el.children].slice(0, 12).forEach(c => tree(c, depth + 1, max, indent + '  '));
  };

  const ws = $('#workspace-container');
  log(`=== ENV === innerWidth=${innerWidth} innerHeight=${innerHeight} dpr=${devicePixelRatio}`);
  if (!ws) {
    log('#workspace-container not found');
  } else {
    log('\n=== CHAIN: #workspace-container -> html ===');
    for (let el = ws, i = 0; el && i < 15; el = el.parentElement, i++) log(`  [${i}] ` + desc(el));
    log('\n=== TREE under #workspace-container (4 levels) ===');
    tree(ws, 0, 4);
    const svg = ws.querySelector('svg');
    if (svg) {
      log('\n=== SVG children with a smaller box than the svg (slide candidates) ===');
      const sr = svg.getBoundingClientRect();
      [...svg.querySelectorAll('g, rect, path')].slice(0, 400).map(el => [el, el.getBoundingClientRect()])
        .filter(([, r]) => r.width > sr.width * 0.4 && r.height > sr.height * 0.4 && r.width < sr.width - 2)
        .slice(0, 8).forEach(([el]) => log('    ' + desc(el) + (el.id ? '' : '') ));
    }
  }
  for (const sel of ['.docs-ruler', '#docs-ruler', '.punch-ruler', '[class*="ruler"]', '#speakernotes', '.punch-speaker-notes']) {
    const el = $(sel);
    if (el) log(`\n${sel}: ` + desc(el));
  }
  const text = out.join('\n');
  console.log(text);
  try { copy(text); console.log('(report copied to clipboard)'); } catch {}

  // ---------------------------------------------------------------- experiment
  const TYPES = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'mousedown', 'mousemove',
                 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu'];
  let delta = 0, fix = false, pressed = false;
  function remap(e) {
    if (!delta || !fix || !e.isTrusted) return;
    const w = $('#workspace-container');
    const inside = w && w.contains(e.target);
    if (e.type === 'pointerdown' || e.type === 'mousedown') pressed = inside;
    if (!inside && !pressed) return;
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
    if (!e.target.dispatchEvent(new e.constructor(e.type, init))) e.preventDefault();
  }
  TYPES.forEach(t => window.addEventListener(t, remap, true));

  const st = document.getElementById('dpa-s') ||
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dpa-s' }));
  window.dpaS = (px = 0, withFix = false) => {
    delta = px; fix = withFix;
    st.textContent = px ? `#workspace-container > * { translate: ${px}px 0 !important; }` : '';
    console.log(px ? `dpaS: moved ${px}px, click correction ${fix ? 'ON' : 'OFF'}. Now click/drag shapes and text.`
                   : 'dpaS: off');
  };
  console.log('dpaS ready: dpaS(-150) | dpaS(-150, true) | dpaS()');
})();
