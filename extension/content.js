// Docs Page Align — content script.
//
// How it works:
// - Docs centers the page inside its scrolling area (.kix-appview-editor). We leave that area covering
//   the whole window (so annotate.net and wheel scrolling work in the blank space) and shift the page
//   inside it:
//     right: a transparent left border on the scroller pushes its content right;
//     left:  the scroller is widened off the left edge of the screen, so its content sits further left.
//   Docs ignores both (it doesn't re-center), so the page stays exactly where we put it.
// - Docs maps clicks using where it *thinks* the page is, so every real mouse/pointer event over the
//   document is stopped and re-sent with its x position corrected by the shift.
// - The ruler is shifted by the same amount. The toolbar, menus, and title bar are never touched.
(() => {
  'use strict';

  // All selectors in one place. Update these when Google changes its class names.
  const SEL = {
    editor:   '#docs-editor',               // editor column; its width is set by Docs
    scroller: '.kix-appview-editor',        // scrolling document area; we shift its content
    tiles:    '.kix-rotatingtilemanager',   // holds the page canvases
    page:     '.kix-page-paginated',        // only exists in Pages mode (not Pageless)
    comments: '.kix-discussion-plugin',     // comment cards beside the page (inside the scroller)
    sidebar:  '.left-sidebar-container',    // outline panel / floating outline button
    ruler:    '.docs-ruler-inner',          // horizontal ruler contents
    contextMenu: '.goog-menu[role="menu"]', // Docs' right-click menu (we move it under the pointer)
    // Real DOM widgets inside the scroller that should get mouse events untouched.
    noRemap:  '.kix-discussion-plugin, input, textarea, button, a, [contenteditable="true"], [role="button"]',
  };

  const DEFAULTS = { align: 'center', gap: 24 };
  const root = document.documentElement;
  const $ = s => document.querySelector(s);

  let settings = { ...DEFAULTS };
  let shift = 0;          // px the page is currently moved (positive = right, negative = left)
  let lastStatus = '';

  // One injected stylesheet. Rules only match while <html data-dpa-align> is set.
  const style = document.createElement('style');
  style.id = 'docs-page-align';
  style.textContent = `
    html[data-dpa-align="right"] ${SEL.scroller} {
      border-left: var(--dpa-shift) solid transparent !important;
    }
    html[data-dpa-align="right"] ${SEL.tiles} {
      max-width: calc(100% - var(--dpa-tiles-left)) !important;  /* no sideways scrollbar */
    }
    html[data-dpa-align="left"] ${SEL.scroller} {
      margin-left: calc(-1 * var(--dpa-shift-abs)) !important;
      width: calc(100% + var(--dpa-shift-abs)) !important;
    }
    html[data-dpa-align] ${SEL.ruler} { margin-left: var(--dpa-shift) !important; }`;
  (document.head || root).appendChild(style);
  status('loaded');

  // ---------------------------------------------------------------- layout

  const OBS = { attributes: true, attributeFilter: ['style'] };
  const mo = new MutationObserver(() => schedule());

  let raf = 0;
  function schedule() {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; apply(); });
  }

  function visibleRect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }

  function apply() {
    const ed = $(SEL.editor), sc = $(SEL.scroller), tiles = $(SEL.tiles), page = $(SEL.page);
    [ed, tiles, $(SEL.sidebar)].forEach(el => el && mo.observe(el, OBS));

    // Fail safe: do nothing in center mode, in Pageless mode, or if anything expected is missing.
    if (settings.align === 'center') return clear('center selected, leaving Docs alone');
    const missing = Object.entries({ editor: ed, scroller: sc, tiles, page })
      .filter(([, el]) => !el).map(([k]) => SEL[k]);
    if (missing.length) return clear('not found (Pageless or still loading): ' + missing.join(', '));

    // Where Docs itself put the content, i.e. the current position minus our shift.
    const edRect = ed.getBoundingClientRect();
    const pr = page.getBoundingClientRect();
    const cr = visibleRect($(SEL.comments));
    const natLeft = pr.left - shift;
    const natRight = Math.max(pr.right, cr ? cr.right : 0) - shift;  // keep comment cards on screen
    const border = shift > 0 ? shift : 0;
    const scrollbar = sc.offsetWidth - sc.clientWidth - border;
    const gap = settings.gap;

    let next = 0;
    if (settings.align === 'right') {
      next = Math.round(edRect.right - scrollbar - gap - natRight);
      if (next <= 0) return clear('no room to move the page right');
    } else {
      const sb = visibleRect($(SEL.sidebar));
      const outlineOpen = sb && sb.width > 120;          // keep the page clear of an open outline panel
      const minLeft = edRect.left + (outlineOpen ? sb.right - edRect.left + gap : gap);
      next = Math.round(minLeft - natLeft);
      if (next >= 0) return clear('no room to move the page left');
    }
    root.style.setProperty('--dpa-tiles-left', (parseFloat(tiles.style.left) || 0) + 'px');
    if (Math.abs(next - shift) <= 1 && root.getAttribute('data-dpa-align') === settings.align) return;

    shift = next;
    root.style.setProperty('--dpa-shift', shift + 'px');
    root.style.setProperty('--dpa-shift-abs', Math.abs(shift) + 'px');
    root.setAttribute('data-dpa-align', settings.align);
    status(`applied ${settings.align}: page moved ${shift}px`);
  }

  function clear(reason) {
    if (reason) status(reason);
    shift = 0;
    if (!root.hasAttribute('data-dpa-align')) return;
    root.removeAttribute('data-dpa-align');
    ['--dpa-shift', '--dpa-shift-abs', '--dpa-tiles-left'].forEach(p => root.style.removeProperty(p));
  }

  // Logs to the page console only when the state changes (filter the console by "Docs Page Align").
  function status(msg) {
    if (msg !== lastStatus) { lastStatus = msg; console.info('[Docs Page Align] ' + msg); }
  }

  // ---------------------------------------------------------------- click correction

  // Docs converts mouse positions using where it thinks the page is (before our shift), so re-send
  // each real event over the document with clientX moved back by the shift.
  // 'contextmenu' is corrected too (Docs uses it to place the cursor), but Docs also opens its menu at
  // that corrected position, so moveMenu() slides the menu back under the real pointer afterwards.
  const TYPES = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'mousedown', 'mousemove',
                 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu'];
  let dragging = false;  // keep correcting a drag that started on the document, even outside it

  function remap(e) {
    if (!shift || !e.isTrusted) return;  // only real events; our re-sent copies pass straight through
    const sc = $(SEL.scroller);
    if (!sc) return;
    const target = e.target instanceof Element ? e.target : null;
    const onDoc = target && sc.contains(target) && !target.closest(SEL.noRemap);
    if (e.type === 'pointerdown' || e.type === 'mousedown') dragging = !!onDoc;
    if (!onDoc && !dragging) return;
    if (e.type === 'pointerup' || e.type === 'mouseup') setTimeout(() => { dragging = false; }, 0);

    e.stopImmediatePropagation();
    const init = {
      bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed, view: window, detail: e.detail,
      screenX: e.screenX - shift, screenY: e.screenY, clientX: e.clientX - shift, clientY: e.clientY,
      ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
      button: e.button, buttons: e.buttons, relatedTarget: e.relatedTarget,
    };
    if (e instanceof PointerEvent) Object.assign(init, {
      pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary,
      width: e.width, height: e.height, pressure: e.pressure,
    });
    if (!e.target.dispatchEvent(new e.constructor(e.type, init))) e.preventDefault();
    if (e.type === 'contextmenu') moveMenu(e.clientX - shift, e.clientY, shift);
  }

  // Find the menu Docs just opened at the corrected position (x, y) and move it by `delta` so it
  // sits under the real pointer. Docs may open it on a later frame, so look for a few frames.
  let menuSeq = 0;
  function moveMenu(x, y, delta) {
    const token = String(++menuSeq);  // Docs reuses the menu element, so mark it per right-click
    let tries = 0;
    const tick = () => {
      const menus = [...document.querySelectorAll(SEL.contextMenu)].filter(m => {
        const r = m.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && m.dataset.dpaMoved !== token &&
          (Math.abs(r.left - x) < 80 || Math.abs(r.right - x) < 80) && r.top - 20 <= y && y <= r.bottom + 20;
      });
      if (!menus.length) {
        if (++tries < 10) requestAnimationFrame(tick);
        else status('right-click menu not found to reposition: ' + SEL.contextMenu);
        return;
      }
      for (const m of menus) {
        const r = m.getBoundingClientRect();
        const left = Math.min(Math.max(0, r.left + delta), innerWidth - r.width);
        m.style.left = (parseFloat(m.style.left) || r.left) + (left - r.left) + 'px';
        m.dataset.dpaMoved = token;  // don't move the same menu twice for this click
      }
    };
    tick();
  }
  TYPES.forEach(t => window.addEventListener(t, remap, true));

  // ---------------------------------------------------------------- settings

  // Alignment belongs to this tab and Doc: every Doc opens centered, and the choice survives a reload
  // (sessionStorage) but not closing the tab. The gap is a global preference in chrome.storage.sync.
  const docId = (location.pathname.match(/\/document\/d\/([^/]+)/) || [])[1] || location.pathname;
  const ALIGN_KEY = 'docsPageAlign:' + docId;
  const validAlign = a => (['left', 'center', 'right'].includes(a) ? a : DEFAULTS.align);
  const validGap = g => Math.min(2000, Math.max(0, Math.round(Number(g)) || 0));

  try { settings.align = validAlign(sessionStorage.getItem(ALIGN_KEY)); } catch {}

  chrome.storage.sync.get({ gap: DEFAULTS.gap }, s => { settings.gap = validGap(s.gap); schedule(); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.gap) return;
    settings.gap = validGap(changes.gap.newValue);
    schedule();
  });

  // The popup reads and sets this tab's alignment.
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg && msg.type === 'dpa-set-align') {
      settings.align = validAlign(msg.align);
      try { sessionStorage.setItem(ALIGN_KEY, settings.align); } catch {}
      schedule();
    }
    if (msg && (msg.type === 'dpa-get-align' || msg.type === 'dpa-set-align')) reply({ align: settings.align });
  });

  window.addEventListener('resize', schedule);
  // Safety net for changes observers can't see cheaply (zoom re-layout, Pages <-> Pageless, panels).
  setInterval(() => { if (!document.hidden) schedule(); }, 1000);
})();
