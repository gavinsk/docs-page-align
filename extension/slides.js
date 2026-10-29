// Docs Page Align — Google Slides content script.
//
// Moves the slide to the left or right edge, and can paint the area around it white, in two places:
// - The editor: the slide sits centered in #workspace-container; we translate that area's contents.
// - A slideshow playing in the window (e.g. after leaving full screen so the menu bar shows). Slides
//   draws it in a same-origin iframe (or in the page itself for /present links), so we find it,
//   inject our stylesheet into its document, and translate the slide box.
// Slides works out what was clicked from where the slide really is on screen, so a CSS translate is
// all that's needed; unlike Docs, no event remapping.
(() => {
  'use strict';

  // All selectors in one place. Update these when Google changes its class names.
  const SEL = {
    workspace: '#workspace-container',            // editor: area around the slide; its children move
    canvas:    '#canvas-container',               // editor: the slide box, measured for its position
    ruler:     '#sketchy-horizontal-ruler',       // editor: horizontal ruler; its children move too
    content:   '.sketchyViewerBody .sketchyViewerContent',  // slideshow: positioned slide box; we translate it
    slide:     '.punch-viewer-svgpage-svgcontainer',        // slideshow: the drawn slide, measured
  };

  const DEFAULTS = { align: 'center', gap: 24, whiteBg: true };
  let settings = { ...DEFAULTS };
  let edShift = 0;        // px the editor slide is moved (positive = right, negative = left)
  let shift = 0;          // px the slideshow slide is moved
  let cur = null;         // { doc, frame, content } of the slideshow we're attached to
  const lastStatus = {};

  // Editor and slideshow use separate attributes: for /present links both live in the same document.
  const CSS = `
    html[data-dpa-ed-align] ${SEL.workspace} > *, html[data-dpa-ed-align] ${SEL.ruler} > * {
      translate: var(--dpa-ed-shift) 0 !important;
    }
    html[data-dpa-ed-white] ${SEL.workspace} { background: #fff !important; }
    html[data-dpa-align] ${SEL.content} { translate: var(--dpa-shift) 0 !important; }
    html[data-dpa-white], html[data-dpa-white] body, [data-dpa-backdrop] { background: #fff !important; }`;

  function ensureStyle(doc) {
    if (doc.getElementById('docs-page-align')) return;
    const style = doc.createElement('style');
    style.id = 'docs-page-align';
    style.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(style);
  }
  ensureStyle(document);
  status('page', 'loaded');

  // ---------------------------------------------------------------- layout

  const OBS = { attributes: true, attributeFilter: ['style'] };
  const mo = new MutationObserver(() => schedule());      // slideshow re-layout
  const edMo = new MutationObserver(() => schedule());    // editor re-layout (resize, zoom, panels)
  let edCanvas = null;

  let raf = 0;
  function schedule() {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; applyEditor(); applyShow(); });
  }

  function visibleRect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }

  // How far to move a slide (rect, currently moved by `moved`) so it sits `gap` px inside the
  // [lo, hi] edges. 0 means centered, or no spare room on that side.
  function nextShift(rect, moved, lo, hi) {
    const natLeft = rect.left - moved, natRight = rect.right - moved;  // where Slides itself put it
    const next = Math.round(settings.align === 'left' ? lo + settings.gap - natLeft : hi - settings.gap - natRight);
    if (settings.align === 'left') return next < 0 ? next : 0;
    if (settings.align === 'right') return next > 0 ? next : 0;
    return 0;
  }

  // ---- editor

  function applyEditor() {
    const root = document.documentElement;
    const ws = $(SEL.workspace), canvas = $(SEL.canvas);
    const wr = visibleRect(ws), cr = visibleRect(canvas);
    if (!wr || !cr) { clearEditor(); return status('editor', 'editor slide not found: ' + SEL.canvas); }
    if (canvas !== edCanvas) { edMo.disconnect(); edMo.observe(canvas, OBS); edCanvas = canvas; }

    root.toggleAttribute('data-dpa-ed-white', settings.whiteBg);

    const next = nextShift(cr, edShift, wr.left, wr.right);
    if (!next) return clearEditor(settings.align === 'center' ? 'editor: centered' : `editor: no room to move the slide ${settings.align}`);
    if (Math.abs(next - edShift) <= 1 && root.getAttribute('data-dpa-ed-align') === settings.align) return;
    edShift = next;
    root.style.setProperty('--dpa-ed-shift', edShift + 'px');
    root.setAttribute('data-dpa-ed-align', settings.align);
    status('editor', `editor: applied ${settings.align}, slide moved ${edShift}px`);
  }

  function clearEditor(reason) {
    if (reason) status('editor', reason);
    edShift = 0;
    document.documentElement.removeAttribute('data-dpa-ed-align');
    document.documentElement.style.removeProperty('--dpa-ed-shift');
  }

  // ---- slideshow

  // The playing slideshow: in this page, or in a same-origin iframe (Slideshow button in the editor).
  function findShow() {
    const look = (doc, frame) => {
      const content = [...doc.querySelectorAll(SEL.content)].find(visibleRect);
      return content ? { doc, frame, content } : null;
    };
    const here = look(document, null);
    if (here) return here;
    for (const frame of document.querySelectorAll('iframe')) {
      let doc = null;
      try { doc = frame.contentDocument; } catch {}
      const found = doc && visibleRect(frame) && look(doc, frame);
      if (found) return found;
    }
    return null;
  }

  function applyShow() {
    const show = findShow();
    if (!show) { detach(); return status('show', 'no slideshow playing'); }
    if (!cur || cur.doc !== show.doc || cur.content !== show.content) {
      detach();
      cur = show;
      ensureStyle(cur.doc);
      mo.observe(cur.content, OBS);
      if (cur.doc !== document) cur.doc.defaultView.addEventListener('resize', schedule);
      status('show', 'slideshow found');
    }
    const root = cur.doc.documentElement;

    // White letterbox: the slide box's ancestors (and the iframe) are what show around the slide.
    if (settings.whiteBg) {
      root.setAttribute('data-dpa-white', '');
      for (let el = cur.content.parentElement; el; el = el.parentElement) el.setAttribute('data-dpa-backdrop', '');
      if (cur.frame) cur.frame.setAttribute('data-dpa-backdrop', '');
    } else {
      unwhite();
    }

    const r = visibleRect(cur.content.querySelector(SEL.slide)) || visibleRect(cur.content);
    const next = nextShift(r, shift, 0, root.clientWidth);
    if (!next) return unalign(settings.align === 'center' ? 'slideshow: centered' : `slideshow: no room to move the slide ${settings.align}`);
    if (Math.abs(next - shift) <= 1 && root.getAttribute('data-dpa-align') === settings.align) return;
    shift = next;
    root.style.setProperty('--dpa-shift', shift + 'px');
    root.setAttribute('data-dpa-align', settings.align);
    status('show', `slideshow: applied ${settings.align}, slide moved ${shift}px`);
  }

  function unalign(reason) {
    if (reason) status('show', reason);
    shift = 0;
    if (!cur) return;
    cur.doc.documentElement.removeAttribute('data-dpa-align');
    cur.doc.documentElement.style.removeProperty('--dpa-shift');
  }

  function unwhite() {
    if (!cur) return;
    cur.doc.documentElement.removeAttribute('data-dpa-white');
    cur.doc.querySelectorAll('[data-dpa-backdrop]').forEach(el => el.removeAttribute('data-dpa-backdrop'));
    if (cur.frame) cur.frame.removeAttribute('data-dpa-backdrop');
  }

  function detach() {
    if (!cur) return;
    unalign();
    unwhite();
    mo.disconnect();
    try { cur.doc.defaultView.removeEventListener('resize', schedule); } catch {}
    cur = null;
  }

  function $(s) { return document.querySelector(s); }

  // Logs to the page console only when a state changes (filter the console by "Docs Page Align").
  function status(key, msg) {
    if (msg !== lastStatus[key]) { lastStatus[key] = msg; console.info('[Docs Page Align] Slides ' + msg); }
  }

  // ---------------------------------------------------------------- settings

  // Alignment belongs to this tab and presentation: every presentation opens centered, and the choice
  // survives a reload (sessionStorage) but not closing the tab. Gap and white background are global
  // preferences in chrome.storage.sync.
  const fileId = (location.pathname.match(/\/presentation\/d\/([^/]+)/) || [])[1] || location.pathname;
  const ALIGN_KEY = 'docsPageAlign:slides:' + fileId;
  const validAlign = a => (['left', 'center', 'right'].includes(a) ? a : DEFAULTS.align);
  const validGap = g => Math.min(2000, Math.max(0, Math.round(Number(g)) || 0));

  try { settings.align = validAlign(sessionStorage.getItem(ALIGN_KEY)); } catch {}

  chrome.storage.sync.get({ gap: DEFAULTS.gap, whiteBg: DEFAULTS.whiteBg }, s => {
    settings.gap = validGap(s.gap);
    settings.whiteBg = s.whiteBg !== false;
    schedule();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.gap) settings.gap = validGap(changes.gap.newValue);
    if (changes.whiteBg) settings.whiteBg = changes.whiteBg.newValue !== false;
    schedule();
  });

  // The popup reads and sets this tab's alignment.
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg && msg.type === 'dpa-set-align') {
      settings.align = validAlign(msg.align);
      try { sessionStorage.setItem(ALIGN_KEY, settings.align); } catch {}
      schedule();
    }
    if (msg && (msg.type === 'dpa-get-align' || msg.type === 'dpa-set-align')) {
      reply({ align: settings.align, app: 'slides' });
    }
  });

  window.addEventListener('resize', schedule);
  // Notices a slideshow starting or ending, and anything the observers miss.
  setInterval(() => { if (!document.hidden) schedule(); }, 500);
})();
