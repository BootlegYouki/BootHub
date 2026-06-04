# TUI Template Native (Expo / React Native)

A premium, custom **Brutalist Terminal User Interface (TUI)** starter template for React Native and Expo. It comes pre-packaged with a responsive styling engine, custom high-contrast UI components, a pre-configured iOS release pipeline (unsigned IPA), and AI agent workflows (Graphify).

---

## 🚀 Getting Started

Follow these steps to initialize a new app from this template:

### 1. Rename the Project
Customize the display names, slugs, package files, and GitHub release workflows:
```bash
pnpm rename <NewProjectName> [custom-bundle-id]
```
*Example:*
```bash
pnpm rename ClassScheduler
```
This automatically updates configurations in `app.json`, `package.json`, and `.github/workflows/build-ios-ipa.yml` to target your new project names.

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Launch Development Server
```bash
# Run Expo Dev Server
pnpm start

# Run specifically on iOS/Android
pnpm ios
pnpm android
```

---

## 🛠 Available Scripts

*   `pnpm rename <Name>`: Rename project files, bundle identifiers, and workflows.
*   `pnpm typecheck`: Run the TypeScript compiler checker (`tsc --noEmit`).
*   `pnpm lint`: Run ESLint rules.
*   `pnpm format`: Format codebase files using Prettier.
*   `pnpm exec graphify update .`: Sync AST definitions to the local codebase knowledge graph (`graphify-out/`).

---

## 🎨 Brutalist Design System (TUI)

All components are styled using high-contrast borders, solid black drop shadows, and monospace fonts (`JetBrains Mono`). 

### Core Components (`src/components/`)
*   `<TuiContainer>` (Standard Design Term: **Legend Card** or **Labeled Frame**): Styled wrapper cards mimicking classic CLI windows and HTML `<fieldset>` / `<legend>` elements. It dynamically places a text title/legend in a cutout gap along the top border, and supports corner status badges.
*   `<TuiButton>`: Monochromatic action buttons with inversion animations on press. Variants: `default`, `accent`, `outline`, `destructive`.
*   `<TuiInput>`: Brutalist styled text fields with legend borders and custom error state styling.
*   `<TuiCheckbox>`: Styled checkbox with retro `[ X ]` bracket states.
*   `<TuiSwitch>`: Retro status switch toggle presenting visual `[ ON | off ]` slider states.
*   `<TuiCalendar>`: A matrix-style calendar picker module for date selections.
*   `<TuiDrawer>`: Slide-up bottom sheets with spring overlay transitions.
*   `<TuiSkeletonLoader>`: Pulsing block layout skeletons to mask loading states.
*   `<TuiTabBar>`: A modular, responsive bottom navigation bar.
*   `<TuiHeader>`: A brutalist double-border top bar supporting a left icon, app title, dynamic `// path` subtitle, and right-aligned action elements.
*   `<SplashIcon>`: Clean vector rendering of a retro terminal cursor prompt (`>_`) used for loading and splash transitions.

### 🌅 Internal Animated Splash Screen
The application features a custom, double-layer boot splash screen:
- **Native Splash Screen**: `expo-splash-screen` handles initial drawing while the device environment mounts.
- **Animated Splash Overlay**: A full-screen `<SplashIcon>` TUI prompt overlay loads with a simulated 800ms loading sequence and fades out smoothly to prevent visual layout popping once the application views are ready.

### Theme & Colors (`src/theme/`)
Governed by [theme-provider.tsx](file:///e:/Github/tui-template-native/src/theme/theme-provider.tsx). It handles:
*   Dynamic Dark/Light mode switching.
*   Centralized color tokens (`primary`, `background`, `card`, `border`, `foreground`).
*   Primary borders (`1.5px` double-border and offset styling).

---

## 📦 Automated iOS Release Pipeline

The template contains an automated unsigned IPA release chain in [.github/workflows/build-ios-ipa.yml](file:///.github/workflows/build-ios-ipa.yml):

1.  **Version Bump**: Automatically increments version numbers in `app.json` on dispatch.
2.  **CocoaPods Setup**: Performs prebuild routines and downloads Pod assets.
3.  **Unsigned Compilation**: Compiles the project using `xcodebuild` with signature requirements disabled.
4.  **Release Packaging**: Packages the `.app` payload into a `.ipa` file.
5.  **SideStore Update**: Generates a standard `sidestore.json` source feed and releases it on GitHub Releases for auto-updating sideload installations.
