# ADX File Organizer

A modern, desktop app for organizing files by extension. Scan folders, set organization rules with categories, and batch-move files to the right destinations — all with a sleek dark UI and persistent settings.

## Screenshots

![Dashboard](snaps/snap1.png)

![Activity Log](snaps/snap3.png)

## Features

**Core Organizer**
- Browse and scan any folder on your system
- Auto-detects all file extensions present
- Color-coded extension badges by file type
- **Category system** — each extension maps to a category with a default destination path
- **Custom category dropdown** per row — choose from Images, Videos, Music, Documents, Archives, Code, Fonts, or Unknown
- Supports both absolute paths (`C:\Users\you\Pictures`) and relative paths (`Images` → created inside source folder)
- Skips extensions with no destination configured (with confirmation prompt)

**Persistent Customization**
- **User rules persistence** — custom paths you set are saved to `user-rules.json` in the app data folder
- Default extension rules from `src/data/extensions/` are never modified
- Custom paths are remembered across app restarts
- Edit any path freely — category auto-updates when you change it, or falls back to "Unknown"

**Dashboard & Sidebar**
- **Collapsible sidebar** — toggle icon-only mode for more space
- **Multi-view navigation** — Organize, Activity, and Settings views
- **Live summary** — total files, extensions found, rules configured
- **Activity log** with color-coded success / error / info entries
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
  main.js              ← Electron main process, IPC handlers
  preload.js           ← Context bridge to expose APIs
  renderer.js          ← UI logic, sidebar, view switching
  index.html           ← HTML structure with sidebar + views
  styles.css           ← Dark theme, sidebar animations, responsive
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

User customizations are stored at:
- **Windows**: `%APPDATA%\ADX-File-Organizer\user-rules.json`
- **macOS**: `~/Library/Application Support/ADX-File-Organizer/user-rules.json`
- **Linux**: `~/.config/ADX-File-Organizer/user-rules.json`

Format:
```json
{
  ".pdf": { "path": "C:\\Users\\You\\Documents\\PDFs", "category": "Documents" },
  ".jpg": { "path": "E:\\Media\\Pictures", "category": "Images" }
}
```

## Future Features

- Undo last organize
- Dry-run mode (preview without moving)
- Duplicate detection
- Watch mode (auto-organize new files)
- Scheduled runs
- System tray mode
- Statistics dashboard

## Tech Stack

- [Electron](https://www.electronjs.org/) — desktop app framework
- Vanilla JavaScript — no frameworks or build tools
- HTML/CSS — custom dark theme
- Node.js `fs` module — async file operations

## License

MIT
