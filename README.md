# ADX File Organizer

A modern, fast Electron desktop app for organizing files by extension. Scan folders, set organization rules with categories, and batch-move files to the right destinations — all with a sleek dark UI and persistent settings.

## Screenshots

![Dashboard](snaps/snap1.png)

![File Organization Rules](snaps/snap2.png)

![Activity Log](snaps/snap3.png)

## Features

**Core Organizer**
- Browse and scan any folder on your system
- Auto-detects all file extensions present
- **Recursive Mode toggle** — optionally scan and organize nested subfolders with loop-prevention safeguards
- Color-coded extension badges by file type
- **Category system** — each extension maps to a category with a default destination path
- **Custom category dropdown** per row — choose from Images, Videos, Music, Documents, Archives, Code, Fonts, or Unknown
- Supports both absolute paths (`C:\Users\you\Pictures`) and relative paths (`Images` → created inside source folder)
- Skips extensions with no destination configured (with confirmation prompt)

**Duplicate Finder**
- **Dual Detection Methods**:
  - **Fast (Size-based)**: Rapid scan grouping files by identical file size
  - **Accurate (Hash-based)**: Two-phase optimization (pre-filters by size, then streams SHA-256 hashes only on potential collisions)
- **Deep Recursive Traversal**: Searches subdirectories across the target folder
- **Real-Time Progress & Cancel**: Live file counter, progress bar, and instant scan abort
- **Resolution Actions**:
  - **Delete Selected**: Remove redundant copies with confirmation
  - **Move to Duplicates Folder**: Safely quarantine duplicate copies into a `./Duplicates` folder
  - **Keep Best**: Automatically retain the newest or largest file and purge duplicates
- Group-level statistics: total size and wasted storage metrics

**Persistent Customization**
- **User rules persistence** — custom paths you set are saved to `user-rules.json` in the app data folder
- **Settings persistence** — user preferences (scan method, recursive defaults, confirmations) saved to `settings.json`
- Default extension rules from `src/data/extensions/` are never modified
- Custom paths and preferences are remembered across app restarts
- Edit any path freely — category auto-updates when you change it, or falls back to "Unknown"

**Dashboard, Settings & Sidebar**
- **Collapsible sidebar** — toggle icon-only mode for more space
- **Multi-view navigation** — Organize, Duplicates, Activity, and Settings views
- **Preferences & Settings** — manage default scan depth, default duplicate method, confirmation dialogues, and factory resets
- **Live summary** — total files, extensions found, rules configured, duplicate groups, and wasted space
- **Unified Activity log** with color-coded success / error / info entries across all operations
- **Reset rules** button to restore defaults anytime

## Architecture

**No Hardcoded Data**
- Extension definitions live in `/src/data/extensions/` (images.js, videos.js, etc.)
- Categories assembled in `/src/data/categories.js`
- User customizations layer on top via `user-rules.json` — original files stay untouched
- Easy to add new categories: create a file in `/src/data/extensions/`, add one require() in categories.js

**Modular & Extensible**
- Sidebar nav items automatically map to view panels via `data-view` attributes
- Category dropdown auto-colors per category type
- Extension badges inherit colors from category mapping
- Category detection auto-derives from path comparison

## Categories & Default Paths

| Category  | Default Destination              |
|-----------|----------------------------------|
| Images    | `%USERPROFILE%\Pictures`         |
| Videos    | `%USERPROFILE%\Videos`           |
| Music     | `%USERPROFILE%\Music`            |
| Documents | `%USERPROFILE%\Documents`        |
| Archives  | `%USERPROFILE%\Downloads\Compressed` |
| Code      | `%USERPROFILE%\Documents\Code`   |
| Fonts     | `%USERPROFILE%\Documents\Fonts`  |
| Unknown   | *(blank — skipped)*              |

## Supported Extensions

