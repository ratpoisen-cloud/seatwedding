# WeddingPlanner V3 — Project State

## Stack
- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Zustand 5 (2 stores: app data + modal UI)
- Firebase Firestore (real-time sync)
- Framer Motion 12 (modals)
- Lucide React (icons)
- SheetJS/xlsx (Excel export)
- html-to-image (PNG screenshot)

## Project Structure
```
src/
├── store.ts              # Zustand store: guests, tables, landmark, tagColors
├── firebase.ts           # Firebase init + subscribeToWedding / saveWeddingData
├── utils.ts              # cn() — clsx + tailwind-merge
├── App.tsx               # Root: Firebase init, modals, screenshot/export
├── index.css             # Tailwind @import + custom theme (colors, fonts)
├── main.tsx              # React entry
├── components/
│   ├── Header.tsx        # Top bar: logo, settings (tags), export, screenshot
│   ├── Sidebar.tsx       # Left panel: guest list (draggable) + table list tabs
│   ├── canvas/
│   │   ├── Canvas.tsx    # SVG canvas: pan/zoom, drag-drop, pointer events
│   │   ├── TableGroup.tsx # SVG table (round/rect) with seats, label, rotate btn
│   │   └── Landmark.tsx  # SVG "cake" landmark
│   ├── ui/
│   │   ├── Button.tsx    # Reusable button (primary/secondary/danger/ghost)
│   │   └── Input.tsx     # Reusable input
│   └── modals/
│       ├── Modal.tsx     # Generic modal shell with framer-motion
│       ├── ModalStore.ts # Zustand store for modal state
│       ├── GuestModal.tsx  # Add/edit/delete guest
│       ├── TableModal.tsx  # Edit table name, type, seat count, delete
│       ├── TagsModal.tsx   # Manage tag colors
│       └── SeatActionModal.tsx # Actions for seated guest
```

## Known Working State

### Table names on canvas
- Centered via SVG `textAnchor="middle"` + `dy=".35em"` (NOT CSS class `text-anchor-middle` which does nothing)
- Font size auto-scaled via Canvas API (`getFitFontSize()` in TableGroup.tsx) to fit within table boundaries
- Counter-rotated with `transform="rotate(-table.rotation, 0, 0)"` — always upright
- Click on name opens TableModal

### Rotation
- Click on ↻ button on each table → rotates by 45° increments
- All rotations are snapped to nearest 90° on app load via `initialize` in store.ts
- Available only on the canvas (not in settings modal)

### Critical fixes applied (see commit c81cc95)
1. **TableModal** created — edit name, type (round/rect), seat count, delete
2. **isSyncing** now works — shows sync indicator during Firestore save
3. **Table.id** unified to `string` (was `string | number`)
4. **ID generation** uses `crypto.randomUUID()` (was `Date.now()`)
5. **Rollback** on sync error — restores previous state snapshot
6. **Zoom** implemented — Ctrl/Cmd+wheel zooms, wheel pans
7. **print-mode CSS** hides overlays during screenshot
8. **assignSeat** clears guest's previous seat before assigning new one
9. **Firestore merge** uses `hasPendingWrites` — skips own echo updates
10. **Stale closure fix** — `handleSeatClick` and `handlePointerDown` now use `useStore.getState()` / `useModalStore.getState()` to read fresh state, avoiding stale closures over `selectedGuestId`, `moveModeGuestId`, and `tables`
11. **Direct seat handlers** — replaced `findSeatAtPoint` (DOM `elementsFromPoint` traversal) with direct `onPointerDown` on each seat `<circle>` in TableGroup.tsx. Each seat now handles its own click via React event with `stopPropagation`, completely eliminating the fragile `findSeatAtPoint` lookup

### TableModal (settings)
- Fields: name, type selector (round/rect toggle), seat count, delete button
- NO rotation control (rotation is on canvas only)
- Re-mounts on open via `key={payload?.id}` to properly initialize form state

### Click-based seat management (no drag-and-drop)
- Click guest in sidebar → guest highlights, `selectedGuestId` is set
- Next click on seat → `assignSeat` (empty) or `swapSeats` (occupied), clears `selectedGuestId`
- Right-click / click occupied seat → `SeatActionModal` with 3 options:
  - «Убрать» → `unseatGuest`
  - «Заменить» → shows list of unseated guests → click replaces occupant
  - «Пересадить» → sets `moveModeGuestId`, closes modal → next seat click places/swaps
- Click empty seat (nothing selected) → opens `GuestModal` (new guest for that seat)

### Drag operations on canvas (ONLY table/landmark/pan)
- Left-drag on background → pan
- Left-drag on table body → move table
- Left-drag on landmark → move landmark
- NO drag on seats, NO sidebar-to-seat drag, NO guest-from-seat drag

### Stale closure prevention (IMPORTANT)
- Canvas event handlers (`handleSeatClick`, `handlePointerDown`) read `selectedGuestId`, `moveModeGuestId`, and `tables` via `useStore.getState()` / `useModalStore.getState()` instead of from component closure — ensures fresh state even if React re-render hasn't committed yet
- Do NOT switch back to closure-based reads for these values; the `getState()` pattern is intentional

### Direct seat handlers
- Seat clicks are handled via `onPointerDown` on each `<circle>` in TableGroup.tsx, NOT via `handlePointerDown` on SVG
- The seat's handler calls `e.stopPropagation()` so the event never reaches `handlePointerDown` — seat clicks and table/background drags are completely separate paths
- `handleSeatClick` is passed as `onSeatClick` prop from Canvas to each TableGroup
- `findSeatAtPoint` has been removed — no more fragile DOM traversal

### SVG text rules (IMPORTANT)
- Use `textAnchor="middle"` as SVG attribute, NOT CSS class `text-anchor-middle` (inert)
- Use `dominantBaseline="central"` or `dy=".35em"` for vertical centering
- Use `fill="#0f172a"` or `fill-text-main` (Tailwind utility) for color
- Counter-rotate text inside table's `<g>` with `transform="rotate(-table.rotation, 0, 0)"`
