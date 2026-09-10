# ADX File Organizer

A desktop application built with Electron for organizing files by extension. Browse a folder, scan its contents, assign categories and destination rules per extension, and move everything in one click.

## Screenshots

![Dashboard](snaps/snap1.png)

![File Organization Rules](snaps/snap2.png)

![Activity Log](snaps/snap3.png)

## Features

- Browse and scan any folder on your system
- Auto-detects all file extensions present
- Color-coded extension badges by file type (images, video, audio, docs, code, archives)
- **Category system** — each extension is auto-assigned a category with a default destination path
- **Custom category dropdown** per row — choose from Images, Videos, Music, Documents, Archives, Code, Fonts, or Unknown
- Changing the category auto-fills the destination path; changing the path auto-detects and updates the category
- Unknown category leaves the destination blank (files are skipped)
- Supports both absolute paths (`C:\Users\you\Pictures`) and relative paths (`Images` → created inside source folder)
- Skips extensions with no destination configured (with confirmation prompt)
- Activity log with color-coded success / error / info entries
- Summary stats: total files, extensions found, rules configured
- Reset rules back to defaults at any time

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
| Music     | `.mp3` `.wav` `.flac` `.aac` `.ogg` `.wma` `.m4a` |
| Documents | `.pdf` `.doc` `.docx` `.xls` `.xlsx` `.ppt` `.pptx` `.txt` `.csv` `.rtf` `.odt` |
| Archives  | `.zip` `.rar` `.7z` `.tar` `.gz` `.bz2` `.xz` `.iso` |
| Code      | `.js` `.ts` `.py` `.java` `.cpp` `.c` `.cs` `.html` `.css` `.json` `.xml` `.php` `.rb` `.go` `.rs` `.sh` `.bat` |
| Fonts     | `.ttf` `.otf` `.woff` `.woff2` |

Any extension not listed above gets **Unknown** category with a blank destination.

## Usage

1. Click **Browse** to select a source folder, or use the default Downloads folder
2. Click **Scan Folder** to detect all file extensions
3. For each extension, pick a **Category** from the dropdown — the destination path fills in automatically
4. Optionally override the destination path manually (category updates to match, or falls back to Unknown)
5. Click **Organize Files**

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

**2.** Add to `package.json`:

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

**3.** Run the build:

```bash
npm run build
```

Output goes to `dist/`. Change `"target"` to `"portable"` for a single `.exe` with no installer.

## Tech Stack

- [Electron](https://www.electronjs.org/)
- Vanilla JS + HTML/CSS (no frontend framework)
- Node.js `fs` module for file operations

## License

MIT
