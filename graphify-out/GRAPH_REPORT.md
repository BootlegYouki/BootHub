# Graph Report - BootHub  (2026-06-04)

## Corpus Check
- 38 files · ~40,587 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 249 nodes · 388 edges · 20 communities (17 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a80919cb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 21|Community 21]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 41 edges
2. `TuiText()` - 19 edges
3. `expo` - 12 edges
4. `scripts` - 10 edges
5. `TuiContainer()` - 8 edges
6. `DumpItem` - 8 edges
7. `getItems()` - 6 edges
8. `TUI Template Native (Expo / React Native)` - 6 edges
9. `saveItems()` - 5 edges
10. `splash` - 4 edges

## Surprising Connections (you probably didn't know these)
- `TabButton()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `LinkPreview()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/link-preview.tsx → src/theme/theme-provider.tsx
- `PhotoPickerSheet()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/photo-picker-sheet.tsx → src/theme/theme-provider.tsx

## Communities (20 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (14): DumpItem, DumpType, mockItems, styles, TabButtonProps, BannerSvg(), IconSvg(), SplashIcon() (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (22): backgroundColor, foregroundImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android, icon, ios (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (22): dependencies, expo, expo-dev-client, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/jetbrains-mono, expo-image-picker (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (26): author, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, prettier (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (21): LinksScreen(), LinksScreenProps, styles, PhotosScreen(), PhotosScreenProps, styles, styles, TextsScreen() (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (11): 1. Rename the Project, 2. Install Dependencies, 3. Launch Development Server, 📦 Automated iOS Release Pipeline, 🛠 Available Scripts, 🎨 Brutalist Design System (TUI), Core Components (`src/components/`), 🚀 Getting Started (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (46): MainApp(), TabButton(), styles, TuiButton(), TuiButtonProps, MONTHS, styles, TuiCalendar() (+38 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (10): PhotoPickerSheet(), PhotoPickerSheetProps, styles, { width: screenWidth }, { width: screenWidth, height: screenHeight }, styles, TuiContainer(), TuiContainerProps (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 21 - "Community 21"
Cohesion: 0.20
Nodes (5): LinkPreview(), LinkPreviewProps, previewCache, PreviewData, styles

## Knowledge Gaps
- **132 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+127 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 7` to `Community 0`, `Community 8`, `Community 5`, `Community 21`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _132 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08831908831908832 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._