# Graph Report - BootHub  (2026-06-16)

## Corpus Check
- 74 files · ~116,033 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 777 nodes · 1360 edges · 69 communities (64 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1dc4c369`
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
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 68 edges
2. `DumpItem` - 40 edges
3. `Fallow: Critical Gotchas` - 32 edges
4. `TuiText()` - 31 edges
5. `Fallow CLI Reference` - 30 edges
6. `processSyncQueue()` - 27 edges
7. `Common Workflows` - 22 edges
8. `ensureFileUri()` - 21 edges
9. `Fallow: codebase intelligence for JavaScript and TypeScript` - 17 edges
10. `Fallow: Common Workflow Patterns & Recipes` - 17 edges

## Surprising Connections (you probably didn't know these)
- `TabButton()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx
- `MainApp()` --calls--> `useAnimationLock()`  [EXTRACTED]
  App.tsx → src/context/animation-lock.tsx
- `MainApp()` --calls--> `useDeepLink()`  [EXTRACTED]
  App.tsx → src/hooks/use-deep-link.ts
- `MainApp()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/theme-provider.tsx

## Communities (69 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (13): appStyles, ContextMenuOverlayProps, DumpItem, DumpType, mockItems, styles, TabButton(), TabButtonProps (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (41): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, permissions, predictiveBackGestureEnabled, experimental (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (23): BaseFolderScreen(), FolderItemProps, FolderScreenProps, EmptyFolderPlaceholder(), styles, FolderHeader(), FolderHeaderProps, styles (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (33): dependencies, axios, expo, expo-auth-session, expo-clipboard, expo-crypto, expo-dev-client, expo-document-picker (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, prettier, @types/node (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (22): 1. Rename the Project, 2. Install Dependencies, 3. Launch Development Server, 📦 Automated iOS Release Pipeline, 🛠 Available Scripts, 🎨 Brutalist Design System (TUI), Core Components (`src/components/`), 🚀 Getting Started (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (18): decodeHtmlEntities(), extractMetaTags(), getStorageKeyForUrl(), isDirectImageUrl(), LinkPreview(), LinkPreviewProps, preFetchLinkMetadata(), previewCache (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (78): FolderPickerSheetProps, UseAppDataReturn, UseEditItemOptions, UseEditItemReturn, getFolderName(), matchItem(), UseTabFilterOptions, UseTabFilterReturn (+70 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (4): compilerOptions, strict, exclude, extends

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (7): appJsonPath, fs, packageJsonPath, path, rootDir, slug, workflowPath

### Community 15 - "Community 15"
Cohesion: 0.05
Nodes (39): Agent Rules, Analyze specific workspaces, Audit a project for cleanup opportunities, Catch typos in entry file exports, Check if a PR introduces quality risk, Commands, Common Workflows, Configuration (+31 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (33): Baseline Comparison Tracks Issue Identity, `--changed-since` Shows Only New Issues, Class Instance Members Are Tracked, Decorated Members Are Skipped By Default, Don't Create Config Unless Needed, Duplication Modes Affect What's Detected, Dynamically Loaded Files: Use `dynamicallyLoaded`, Exit Code 1 vs 2 (+25 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (28): styles, TuiButton(), TuiButtonProps, ChartItem, MeterSegment, styles, TuiBarChart(), TuiBarChartProps (+20 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (11): MainApp(), useAppData(), useBottomBarAnimation(), UseBottomBarAnimationOptions, UseBottomBarAnimationReturn, useEditItem(), useHeaderMenu(), UseHeaderMenuOptions (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.18
Nodes (10): SegmentedBorders(), SegmentedBordersProps, styles, styles, TabButton(), TabButtonProps, ScreenType, styles (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (19): Behavior, CI Integration, `ci`: Provider-Aware Review Automation, Combined Mode Flags, `config-schema`: Config JSON Schema, Environment Variables, Fallow CLI Reference, Flags (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): apps, identifier, name

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (17): CI Pipeline Setup, GitHub Actions: Basic, GitHub Actions: Duplication Gate, GitHub Actions: Inline PR Annotations (No Advanced Security), GitHub Actions: PR-Scoped Check, GitHub Actions: PR-Scoped Duplication Check, GitHub Actions: Security Delta Gate, GitHub Actions: Severity-Aware PR Quality Gate (Audit) (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.16
Nodes (11): PhotoPickerSheet(), PhotoPickerSheetProps, styles, { width: screenWidth }, { width: screenWidth, height: screenHeight }, AnimatedPressable, styles, TuiContainer() (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (7): BottomBar(), BottomBarProps, EditModeBarProps, NormalInputBarProps, SelectionModeBarProps, styles, ThemeColors

### Community 29 - "Community 29"
Cohesion: 0.20
Nodes (9): duplicates, ignore, minOccurrences, health, ignore, ignoreDependencies, ignorePatterns, rules (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (12): Combined Dead Code + Duplication, Custom Plugin Setup, Fallow: Common Workflow Patterns & Recipes, Full audit (default), Option 1: Inline framework config, Option 2: External plugin file, Option 3: Plugin directory, Production audit (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.20
Nodes (10): scripts, android, dev, format, ios, lint, rename, start (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (9): `actions` Array, `baseline_deltas` Object, Combined output (`fallow` with no subcommand), `dead-code` output, `dupes` output, Error output (exit code 2), `fix` output (dry-run), Health `actions` array (CRAP findings) (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (7): computedHash, skillPath, source, sourceType, skills, fallow, version

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (11): FolderPickerSheet(), { height: screenHeight }, styles, styles, TuiInput(), TuiInputProps, ACCENT_COLORS, AccentTheme (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (8): Actionable error messages, `activate` flags, Clock skew, Exit Codes, Grace ladder, `license`: Manage Continuous Runtime License, Storage precedence, Subcommands

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (8): Examples, Exit Codes, Flags, `health`: Function Complexity & File Health Analysis, Health Trend, JSON Output Structure, Vital Signs, Vital Signs Snapshots

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (22): BaseFolderScreenProps, ContextMenuOverlay(), ContextMenuOverlayProps, styles, calculateFullscreenImageBounds(), FullscreenPhotoViewer(), FullscreenPhotoViewerProps, styles (+14 more)

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (7): `analyze` flags, `coverage`: Production-Coverage Workflow, `coverage upload-source-maps` flags, Environment, Exit Codes, `setup` flow, `upload-inventory` flags

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (7): Examples, File encoding contract, `fix`: Auto-Remove Unused Code, Flags, Low-confidence export removals, On-disk drift protection, What gets fixed

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (7): Full Project Audit, Step 1: Run full analysis, Step 2: Review issue counts, Step 3: Find duplication, Step 4: Preview auto-fix, Step 5: Apply fixes (after user confirmation), Step 6: Verify

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (7): Safe Auto-Fix Workflow, Step 1: Dry-run first, Step 2: Review each proposed change, Step 3: Confirm with user before applying, Step 4: Apply, Step 5: Verify, Step 6: Run project tests

### Community 43 - "Community 43"
Cohesion: 0.24
Nodes (13): ContextMenuOverlay(), handleCopyItem(), base64ToBytes(), bytesToBase64(), ensureFileUri(), extractAudioArtwork(), getActualType(), getWebsiteName() (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.40
Nodes (4): AnimationLockContext, AnimationLockContextValue, AnimationLockProvider(), useAnimationLock()

### Community 45 - "Community 45"
Cohesion: 0.33
Nodes (5): MONTHS, styles, TuiCalendar(), TuiCalendarProps, WEEKDAYS

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (6): `audit`: Changed-File Quality Gate, Examples, Flags, JSON contract: which fields are severity-aware, JSON Output Structure, Verdicts

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (6): Debugging False Positives, If the trace shows it IS used, If the trace shows it's NOT used, Trace a dependency, Trace all edges for a file, Trace an export's usage chain

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (6): Duplication baseline, Incremental Adoption with Baselines, Step 1: Save current state as baseline, Step 2: Commit the baseline, Step 3: CI only fails on NEW issues, Step 4: Gradually fix and update baseline

### Community 49 - "Community 49"
Cohesion: 0.36
Nodes (6): ShareImportSheetProps, useDeepLink(), UseDeepLinkOptions, ParsedShare, parseShareUrl(), processSharedItem()

### Community 50 - "Community 50"
Cohesion: 0.40
Nodes (5): Analyze a single package, Analyze the full monorepo, List all discovered files across workspaces, Monorepo Analysis, Per-package CI

### Community 51 - "Community 51"
Cohesion: 0.40
Nodes (5): `.claude/hooks/fallow-gate.sh`, `.claude/settings.json`, Distinguish from `fallow hooks install --target git`, Guard `git push` with a Claude Code PreToolUse hook, Remove the hook

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (5): Cross-directory only, Duplication Threshold CI Gate, Step 1: Measure current duplication, Step 2: Set threshold slightly above current, Step 3: Tighten over time

### Community 53 - "Community 53"
Cohesion: 0.40
Nodes (5): Detection mode mapping, Migration from jscpd, Step 1: Preview migration, Step 2: Apply migration, Step 3: Compare results

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (3): PR Dead Code Check, Step 1: Analyze changed files, Step 2: If issues found, show specifics

### Community 55 - "Community 55"
Cohesion: 0.50
Nodes (4): Arguments, `explain`: Rule Explanation, JSON Output Structure, Usage

### Community 56 - "Community 56"
Cohesion: 0.50
Nodes (4): Configuration field notes, Configuration File Format, JSON Format (`.fallowrc.json` / `.fallowrc.jsonc`), TOML Format (`fallow.toml`)

### Community 57 - "Community 57"
Cohesion: 0.50
Nodes (4): `dead-code`: Dead Code Analysis, Examples, Flags, Issue Type Filters

### Community 58 - "Community 58"
Cohesion: 0.50
Nodes (4): Detected Source Configs, Examples, Flags, `migrate`: Config Migration

### Community 59 - "Community 59"
Cohesion: 0.50
Nodes (4): Detection Modes, `dupes`: Duplication Detection, Examples, Flags

### Community 60 - "Community 60"
Cohesion: 0.50
Nodes (4): Examples, Flags, JSON Output Structure, `security`: Security Candidate Detection

### Community 61 - "Community 61"
Cohesion: 0.50
Nodes (4): Examples, Flags, `flags`: Feature Flag Detection, JSON Output Structure

### Community 62 - "Community 62"
Cohesion: 0.50
Nodes (4): All-in-one with `--ci`, GitHub Code Scanning Integration, Step 1: Generate SARIF output, Step 2: Upload via GitHub Action

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (5): author, main, name, private, version

### Community 64 - "Community 64"
Cohesion: 0.67
Nodes (3): `config`: Show Resolved Config, Exit Codes, Flags

### Community 65 - "Community 65"
Cohesion: 0.67
Nodes (3): Examples, Flags, `list`: Project Introspection

### Community 66 - "Community 66"
Cohesion: 0.67
Nodes (3): Examples, Flags, `init`: Config Generation

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (5): Migration from knip, Step 1: Preview migration, Step 2: Apply migration, Step 3: Compare results, Step 4: Remove knip config

## Knowledge Gaps
- **437 isolated node(s):** `$schema`, `ignorePatterns`, `ignoreDependencies`, `minOccurrences`, `ignore` (+432 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 21` to `Community 0`, `Community 2`, `Community 35`, `Community 38`, `Community 7`, `Community 8`, `Community 43`, `Community 45`, `Community 22`, `Community 23`, `Community 27`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `Fallow CLI Reference` connect `Community 24` to `Community 64`, `Community 33`, `Community 66`, `Community 65`, `Community 36`, `Community 37`, `Community 39`, `Community 40`, `Community 46`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `DumpItem` connect `Community 38` to `Community 0`, `Community 2`, `Community 35`, `Community 7`, `Community 8`, `Community 43`, `Community 49`, `Community 28`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `$schema`, `ignorePatterns`, `ignoreDependencies` to the rest of the system?**
  _437 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08615384615384615 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._