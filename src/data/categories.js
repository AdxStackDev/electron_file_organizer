/*
|--------------------------------------------------------------------------
| categories.js
|
| Assembles all extension definition files into two exports:
|
|   CATEGORIES   — { Images: { label, path }, Videos: { ... }, ... }
|   DEFAULT_RULES — { ".jpg": { category, path }, ".mp4": { ... }, ... }
|
| To add a new category: create a file in ./extensions/ and require it here.
| To add a new extension to an existing category: edit the relevant file.
| No changes needed in main.js or anywhere else.
|--------------------------------------------------------------------------
*/

const images    = require("./extensions/images");
const videos    = require("./extensions/videos");
const music     = require("./extensions/music");
const documents = require("./extensions/documents");
const archives  = require("./extensions/archives");
const code      = require("./extensions/code");
const fonts     = require("./extensions/fonts");


// All category modules in display order
const ALL_CATEGORIES = [
    images,
    videos,
    music,
    documents,
    archives,
    code,
    fonts
];


/*
|--------------------------------------------------------------------------
| CATEGORIES
| Shape: { [categoryKey]: { label: string, path: string } }
|--------------------------------------------------------------------------
*/

const CATEGORIES = {};

for (const mod of ALL_CATEGORIES) {
    CATEGORIES[mod.category] = {
        label: mod.category,
        path:  mod.folderPath
    };
}

// Unknown is always last and has no default path
CATEGORIES["Unknown"] = {
    label: "Unknown",
    path:  ""
};


/*
|--------------------------------------------------------------------------
| DEFAULT_RULES
| Shape: { [ext]: { category: string, path: string } }
| Built by iterating every extension in every category module.
| Each extension carries its own path (defaults to the category folderPath
| but can be overridden per-entry inside the extension file).
|--------------------------------------------------------------------------
*/

const DEFAULT_RULES = {};

for (const mod of ALL_CATEGORIES) {
    for (const entry of mod.extensions) {
        DEFAULT_RULES[entry.ext] = {
            category: mod.category,
            path:     entry.path
        };
    }
}


module.exports = { CATEGORIES, DEFAULT_RULES };
