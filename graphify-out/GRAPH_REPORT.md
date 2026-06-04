# Graph Report - BootHub  (2026-06-04)

## Corpus Check
- 38 files · ~66,091 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 279 nodes · 464 edges · 21 communities (19 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a39b8516`
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
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 47 edges
2. `TuiText()` - 20 edges
3. `DumpItem` - 13 edges
4. `expo` - 12 edges
5. `scripts` - 10 edges
6. `TuiContainer()` - 9 edges
7. `ensureFileUri()` - 7 edges
8. `getItems()` - 7 edges
9. `FileItem()` - 6 edges
10. `saveItems()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `TabButton()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `ContextMenuOverlay()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `ensureFileUri()`  [EXTRACTED]
  App.tsx → src/utils/helpers.ts

## Communities (21 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (18): ContextMenuOverlayProps, DumpItem, DumpType, mockItems, styles, TabButtonProps, BannerSvg(), IconSvg() (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (25): backgroundColor, foregroundImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android, icon, ios (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (14): PhotoPickerSheet(), PhotoPickerSheetProps, styles, { width: screenWidth }, { width: screenWidth, height: screenHeight }, styles, TuiContainer(), TuiContainerProps (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (25): dependencies, expo, expo-clipboard, expo-dev-client, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/jetbrains-mono (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (26): author, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, prettier (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (19): LinkItem(), LinkItemProps, LinksScreen(), LinksScreenProps, styles, styles, TextItem(), TextItemProps (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (11): 1. Rename the Project, 2. Install Dependencies, 3. Launch Development Server, 📦 Automated iOS Release Pipeline, 🛠 Available Scripts, 🎨 Brutalist Design System (TUI), Core Components (`src/components/`), 🚀 Getting Started (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (49): TabButton(), styles, TuiButton(), TuiButtonProps, MONTHS, styles, TuiCalendar(), TuiCalendarProps (+41 more)

### Community 8 - "Community 8"
Cohesion: 0.23
Nodes (11): ContextMenuOverlay(), MainApp(), FileItem(), FileItemProps, FilesScreen(), FilesScreenProps, getFileIcon(), getFileTypeLabel() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 21 - "Community 21"
Cohesion: 0.20
Nodes (5): LinkPreview(), LinkPreviewProps, previewCache, PreviewData, styles

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): apps, identifier, name

## Knowledge Gaps
- **140 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+135 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 7` to `Community 0`, `Community 2`, `Community 5`, `Community 8`, `Community 21`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `TuiText()` connect `Community 7` to `Community 0`, `Community 2`, `Community 5`, `Community 8`, `Community 21`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _140 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10080645161290322 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13071895424836602 - nodes in this community are weakly interconnected._