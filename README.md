# Docs Page Align

A small Chrome extension (Manifest V3) that moves the Google Docs page to the **left** or **right** side of the window instead of centering it, leaving a wide blank area on the other side. It was built for annotating Docs with [annotate.net](https://annotate.net) while scrolling.

It also works in the **Google Slides** editor, and in slideshows played in the browser window (for example after leaving full screen so the menu bar stays visible): a 4:3 slide can be pushed to one side to leave a wide blank area, and the background around the slide can be white instead of black for annotation ink contrast.

- The toolbar, menus, and title bar are never changed.
- Clicking, selecting, double/triple-click, right-click menus, popups, and dragging all stay accurate.
- The ruler moves with the page.
- The blank area stays part of Docs' scrolling area, so annotation tools and the mouse wheel work there.
- Pageless documents are left alone.
- No network requests, no analytics, no remote code. Only the `storage` permission.

## Install (load unpacked)

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `extension` folder.
4. Pin the extension, then reload any open Google Docs tabs.

## Use

Click the extension icon on a Google Doc:

- **Page position**: Left, Center, or Right. This applies to the Doc in the current tab only. Every Doc opens centered; the choice survives a reload but not closing the tab.
- **Gap from screen edge**: how far (in px) the page sits from the edge it's pushed toward. This applies to all Docs.

Works in Pages layout only (File → Page setup → Pages).

On a Google Slides presentation the same popup sets the **slide position** for that presentation, plus:

- **White background around the slide** (on by default, applies to all presentations).

The slide moves in the editor and in a playing slideshow, but only if there's spare width beside it (e.g. a 4:3 slide in a wide window, with editor zoom set to Fit). In the editor, the area around the slide turns white; in a slideshow, the black letterbox does.

## How it works

Google Docs centers the page inside its scrolling area and maps mouse clicks using its own internal idea of where the page is, so simply moving the page with CSS makes clicks land in the wrong place. The extension:

1. Keeps Docs' scrolling area (`.kix-appview-editor`) covering the whole window and shifts its content:
   - **Right**: a transparent left border on the scrolling area.
   - **Left**: the scrolling area is widened off the left edge of the screen.
2. Shifts the ruler by the same amount.
3. Re-sends each real mouse/pointer event over the document with its x position corrected by the shift, so Docs places the cursor where you actually clicked. The right-click menu is then moved back under the pointer.
4. Re-checks the layout after resizes, zoom changes, side panels opening/closing, and once a second.

For Slides, the slide is real DOM (SVG) and Slides works out clicks from where it really is on screen, so a CSS translate is enough and no event correction is needed. In the editor the extension translates the contents of `#workspace-container` and the ruler; in a slideshow (drawn in a same-origin iframe) it translates the slide box (`.sketchyViewerContent`) and sets a white background on the elements around it. Its selectors are in the `SEL` object at the top of `extension/slides.js`; `devtools/13-slides-inspect.js` reports the slideshow's DOM if they stop matching.

All Google Docs selectors are in the `SEL` object at the top of `extension/content.js`. If a Docs update breaks the extension, filter the DevTools console by `Docs Page Align` to see what it reports.

## Files

| Path | Purpose |
|---|---|
| `extension/manifest.json` | Extension manifest |
| `extension/content.js` | Shifts the page, ruler, and mouse events on Docs pages |
| `extension/slides.js` | Moves the slide and whitens the background in the Slides editor and slideshows |
| `extension/popup.html`, `popup.js` | Settings popup |
| `devtools/` | Console snippets used to investigate the Docs DOM while building this. Not part of the extension; handy for diagnosing future Docs changes. |

## Known limitations

- Dragging ruler indent/margin markers isn't position-corrected.
- Google can change Docs' internal class names at any time, which may require updating the selectors.

## License

[MIT](LICENSE)
