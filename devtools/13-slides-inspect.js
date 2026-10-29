// Docs Page Align — Slides slideshow inspector (read-only).
// Start a slideshow, leave full screen, then paste into the DevTools Console of the presentation tab.
// Prints where the slide is and which elements paint the background around it, and copies the report.
(() => {
  const out = [];
  const log = s => out.push(s);
  const cls = el => (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
  const name = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    cls(el).map(c => '.' + c).join('')).slice(0, 160);
  const desc = el => {
    const cs = el.ownerDocument.defaultView.getComputedStyle(el), r = el.getBoundingClientRect();
    const st = (el.getAttribute('style') || '').replace(/\s+/g, ' ').slice(0, 200);
    return name(el) +
      `\n      rect x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)}` +
      ` | pos=${cs.position} bg=${cs.backgroundColor} tf=${cs.transform} translate=${cs.translate}` +
      (st ? `\n      style="${st}"` : '');
  };

  const docs = [{ label: 'top page', doc: document }];
  document.querySelectorAll('iframe').forEach((f, i) => {
    try { if (f.contentDocument) docs.push({ label: `iframe[${i}] ${name(f)}`, doc: f.contentDocument, frame: f }); } catch {}
  });

  for (const { label, doc, frame } of docs) {
    const content = doc.querySelector('.sketchyViewerContent');
    const svgs = [...doc.querySelectorAll('svg')].filter(s => s.getBoundingClientRect().width > 200);
    if (!content && !svgs.length) continue;
    const w = doc.defaultView;
    log(`\n=== ${label}  viewport ${w.innerWidth}x${w.innerHeight} ===`);
    if (frame) log('  frame: ' + desc(frame));
    log('  html data-dpa-*: ' + [...doc.documentElement.attributes].filter(a => a.name.startsWith('data-dpa')).map(a => a.name).join(' '));
    log('\n  punch-* classes: ' + [...new Set([...doc.querySelectorAll('[class*="punch"]')].flatMap(cls).filter(c => c.startsWith('punch')))].slice(0, 80).join(' '));
    log('\n  -- large svgs --');
    svgs.slice(0, 5).forEach(s => log('    ' + desc(s)));
    const start = content || svgs[0];
    log('\n  -- chain from slide box to html --');
    for (let el = start, i = 0; el && i < 30; el = el.parentElement, i++) log(`    [${i}] ` + desc(el));
    log('\n  -- big opaque elements (possible black backdrop) --');
    [...doc.querySelectorAll('body *')].filter(el => {
      const r = el.getBoundingClientRect(), bg = w.getComputedStyle(el).backgroundColor;
      return r.width > w.innerWidth * 0.8 && r.height > w.innerHeight * 0.8 && bg !== 'rgba(0, 0, 0, 0)';
    }).slice(0, 15).forEach(el => log('    ' + desc(el)));
  }

  if (!out.length) out.push('No slideshow found. Start one (Slideshow button), then run this again.');
  const text = out.join('\n');
  console.log(text);
  try { copy(text); console.log('(report copied to clipboard)'); } catch {}
})();
