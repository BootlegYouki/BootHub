# Graph Report - BootHub  (2026-06-04)

## Corpus Check
- 39 files · ~42,429 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 255 nodes · 395 edges · 31 communities (28 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b82794bd`
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
- `MainApp()` --calls--> `ensureFileUri()`  [EXTRACTED]
  App.tsx → src/utils/helpers.ts
- `LinkPreview()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/link-preview.tsx → src/theme/theme-provider.tsx

## Communities (31 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.50
Nodes (3): IconSvg(), SplashIcon(), SplashIconProps

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (22): backgroundColor, foregroundImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android, icon, ios (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.33
Nodes (5): MONTHS, styles, TuiCalendar(), TuiCalendarProps, WEEKDAYS

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (23): dependencies, expo, expo-dev-client, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/jetbrains-mono, expo-image (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (26): author, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, prettier (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (28): DumpItem, DumpType, MainApp(), mockItems, styles, TabButtonProps, BannerSvg(), LinksScreen() (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (11): 1. Rename the Project, 2. Install Dependencies, 3. Launch Development Server, 📦 Automated iOS Release Pipeline, 🛠 Available Scripts, 🎨 Brutalist Design System (TUI), Core Components (`src/components/`), 🚀 Getting Started (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (9): styles, TuiContainer(), TuiContainerProps, styles, TuiSkeletonLoader(), TuiText(), TuiTextProps, styles (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.40
Nodes (4): SPRING_CONFIG_OPEN, styles, TuiDrawer(), TuiDrawerProps

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (12): TabButton(), ChartItem, MeterSegment, styles, TuiBarChart(), TuiBarChartProps, TuiProgressMeter(), TuiProgressMeterProps (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.20
Nodes (5): LinkPreview(), LinkPreviewProps, previewCache, PreviewData, styles

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (7): ACCENT_COLORS, AccentTheme, ThemeColors, ThemeContext, ThemeContextType, ThemeMode, ThemeProvider()

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (5): PhotoPickerSheet(), PhotoPickerSheetProps, styles, { width: screenWidth }, { width: screenWidth, height: screenHeight }

### Community 24 - "Community 24"
Cohesion: 0.40
Nodes (4): ScreenType, styles, TuiTabBar(), TuiTabBarProps

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): apps, identifier, name

### Community 26 - "Community 26"
Cohesion: 0.50
Nodes (3): styles, TuiButton(), TuiButtonProps

### Community 27 - "Community 27"
Cohesion: 0.50
Nodes (3): styles, TuiCheckbox(), TuiCheckboxProps

### Community 28 - "Community 28"
Cohesion: 0.50
Nodes (3): styles, TuiHeader(), TuiHeaderProps

### Community 29 - "Community 29"
Cohesion: 0.50
Nodes (3): styles, TuiInput(), TuiInputProps

### Community 30 - "Community 30"
Cohesion: 0.50
Nodes (3): styles, TuiSwitch(), TuiSwitchProps

## Knowledge Gaps
- **136 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+131 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 15` to `Community 2`, `Community 5`, `Community 7`, `Community 8`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _136 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.0859465737514518 - nodes in this community are weakly interconnected._