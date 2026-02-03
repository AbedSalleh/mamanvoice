# MamanVoice - Project Documentation

**MamanVoice** is an offline-first, open-source AAC (Augmentative and Alternative Communication) web application designed for children. It allows parents to create custom communication cards using text-to-speech or recorded audio, organized into folders.

## 🛠️ Technology Stack
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Shadcn UI (Radix Primitives)
- **Animations**: Framer Motion (Spring physics, route transitions)
- **Routing**: Wouter (Hash-based routing for GitHub Pages compatibility)
- **State/Storage**: Dexie.js (IndexedDB wrapper for offline storage)
- **Icons**: Lucide React + Mulberry Symbols (SVG)

## ✨ Key Features implemented

### 1. Offline-First Architecture
- **Zero Latency**: All data (images, audio, configuration) is stored locally in the browser's IndexedDB.
- **Privacy Focused**: No data is sent to the cloud. A red warning in Parent Mode reminds users of this local-only approach.
- **Backup/Restore**: Users can export their entire board configuration to a single JSON file for backup or transfer between devices.

### 2. Smart Symbol Library
- **Mulberry Symbols**: Integrated a curated set of high-contrast, AAC-specific pictograms (CC-BY-SA 4.0).
- **Lazy Loading**: The symbol library (~10KB) is only fetched when the user opens the "Library" tab, keeping the initial bundle size small.
- **Searchable**: Instant client-side search for symbols by name or tag.
- **Attribution**: Proper license credits added to the Settings menu.

### 3. "Juicy" Interaction Design
- **Tactile Feedback**: Interactive elements use spring physics (`type: "spring", stiffness: 400`) to scale down on press, mimicking native iOS apps.
- **Page Transitions**: Smooth fade and scale transitions when navigating into or out of folders.
- **Unified Header**: A consolidated top bar holds all controls (Settings, Add Card, Lock/Unlock), adapting layout for Parent vs. Child modes.

### 4. GitHub Pages Deployment
- **Hash Routing**: Switched from History API to Hash Routing (`/#/folder/id`) to support static hosting on GitHub Pages without 404 errors on refresh.
- **CI/CD**: configurd `deploy.yml` GitHub Action to automatically build and deploy new commits to the `gh-pages` branch.
- **SEO**: Added custom favicon, branding title, and Google Search Console verification.

## 📱 User Interface Improvements
- **Card Editor**: Refactored to a 2-column layout (Image vs. Config) to support taller symbol pickers while fitting on mobile screens.
- **Child Mode**: Simplified interface that hides all editing controls. "Hold Shield" gesture prevents accidental exits.
- **Responsive**: Fully responsive design that works on mobile, tablet, and desktop.

## 🚀 How to Run
```bash
npm install
npm run dev
```

## 📦 Deployment
This project is configured for **GitHub Pages**.
1. Push to `main`.
2. The `.github/workflows/deploy.yml` action will automatically build and deploy.

## 🧠 Knowledge Items & Learnings

### 1. GitHub Pages Routing
- **Problem**: SPAs using `history.pushState` return 404s on GitHub Pages because the server doesn't know how to handle the route.
- **Solution**: We switched to **Hash Routing** (`/#/folder/id`). The custom hook `useHashLocation` bridges `wouter` with the browser's hash events, ensuring deep links work perfectly on static hosting.

### 2. Framer Motion Performance
- **Optimization**: For the "squish" effect on cards, we used `whileTap={{ scale: 0.95 }}` with a spring physics transition (`stiffness: 400`, `damping: 17`). This mimics the native iOS "bouncy" feel without complex JavaScript logic.

### 3. Audio & Auto-Play Policy
- **Constraint**: Browsers block auto-playing audio without user interaction.
- **Handling**: We ensure all audio playback (TTS or recorded) is triggered by a direct user tap (PointerDown/Click).
- **Cleanup**: `URL.createObjectURL(blob)` is used for instant audio preview, but we must explicitly call `URL.revokeObjectURL()` to prevent memory leaks after playback finishes.

---
*Created by Antigravity*