| Category  | Extensions |
|-----------|------------|
| Images    | `.jpg` `.jpeg` `.png` `.gif` `.bmp` `.webp` `.svg` `.ico` `.tiff` `.heic` |
| Videos    | `.mp4` `.mkv` `.avi` `.mov` `.wmv` `.flv` `.webm` `.m4v` |
| Music     | `.mp3` `.wav` `.flac` `.aac` `.ogg` `.wma` `.m4a` `.opus` |
| Documents | `.pdf` `.doc` `.docx` `.xls` `.xlsx` `.ppt` `.pptx` `.txt` `.md` `.csv` `.rtf` `.odt` `.epub` |
| Archives  | `.zip` `.rar` `.7z` `.tar` `.gz` `.bz2` `.xz` `.iso` |
| Code      | `.js` `.ts` `.py` `.java` `.cpp` `.c` `.cs` `.html` `.css` `.json` `.xml` `.php` `.rb` `.go` `.rs` `.sh` `.bat` `.sql` `.yaml` `.toml` `.env` |
| Fonts     | `.ttf` `.otf` `.woff` `.woff2` `.eot` `.fon` |

Any extension not listed gets **Unknown** category with a blank destination.

## Usage

1. **Select Folder** — Click Browse or use Downloads (default)
2. **Scan** — Click "Scan Folder" to detect all extensions
3. **Customize** — For each extension:
   - Pick a category from the dropdown (auto-fills default path)
   - Or type a custom path manually (category auto-detects)
   - Your changes save automatically
4. **Organize** — Click "Organize Files"
5. **Review** — Check Activity view for results

## Installation

```bash
npm install
npm start
```

## Build to .exe

**1.** Install electron-builder:

```bash
npm install --save-dev electron-builder
```

**2.** Update `package.json`:

```json
{
  "scripts": {
    "build": "electron-builder --win"
  },
  "build": {
    "appId": "com.adx.file-organizer",
    "productName": "File Organizer",
    "directories": { "output": "dist" },
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "files": ["src/**/*", "package.json"]
  }
}
```

**3.** Build:

```bash
npm run build
```

Output goes to `dist/`. Change `"target"` to `"portable"` for a single standalone `.exe`.

## Project Structure

```
src/
  main.js              ← Electron main process, window lifecycle, IPC handlers
  preload.js           ← Context bridge exposing secure API subset
  renderer.js          ← UI logic for File Organizer view, table rendering
  duplicateFinder.js   ← Backend module for size & hash duplicate detection
  duplicates.js        ← UI logic and actions for Duplicates view
  settings.js          ← UI logic and persistence for Settings view
  index.html           ← Main application shell with tabbed views & sidebar
  styles.css           ← Dark theme, component styles, animations, responsive
  data/
    categories.js      ← Assembles all extensions + categories
    extensions/
      images.js        ← Image file types
      videos.js        ← Video file types
      music.js         ← Audio file types
      documents.js     ← Document types
      archives.js      ← Archive types
      code.js          ← Source code types
      fonts.js         ← Font types
```

## Persistence

User customizations and application preferences are stored in the user data directory:
- **Windows**: `%APPDATA%\ADX-File-Organizer\`
- **macOS**: `~/Library/Application Support/ADX-File-Organizer/`
- **Linux**: `~/.config/ADX-File-Organizer/`

Files stored:
- `user-rules.json` — Custom destination rules for extensions:
  ```json
  {
    ".pdf": { "path": "C:\\Users\\You\\Documents\\PDFs", "category": "Documents" },
    ".jpg": { "path": "E:\\Media\\Pictures", "category": "Images" }
  }
  ```
- `settings.json` — General application preferences (default duplicate method, recursive scanning toggle, confirmation dialogues).

## Future Features

- Undo last organize action
- Dry-run mode (preview file moves without modifying files)
- Watch mode (auto-organize newly downloaded or added files)
- Scheduled automated runs
- System tray background mode
- Storage analytics and file distribution dashboard

## Tech Stack

- [Electron](https://www.electronjs.org/) — desktop app framework
- Vanilla JavaScript — no frameworks or build tools
- HTML/CSS — custom dark theme
- Node.js `fs` module — async file operations

## License

MIT
