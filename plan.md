# Photo Collage Maker — Implementation Plan

## Context

Build a browser-based photo collage maker inspired by [gandr.io](https://gandr.io/online-collage-maker.html). The app lets users combine multiple photos into a single collage with customizable layouts, spacing, and styles — then export at high resolution. Entirely client-side (no backend, no signups, privacy-first).

## Tech Stack

- **Vite + Vanilla JS** (ES modules) — no framework overhead; the complexity is in canvas rendering and layout algorithms, not UI state
- **HTML5 Canvas API** — for preview rendering and high-res export (no Fabric.js; layout is algorithmic, not freeform object manipulation)
- **Pure CSS** with custom properties — CSS Grid/Flexbox for app shell, no CSS framework needed
- **Zero runtime dependencies** — only Vite as a dev dependency

## UI Layout

```
+-------------------------------------------------------------------+
|  [Logo]   [Add Photos]        [Undo] [Redo]        [Export]       |  <- Toolbar (56px)
+----------+--------------------------------------------------------+
|          |                                                         |
| SIDEBAR  |                    CANVAS AREA                         |
| (280px)  |                                                         |
|          |          +----------------------------+                 |
| Layout   |          |  Photo 1  |   Photo 2     |                 |
|  Grid    |          |-----------|---------------|                 |
|  Brick   |          |  Photo 3  |   Photo 4     |                 |
|  Free    |          +----------------------------+                 |
|          |                                                         |
| Ratio    |          (canvas centered, maintains                    |
|  1:1     |           chosen aspect ratio)                          |
|  4:3 ... |                                                         |
|          |                                                         |
| Style    |                                                         |
|  Spacing |  +------------------------------------------------------+
|  Padding |  |  [thumb1] [thumb2] [thumb3] [+]    PHOTO STRIP      |
|  Radius  |  |                                    (100px)           |
|  BgColor |  |                                                      |
+----------+--+------------------------------------------------------+
```

## Core Architecture

### State Management — `Store.js`
Centralized pub/sub store holding all collage state:
- Canvas dimensions & aspect ratio
- Layout type & template selection
- Style settings (spacing, padding, border radius, bg color)
- Photos array (id, file, objectURL, crop offsets, zoom)
- Text overlays
- Computed cell positions (recomputed on layout/photo changes)

### Layout Engine — Pure functions: `(photos, canvas, spacing, layoutType) => Cell[]`
- **GridLayout.js** — Equal grid (2x2, 3x3, etc.) from templates or auto-computed
- **BrickLayout.js** — Masonry/row-packing based on photo aspect ratios
- **FreeformLayout.js** — Squarified treemap algorithm for organic arrangements

### Canvas Rendering — Two-canvas approach
- **Preview canvas** (`CanvasRenderer.js`) — CSS-sized, renders at devicePixelRatio for sharp display, redraws on state change via requestAnimationFrame
- **Export canvas** (`ExportRenderer.js`) — Created on-demand at export resolution (up to 10,000x10,000), scales all positions by export factor

### Undo/Redo — `History.js`
Snapshot-based (state is small metadata, not image data). 50-level undo stack. Ctrl+Z / Ctrl+Shift+Z.

## Project Structure

```
/var/www/collage-maker/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.js                    # App init, event wiring
    ├── style.css                  # Global styles, CSS custom props
    ├── core/
    │   ├── Store.js               # Reactive state store
    │   ├── History.js             # Undo/redo
    │   ├── EventBus.js            # Cross-component events
    │   └── constants.js           # Aspect ratios, layout presets
    ├── layout/
    │   ├── LayoutEngine.js        # Dispatcher
    │   ├── GridLayout.js          # Even grid algorithm
    │   ├── BrickLayout.js         # Masonry algorithm
    │   ├── FreeformLayout.js      # Treemap algorithm
    │   └── layoutTemplates.js     # Predefined grid templates
    ├── rendering/
    │   ├── CanvasRenderer.js      # Preview drawing
    │   ├── ExportRenderer.js      # High-res export
    │   └── ImageCache.js          # ImageBitmap cache
    ├── ui/
    │   ├── Toolbar.js
    │   ├── Sidebar.js
    │   ├── CanvasArea.js          # Canvas + mouse interactions
    │   ├── PhotoPanel.js          # Bottom thumbnail strip
    │   ├── SettingsPanel.js       # Spacing/radius/color controls
    │   ├── LayoutSelector.js
    │   ├── AspectRatioSelector.js
    │   ├── TextOverlay.js
    │   ├── ExportDialog.js
    │   ├── DropZone.js            # Drag-and-drop upload
    │   └── components/            # Slider, ColorPicker, Modal, etc.
    └── utils/
        ├── dom.js                 # DOM helpers
        ├── imageLoader.js         # File read, ImageBitmap decode
        ├── geometry.js            # Cover-fit, rect math
        ├── download.js            # Canvas-to-blob download
        └── uid.js                 # Unique ID generator
```

## Implementation Phases

### Phase 1: Scaffold + Canvas Rendering
- Init Vite project, file structure, app shell HTML/CSS
- `Store.js` with initial state and pub/sub
- `CanvasArea.js` — canvas element sized to viewport
- `CanvasRenderer.js` — fill background, draw placeholder cell rects
- `GridLayout.js` — basic equal-grid algorithm
- **Result**: App shell with a colored grid that responds to state changes

### Phase 2: Photo Import + Display
- `imageLoader.js` — file reading, ImageBitmap decoding, thumbnails
- `ImageCache.js` — bitmap cache with cleanup
- `DropZone.js` — drag-and-drop overlay
- Toolbar "Add Photos" button + file input
- `CanvasRenderer.js` — draw images with cover-fit and border-radius clipping
- `PhotoPanel.js` — bottom thumbnail strip with remove buttons
- Empty state: "Drop photos here" prompt
- **Result**: Users add photos and see them in a grid

### Phase 3: Layout Types + Aspect Ratios
- `BrickLayout.js` — row-packing masonry
- `FreeformLayout.js` — squarified treemap
- `LayoutSelector.js` — Grid/Brick/Freeform toggle + grid template thumbnails
- `AspectRatioSelector.js` — 12+ preset ratios
- `LayoutEngine.js` — dispatch to correct layout module
- **Result**: Switch between 3 layout types and 12+ aspect ratios

### Phase 4: Style Controls
- Reusable `Slider.js` and `ColorPicker.js` components
- `SettingsPanel.js` — spacing, padding, border radius sliders + bg color picker
- **Result**: Fine-tune visual style with real-time preview

### Phase 5: Canvas Interactions
- Hit-testing: which cell is under cursor
- Hover states on cells
- Scroll-to-zoom within a cell (cropZoom 1x-5x)
- Drag-to-pan photo within cell
- Drag between cells to swap photos
- Click to select, Delete to remove
- **Result**: Full interactive photo placement

### Phase 6: High-Res Export
- `ExportDialog.js` — format (PNG/JPEG), quality, resolution presets
- `ExportRenderer.js` — offscreen canvas at export resolution, scale all positions
- Browser canvas size limit detection, warn if exceeded
- `download.js` — programmatic download trigger
- **Result**: Download collage at up to 10,000x10,000px

### Phase 7: Text Overlays
- "Add Text" button, contenteditable div positioned over canvas
- Font family, size, color, bold/italic controls
- Drag to reposition, render to canvas via ctx.fillText
- Include in export
- **Result**: Add styled text to collage

### Phase 8: Undo/Redo + Polish
- `History.js` — 50-level snapshot undo/redo
- Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Delete)
- Empty state illustration, onboarding hints
- Error handling for unsupported formats, canvas size limits
- CSS polish: shadows, transitions, hover states

