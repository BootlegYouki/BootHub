# Graph Report - BootHub  (2026-06-10)

## Corpus Check
- 54 files · ~81,723 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 432 nodes · 887 edges · 32 communities (28 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `13fb11ef`
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

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 66 edges
2. `TuiText()` - 29 edges
3. `DumpItem` - 24 edges
4. `processSyncQueue()` - 23 edges
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

## Communities (32 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (23): ContextMenuOverlayProps, DumpItem, DumpType, MainApp(), mockItems, styles, TabButtonProps, BannerSvg() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (41): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, permissions, predictiveBackGestureEnabled, experimental (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (33): ContextMenuOverlayProps, EmptyFolderPlaceholder(), styles, FolderHeader(), FolderHeaderProps, styles, FolderItem(), FolderItemProps (+25 more)

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
Cohesion: 0.25
Nodes (7): ACCENT_COLORS, AccentTheme, ThemeColors, ThemeContext, ThemeContextType, ThemeMode, ThemeProvider()

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (59): SettingsScreen(), SettingsScreenProps, styles, clearAuthSession(), deleteFileFromDrive(), discovery, downloadJsonContent(), DriveUploadResponse (+51 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (11): PhotoPickerSheet(), PhotoPickerSheetProps, styles, { width: screenWidth }, { width: screenWidth, height: screenHeight }, AnimatedPressable, styles, TuiContainer() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (8): styles, TabButton(), TabButtonProps, styles, TuiCheckbox(), TuiCheckboxProps, TuiText(), TuiTextProps

### Community 21 - "Community 21"
Cohesion: 0.23
Nodes (11): TabButton(), styles, TuiButton(), TuiButtonProps, FilesScreen(), LinksScreen(), PhotosScreen(), TextsScreen() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (9): ChartItem, MeterSegment, styles, TuiBarChart(), TuiBarChartProps, TuiProgressMeter(), TuiProgressMeterProps, TuiSegmentedMeter() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (25): ContextMenuOverlay(), ContextMenuOverlay(), styles, decodeHtmlEntities(), extractMetaTags(), getStorageKeyForUrl(), isDirectImageUrl(), LinkPreview() (+17 more)

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (5): MONTHS, styles, TuiCalendar(), TuiCalendarProps, WEEKDAYS

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): apps, identifier, name

### Community 26 - "Community 26"
Cohesion: 0.40
Nodes (4): SPRING_CONFIG_OPEN, styles, TuiDrawer(), TuiDrawerProps

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (13): FolderPickerSheet(), FolderPickerSheetProps, { height: screenHeight }, styles, base64ToBytes(), bytesToBase64(), extractAudioArtwork(), getActualType() (+5 more)

### Community 28 - "Community 28"
Cohesion: 0.50
Nodes (3): styles, TuiHeader(), TuiHeaderProps

### Community 29 - "Community 29"
Cohesion: 0.50
Nodes (3): styles, TuiSwitch(), TuiSwitchProps

### Community 30 - "Community 30"
Cohesion: 0.50
Nodes (3): styles, TuiInput(), TuiInputProps

## Knowledge Gaps
- **198 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+193 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 21` to `Community 0`, `Community 2`, `Community 7`, `Community 8`, `Community 15`, `Community 19`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `DumpItem` connect `Community 2` to `Community 0`, `Community 8`, `Community 27`, `Community 23`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _198 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06685633001422475 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09390243902439024 - nodes in this community are weakly interconnected._