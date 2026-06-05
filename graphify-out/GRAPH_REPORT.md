# Graph Report - BootHub  (2026-06-05)

## Corpus Check
- 48 files · ~70,175 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 325 nodes · 609 edges · 33 communities (29 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f33b403d`
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

## Communities (33 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (24): ContextMenuOverlayProps, DumpItem, DumpType, mockItems, styles, TabButtonProps, BannerSvg(), IconSvg() (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (26): backgroundColor, foregroundImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android, icon, ios (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.33
Nodes (5): PhotoPickerSheet(), PhotoPickerSheetProps, styles, { width: screenWidth }, { width: screenWidth, height: screenHeight }

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
Cohesion: 0.16
Nodes (14): TabButton(), ShareImportSheet(), ChartItem, MeterSegment, styles, TuiBarChart(), TuiBarChartProps, TuiProgressMeter() (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (16): ContextMenuOverlay(), MainApp(), ContextMenuOverlay(), ContextMenuOverlayProps, calculateFullscreenImageBounds(), FullscreenPhotoViewer(), FullscreenPhotoViewerProps, styles (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (47): styles, FolderItem(), FolderItemProps, styles, decodeHtmlEntities(), extractMetaTags(), getStorageKeyForUrl(), isDirectImageUrl() (+39 more)

### Community 19 - "Community 19"
Cohesion: 0.27
Nodes (7): AnimatedPressable, styles, TuiContainerProps, styles, TuiSkeletonLoader(), TuiText(), TuiTextProps

### Community 21 - "Community 21"
Cohesion: 0.29
Nodes (6): ACCENT_COLORS, AccentTheme, ThemeColors, ThemeContext, ThemeContextType, ThemeMode

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (5): MONTHS, styles, TuiCalendar(), TuiCalendarProps, WEEKDAYS

### Community 23 - "Community 23"
Cohesion: 0.40
Nodes (4): SPRING_CONFIG_OPEN, styles, TuiDrawer(), TuiDrawerProps

### Community 24 - "Community 24"
Cohesion: 0.40
Nodes (4): ScreenType, styles, TuiTabBar(), TuiTabBarProps

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): apps, identifier, name

### Community 26 - "Community 26"
Cohesion: 0.50
Nodes (3): styles, TabButton(), TabButtonProps

### Community 27 - "Community 27"
Cohesion: 0.50
Nodes (3): styles, TuiButton(), TuiButtonProps

### Community 28 - "Community 28"
Cohesion: 0.50
Nodes (3): styles, TuiCheckbox(), TuiCheckboxProps

### Community 29 - "Community 29"
Cohesion: 0.50
Nodes (3): styles, TuiHeader(), TuiHeaderProps

### Community 30 - "Community 30"
Cohesion: 0.50
Nodes (3): styles, TuiInput(), TuiInputProps

### Community 31 - "Community 31"
Cohesion: 0.50
Nodes (3): styles, TuiSwitch(), TuiSwitchProps

## Knowledge Gaps
- **156 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+151 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 7` to `Community 0`, `Community 2`, `Community 8`, `Community 15`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `TuiText()` connect `Community 19` to `Community 0`, `Community 2`, `Community 7`, `Community 8`, `Community 15`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _156 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0858974358974359 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._