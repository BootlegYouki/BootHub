# Graph Report - BootHub  (2026-06-12)

## Corpus Check
- 55 files · ~82,583 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 442 nodes · 904 edges · 34 communities (30 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da9d55b5`
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
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]

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

## Communities (34 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (12): ContextMenuOverlayProps, DumpItem, DumpType, mockItems, styles, TabButtonProps, BannerSvg(), IconSvg() (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (41): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, permissions, predictiveBackGestureEnabled, experimental (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (44): EmptyFolderPlaceholder(), styles, FolderHeader(), FolderHeaderProps, styles, FolderItem(), FolderItemProps, styles (+36 more)

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
Cohesion: 0.12
Nodes (24): ContextMenuOverlayProps, styles, FullscreenPhotoViewerProps, decodeHtmlEntities(), extractMetaTags(), getStorageKeyForUrl(), isDirectImageUrl(), LinkPreview() (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (65): SettingsScreen(), SettingsScreenProps, styles, clearAuthSession(), deleteFileFromDrive(), discovery, downloadJsonContent(), DriveUploadResponse (+57 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (10): styles, TuiCheckbox(), TuiCheckboxProps, ACCENT_COLORS, AccentTheme, ThemeColors, ThemeContext, ThemeContextType (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.32
Nodes (7): ContextMenuOverlay(), ContextMenuOverlay(), calculateFullscreenImageBounds(), FullscreenPhotoViewer(), styles, PhotoItem(), ensureFileUri()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (5): MainApp(), AnimationLockContext, AnimationLockContextValue, AnimationLockProvider(), useAnimationLock()

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (17): TabButton(), ChartItem, MeterSegment, styles, TuiBarChart(), TuiBarChartProps, TuiProgressMeter(), TuiProgressMeterProps (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.18
Nodes (13): FolderPickerSheet(), FolderPickerSheetProps, { height: screenHeight }, styles, base64ToBytes(), bytesToBase64(), extractAudioArtwork(), getActualType() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (5): MONTHS, styles, TuiCalendar(), TuiCalendarProps, WEEKDAYS

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): apps, identifier, name

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (4): fs, path, plist, { withDangerousMod }

### Community 27 - "Community 27"
Cohesion: 0.40
Nodes (4): SPRING_CONFIG_OPEN, styles, TuiDrawer(), TuiDrawerProps

### Community 28 - "Community 28"
Cohesion: 0.50
Nodes (3): styles, TabButton(), TabButtonProps

### Community 29 - "Community 29"
Cohesion: 0.50
Nodes (3): styles, TuiButton(), TuiButtonProps

### Community 30 - "Community 30"
Cohesion: 0.50
Nodes (3): styles, TuiHeader(), TuiHeaderProps

### Community 31 - "Community 31"
Cohesion: 0.50
Nodes (3): styles, TuiInput(), TuiInputProps

### Community 33 - "Community 33"
Cohesion: 0.50
Nodes (3): styles, TuiSwitch(), TuiSwitchProps

## Knowledge Gaps
- **203 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+198 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 22` to `Community 0`, `Community 33`, `Community 2`, `Community 7`, `Community 8`, `Community 15`, `Community 19`, `Community 21`, `Community 23`, `Community 24`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `DumpItem` connect `Community 2` to `Community 0`, `Community 7`, `Community 8`, `Community 19`, `Community 23`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _203 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09333333333333334 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08571428571428572 - nodes in this community are weakly interconnected._