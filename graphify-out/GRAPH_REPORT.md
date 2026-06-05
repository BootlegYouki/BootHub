# Graph Report - BootHub  (2026-06-05)

## Corpus Check
- 47 files · ~91,941 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 323 nodes · 608 edges · 22 communities (18 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1759e658`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 58 edges
2. `TuiText()` - 25 edges
3. `DumpItem` - 20 edges
4. `expo` - 13 edges
5. `ensureFileUri()` - 13 edges
6. `scripts` - 10 edges
7. `TuiContainer()` - 10 edges
8. `getItems()` - 8 edges
9. `saveItems()` - 7 edges
10. `FolderItem()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `TabButton()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `ensureFileUri()`  [EXTRACTED]
  App.tsx → src/utils/helpers.ts
- `TuiProgressMeter()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/tui-chart.tsx → src/theme/theme-provider.tsx

## Communities (22 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (29): ContextMenuOverlayProps, DumpItem, DumpType, mockItems, styles, TabButton(), TabButtonProps, BannerSvg() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (26): backgroundColor, foregroundImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android, icon, ios (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (21): PhotoPickerSheet(), PhotoPickerSheetProps, styles, { width: screenWidth }, { width: screenWidth, height: screenHeight }, ShareImportSheet(), ShareImportSheetProps, styles (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (26): dependencies, expo, expo-clipboard, expo-dev-client, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/jetbrains-mono (+18 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (26): author, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, prettier (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (11): 1. Rename the Project, 2. Install Dependencies, 3. Launch Development Server, 📦 Automated iOS Release Pipeline, 🛠 Available Scripts, 🎨 Brutalist Design System (TUI), Core Components (`src/components/`), 🚀 Getting Started (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (9): ChartItem, MeterSegment, styles, TuiBarChart(), TuiBarChartProps, TuiProgressMeter(), TuiProgressMeterProps, TuiSegmentedMeter() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (55): ContextMenuOverlay(), MainApp(), ContextMenuOverlay(), ContextMenuOverlayProps, styles, calculateFullscreenImageBounds(), FullscreenPhotoViewer(), FullscreenPhotoViewerProps (+47 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (27): FolderItem(), FolderItemProps, styles, FileItemProps, FilesScreenProps, LinkItem(), LinkItemProps, LinksScreen() (+19 more)

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (9): decodeHtmlEntities(), extractMetaTags(), getStorageKeyForUrl(), isDirectImageUrl(), LinkPreviewProps, preFetchLinkMetadata(), previewCache, PreviewData (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): apps, identifier, name

## Knowledge Gaps
- **156 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+151 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 8` to `Community 0`, `Community 2`, `Community 7`, `Community 15`, `Community 19`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `TuiText()` connect `Community 8` to `Community 0`, `Community 2`, `Community 7`, `Community 15`, `Community 19`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _156 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07246376811594203 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._