## Print-Focused Design

This app is primarily for print output. Key implications:

### Paper Size Presets (replacing screen ratios)
| Size | mm | Pixels at 300 DPI | Orientation |
|------|-----------|-------------------|-------------|
| A4 | 210 x 297 | 2480 x 3508 | Portrait |
| A4 | 297 x 210 | 3508 x 2480 | Landscape |
| A3 | 297 x 420 | 3508 x 4961 | Portrait |
| A3 | 420 x 297 | 4961 x 3508 | Landscape |
| A2 | 420 x 594 | 4961 x 7016 | Portrait |
| A2 | 594 x 420 | 7016 x 4961 | Landscape |

### Export
- Default 300 DPI — no DPI selector needed, always exports at print resolution
- Export dialog shows real-world dimensions (e.g., "A3 Landscape — 420 x 297 mm")
- Canvas internally works at full print resolution; preview is scaled down to fit viewport
- Format: PNG (lossless) default, JPEG option for smaller files

### Aspect Ratio Selector → Paper Size Selector
- Replace generic ratios (1:1, 16:9, etc.) with A4 / A3 / A2
- Orientation toggle (Portrait / Landscape) for each size
- Keep 1:1 (square) as an option for Instagram/social use

## Design Tokens

- **Primary**: #2563eb (blue-600)
- **Surface**: #ffffff
- **Text**: #1e293b (slate-800), secondary #64748b (slate-500)
- **Background**: #f8f9fa (sidebar), #e5e7eb (canvas area backdrop)
- **Font**: system stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- **Radii**: 8px panels, 6px buttons, 4px small elements
- **Shadows**: `0 1px 3px rgba(0,0,0,0.1)` panels, `0 4px 12px rgba(0,0,0,0.15)` canvas

## Verification

1. `npm run dev` — app loads, shows empty canvas with drop zone
2. Drag photos onto canvas — they appear in a grid layout
3. Switch layout types (Grid/Brick/Freeform) — canvas updates instantly
4. Change aspect ratio — canvas reshapes, photos reflow
5. Adjust spacing/padding/radius/color sliders — real-time preview
6. Scroll on a cell to zoom, drag to pan — photo adjusts within cell
7. Drag between cells — photos swap
8. Click Export, choose settings, download — verify resolution and quality
9. Add text, reposition, style — verify renders on canvas and in export
10. Ctrl+Z / Ctrl+Shift+Z — undo/redo works across all operations
