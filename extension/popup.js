// Docs Page Align — popup.
// Alignment applies to the Doc or presentation in the current tab only (new ones open centered).
// The gap and Slides' white background are global preferences saved in chrome.storage.sync;
// open tabs pick them up live.
const gapRange = document.getElementById('gapRange');
const gapNum = document.getElementById('gapNum');
const alignBox = document.getElementById('align');
const alignNote = document.getElementById('alignNote');
const whiteBg = document.getElementById('whiteBg');
let tabId = null;

chrome.storage.sync.remove('align');  // alignment used to be global; clear the old saved value

chrome.storage.sync.get({ gap: 24, whiteBg: true }, s => {
  gapRange.value = gapNum.value = s.gap;
  whiteBg.checked = s.whiteBg !== false;
});
whiteBg.addEventListener('change', () => chrome.storage.sync.set({ whiteBg: whiteBg.checked }));

// Slides gets its own wording and the white background option.
function showApp(app) {
  if (app !== 'slides') return;
  document.getElementById('alignLabel').textContent = 'Slide position (this presentation only)';
  document.getElementById('whiteRow').hidden = false;
  document.getElementById('footNote').textContent =
    'Applies in the editor and while a slideshow is playing. New presentations open centered. ' +
    'The gap and background apply to all presentations.';
}

function showAlign(align) {
  const radio = document.querySelector(`input[name=align][value="${align}"]`);
  if (radio) radio.checked = true;
}

// Ask the current tab's content script for its alignment. No answer means it isn't a Google Doc
// (or it was opened before the extension was loaded and needs a reload).
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab) return;
  tabId = tab.id;
  chrome.tabs.sendMessage(tabId, { type: 'dpa-get-align' }, res => {
    if (chrome.runtime.lastError || !res) {
      alignBox.classList.add('disabled');
      alignNote.textContent = 'Open a Google Doc or Slides presentation (reload it if it was already open) to set its position.';
      return;
    }
    showApp(res.app);
    showAlign(res.align);
  });
});

alignBox.addEventListener('change', e => {
  if (tabId == null) return;
  chrome.tabs.sendMessage(tabId, { type: 'dpa-set-align', align: e.target.value }, () => void chrome.runtime.lastError);
});

// Debounce gap writes: storage.sync limits how often it can be written.
let timer = 0;
function saveGap(v) {
  const gap = Math.min(2000, Math.max(0, Math.round(Number(v)) || 0));
  gapRange.value = gapNum.value = gap;
  clearTimeout(timer);
  timer = setTimeout(() => chrome.storage.sync.set({ gap }), 300);
}
gapRange.addEventListener('input', () => saveGap(gapRange.value));
gapNum.addEventListener('input', () => saveGap(gapNum.value));
