# Design Document: Wedding Seating Pro (Firebase Edition)

## 1. Overview
A web application for planning wedding seating, migrating from a single-file Supabase prototype to a modular Vanilla JS application using Vite and Firebase.

## 2. Goals
- Modular, maintainable code structure.
- Reliable data persistence using Firebase Firestore.
- Improved performance (efficient SVG updates).
- Touch/Mobile support from the start.
- Step-by-step guidance for Firebase setup.

## 3. Tech Stack
- **Frontend:** Vanilla JS (ES6 Modules)
- **Bundler:** Vite
- **Styling:** Vanilla CSS (Refined from prototype)
- **Database:** Firebase Firestore
- **Deployment:** Manual or GitHub Pages (optional)

## 4. Architecture
### 4.1. File Structure
```
/
├── index.html          # Entry point
├── src/
│   ├── main.js         # App entry and initialization
│   ├── state.js        # Global state management
│   ├── firebase.js     # Firebase configuration and helpers
│   ├── ui/
│   │   ├── hall.js     # SVG Hall rendering logic
│   │   ├── sidebar.js  # Guest list and table list logic
│   │   └── modals.js   # Table editing modal logic
│   ├── utils/
│   │   ├── drag.js     # Drag-and-drop orchestration
│   │   └── excel.js    # XLSX import/export logic
│   └── styles/
│       └── main.css    # Refined styles
├── public/             # Static assets (images, favicon)
└── package.json        # Dependencies
```

### 4.2. Data Model (Firestore)
- **Collections:**
    - `weddings`: Documents keyed by a unique ID (e.g., URL parameter).
        - `guests`: Array of guest objects.
        - `tables`: Array of table objects.
        - `metadata`: Settings, zoom level, etc.

## 5. Implementation Phases
### Phase 1: Project Setup
1. Initialize Vite project.
2. Setup folder structure.
3. Create boilerplate for UI components.

### Phase 2: Core Features Re-implementation
1. Port SVG rendering logic to modular JS.
2. Implement drag-and-drop system.
3. Port Excel import/export logic.

### Phase 3: Firebase Integration
1. Setup Firebase SDK.
2. Implement Firestore listeners for real-time synchronization.
3. Add "Save" and "Auto-sync" indicators.

### Phase 4: Refinement & Mobile Support
1. Polish CSS/UI.
2. Ensure touch events work seamlessly.
3. Add basic error handling and loading states.

## 6. Firebase Setup Instructions for User
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project named "Wedding Seating".
3. Add a "Web App" to the project.
4. Copy the `firebaseConfig` object.
5. Enable "Cloud Firestore" in the sidebar and choose "Test Mode" for security rules initially.
6. Provide the config to me (I will create a `.env` file for you).
