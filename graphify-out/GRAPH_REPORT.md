# Graph Report - BootHub  (2026-06-05)

## Corpus Check
- 42 files · ~65,994 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 303 nodes · 553 edges · 29 communities (27 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8b06436`
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

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 56 edges
2. `TuiText()` - 24 edges
3. `DumpItem` - 18 edges
4. `expo` - 12 edges
5. `ensureFileUri()` - 12 edges
6. `scripts` - 10 edges
7. `TuiContainer()` - 9 edges
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

## Communities (29 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (26): ContextMenuOverlayProps, DumpItem, DumpType, mockItems, styles, TabButtonProps, BannerSvg(), IconSvg() (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (25): backgroundColor, foregroundImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android, icon, ios (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.19
Nodes (12): TabButton(), ChartItem, MeterSegment, styles, TuiBarChart(), TuiBarChartProps, TuiProgressMeter(), TuiProgressMeterProps (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (25): dependencies, expo, expo-clipboard, expo-dev-client, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/jetbrains-mono (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (26): author, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, prettier (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.20
Nodes (13): FileItem(), FilesScreen(), getFileIcon(), getFileTypeLabel(), styles, base64ToBytes(), bytesToBase64(), extractAudioArtwork() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (11): 1. Rename the Project, 2. Install Dependencies, 3. Launch Development Server, 📦 Automated iOS Release Pipeline, 🛠 Available Scripts, 🎨 Brutalist Design System (TUI), Core Components (`src/components/`), 🚀 Getting Started (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (6): styles, LinkPreview(), LinkPreviewProps, previewCache, PreviewData, styles

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (30): ContextMenuOverlay(), MainApp(), ContextMenuOverlay(), ContextMenuOverlayProps, FolderItem(), FolderItemProps, styles, calculateFullscreenImageBounds() (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (11): PhotoPickerSheet(), PhotoPickerSheetProps, styles, { width: screenWidth }, { width: screenWidth, height: screenHeight }, AnimatedPressable, styles, TuiContainer() (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (5): MONTHS, styles, TuiCalendar(), TuiCalendarProps, WEEKDAYS

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (8): styles, TabButton(), TabButtonProps, styles, TuiSwitch(), TuiSwitchProps, TuiText(), TuiTextProps

### Community 21 - "Community 21"
Cohesion: 0.29
Nodes (6): ACCENT_COLORS, AccentTheme, ThemeColors, ThemeContext, ThemeContextType, ThemeMode

### Community 22 - "Community 22"
Cohesion: 0.40
Nodes (4): SPRING_CONFIG_OPEN, styles, TuiDrawer(), TuiDrawerProps

### Community 23 - "Community 23"
Cohesion: 0.50
Nodes (4): LinkItem(), LinksScreen(), styles, formatBreakAll()

### Community 24 - "Community 24"
Cohesion: 0.50
Nodes (3): styles, TuiButton(), TuiButtonProps

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): apps, identifier, name

### Community 26 - "Community 26"
Cohesion: 0.50
Nodes (3): styles, TuiCheckbox(), TuiCheckboxProps

### Community 27 - "Community 27"
Cohesion: 0.50
Nodes (3): styles, TuiHeader(), TuiHeaderProps

### Community 28 - "Community 28"
Cohesion: 0.50
Nodes (3): styles, TuiInput(), TuiInputProps

## Knowledge Gaps
- **149 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 2` to `Community 0`, `Community 5`, `Community 7`, `Community 8`, `Community 15`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `TuiText()` connect `Community 19` to `Community 0`, `Community 2`, `Community 5`, `Community 7`, `Community 8`, `Community 15`, `Community 18`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07665505226480836 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._