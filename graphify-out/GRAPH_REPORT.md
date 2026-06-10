# Graph Report - BootHub  (2026-06-10)

## Corpus Check
- 54 files · ~79,047 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 409 nodes · 816 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `48b7462b`
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
1. `useTheme()` - 66 edges
2. `TuiText()` - 29 edges
3. `DumpItem` - 24 edges
4. `ensureFileUri()` - 17 edges
5. `processSyncQueue()` - 17 edges
6. `expo` - 14 edges
7. `TuiContainer()` - 11 edges
8. `scripts` - 10 edges
9. `useFolderNavigation()` - 9 edges
10. `getItems()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `ensureFileUri()`  [EXTRACTED]
  App.tsx → src/utils/helpers.ts
- `ContextMenuOverlay()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `TabButton()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx

## Communities (23 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (29): ContextMenuOverlayProps, DumpItem, DumpType, MainApp(), mockItems, styles, TabButtonProps, BannerSvg() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (41): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, permissions, predictiveBackGestureEnabled, experimental (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (41): ContextMenuOverlay(), ContextMenuOverlay(), ContextMenuOverlayProps, styles, EmptyFolderPlaceholder(), FolderHeader(), FolderHeaderProps, styles (+33 more)

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
Cohesion: 0.22
Nodes (9): FolderPickerSheet(), FolderPickerSheetProps, { height: screenHeight }, styles, styles, TuiInput(), TuiInputProps, DumpType (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (32): SettingsScreen(), SettingsScreenProps, styles, clearAuthSession(), deleteFileFromDrive(), discovery, DriveUploadResponse, exchangeCodeForTokens() (+24 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 15 - "Community 15"
Cohesion: 0.05
Nodes (57): TabButton(), styles, PhotoPickerSheet(), PhotoPickerSheetProps, styles, { width: screenWidth }, { width: screenWidth, height: screenHeight }, styles (+49 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (27): decodeHtmlEntities(), extractMetaTags(), getStorageKeyForUrl(), isDirectImageUrl(), LinkPreview(), LinkPreviewProps, preFetchLinkMetadata(), previewCache (+19 more)

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): apps, identifier, name

## Knowledge Gaps
- **192 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+187 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 15` to `Community 0`, `Community 2`, `Community 7`, `Community 8`, `Community 19`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `TuiText()` connect `Community 15` to `Community 0`, `Community 2`, `Community 7`, `Community 8`, `Community 19`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _192 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07777777777777778 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0858843537414966 - nodes in this community are weakly interconnected._