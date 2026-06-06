# Graph Report - BootHub  (2026-06-06)

## Corpus Check
- 46 files · ~71,835 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 326 nodes · 606 edges · 22 communities (18 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `83f662fa`
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
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `ContextMenuOverlay()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `TabButton()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `ensureFileUri()`  [EXTRACTED]
  App.tsx → src/utils/helpers.ts

## Communities (22 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (23): ContextMenuOverlayProps, DumpItem, DumpType, mockItems, styles, TabButtonProps, BannerSvg(), IconSvg() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (32): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android (+24 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (26): ContextMenuOverlay(), MainApp(), ContextMenuOverlay(), ContextMenuOverlayProps, styles, calculateFullscreenImageBounds(), FullscreenPhotoViewer(), FullscreenPhotoViewerProps (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (27): dependencies, expo, expo-clipboard, expo-dev-client, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/jetbrains-mono (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (26): author, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, prettier (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (11): 1. Rename the Project, 2. Install Dependencies, 3. Launch Development Server, 📦 Automated iOS Release Pipeline, 🛠 Available Scripts, 🎨 Brutalist Design System (TUI), Core Components (`src/components/`), 🚀 Getting Started (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (42): TabButton(), ShareImportSheet(), styles, TabButton(), TabButtonProps, styles, TuiButton(), TuiButtonProps (+34 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (22): FolderItem(), FolderItemProps, styles, LinkItem(), LinkItemProps, LinksScreen(), LinksScreenProps, styles (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (33): decodeHtmlEntities(), extractMetaTags(), getStorageKeyForUrl(), isDirectImageUrl(), LinkPreview(), LinkPreviewProps, preFetchLinkMetadata(), previewCache (+25 more)

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): apps, identifier, name

## Knowledge Gaps
- **160 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+155 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 7` to `Community 0`, `Community 8`, `Community 2`, `Community 19`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `TuiText()` connect `Community 19` to `Community 0`, `Community 8`, `Community 2`, `Community 7`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _160 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08961593172119488 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12873563218390804 - nodes in this community are weakly interconnected._