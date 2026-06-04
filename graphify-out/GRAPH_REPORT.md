# Graph Report - BootHub  (2026-06-04)

## Corpus Check
- 33 files · ~38,724 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 221 nodes · 305 edges · 21 communities (18 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 21|Community 21]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 33 edges
2. `TuiText()` - 15 edges
3. `expo` - 12 edges
4. `scripts` - 9 edges
5. `TUI Template Native (Expo / React Native)` - 6 edges
6. `getItems()` - 5 edges
7. `splash` - 4 edges
8. `TuiContainer()` - 4 edges
9. `saveItems()` - 4 edges
10. `addItem()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `TabButton()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `LinkPreview()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/link-preview.tsx → src/theme/theme-provider.tsx
- `TuiCalendar()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/tui-calendar.tsx → src/theme/theme-provider.tsx

## Communities (21 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (17): DumpItem, DumpType, mockItems, styles, TabButtonProps, BannerSvg(), styles, TuiHeader() (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (22): backgroundColor, foregroundImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android, icon, ios (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.33
Nodes (5): MONTHS, styles, TuiCalendar(), TuiCalendarProps, WEEKDAYS

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (20): dependencies, expo, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/jetbrains-mono, expo-image-picker, expo-sharing (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (24): author, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, prettier (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.40
Nodes (4): ScreenType, styles, TuiTabBar(), TuiTabBarProps

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (11): 1. Rename the Project, 2. Install Dependencies, 3. Launch Development Server, 📦 Automated iOS Release Pipeline, 🛠 Available Scripts, 🎨 Brutalist Design System (TUI), Core Components (`src/components/`), 🚀 Getting Started (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (43): MainApp(), TabButton(), styles, TuiButton(), TuiButtonProps, ChartItem, MeterSegment, styles (+35 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 15 - "Community 15"
Cohesion: 0.50
Nodes (3): IconSvg(), SplashIcon(), SplashIconProps

### Community 21 - "Community 21"
Cohesion: 0.20
Nodes (5): LinkPreview(), LinkPreviewProps, previewCache, PreviewData, styles

## Knowledge Gaps
- **121 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 7` to `Community 0`, `Community 2`, `Community 5`, `Community 21`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09852216748768473 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._