# Graph Report - BootHub  (2026-06-10)

## Corpus Check
- 54 files · ~82,165 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 436 nodes · 899 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c88cae70`
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 66 edges
2. `TuiText()` - 29 edges
3. `DumpItem` - 24 edges
4. `processSyncQueue()` - 24 edges
5. `ensureFileUri()` - 17 edges
6. `expo` - 14 edges
7. `pullChangesFromDrive()` - 12 edges
8. `TuiContainer()` - 11 edges
9. `getItems()` - 11 edges
10. `saveItems()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `TabButton()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `ensureFileUri()`  [EXTRACTED]
  App.tsx → src/utils/helpers.ts
- `ContextMenuOverlay()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx

## Communities (23 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (28): ContextMenuOverlayProps, DumpItem, DumpType, MainApp(), mockItems, styles, TabButton(), TabButtonProps (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (41): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, permissions, predictiveBackGestureEnabled, experimental (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (67): EmptyFolderPlaceholder(), styles, FolderHeader(), FolderHeaderProps, styles, FolderItem(), FolderItemProps, styles (+59 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (33): dependencies, axios, expo, expo-auth-session, expo-clipboard, expo-crypto, expo-dev-client, expo-document-picker (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (26): author, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, prettier (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (22): 1. Rename the Project, 2. Install Dependencies, 3. Launch Development Server, 📦 Automated iOS Release Pipeline, 🛠 Available Scripts, 🎨 Brutalist Design System (TUI), Core Components (`src/components/`), 🚀 Getting Started (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (16): decodeHtmlEntities(), extractMetaTags(), getStorageKeyForUrl(), isDirectImageUrl(), LinkPreview(), LinkPreviewProps, preFetchLinkMetadata(), previewCache (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (65): SettingsScreen(), SettingsScreenProps, styles, clearAuthSession(), deleteFileFromDrive(), discovery, downloadJsonContent(), DriveUploadResponse (+57 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (9): ChartItem, MeterSegment, styles, TuiBarChart(), TuiBarChartProps, TuiProgressMeter(), TuiProgressMeterProps, TuiSegmentedMeter() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (36): ContextMenuOverlay(), ContextMenuOverlay(), ContextMenuOverlayProps, styles, FolderPickerSheet(), FolderPickerSheetProps, { height: screenHeight }, styles (+28 more)

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): apps, identifier, name

## Knowledge Gaps
- **199 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+194 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 2` to `Community 0`, `Community 7`, `Community 8`, `Community 22`, `Community 23`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `DumpItem` connect `Community 23` to `Community 0`, `Community 8`, `Community 2`, `Community 7`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _199 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.056025369978858354 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.057203956161454156 - nodes in this community are weakly interconnected._