const os   = require("os");
const path = require("path");

const category   = "Images";
const folderPath = path.join(os.homedir(), "Pictures");

const extensions = [
    { ext: ".jpg",  path: folderPath },
    { ext: ".jpeg", path: folderPath },
    { ext: ".png",  path: folderPath },
    { ext: ".gif",  path: folderPath },
    { ext: ".bmp",  path: folderPath },
    { ext: ".webp", path: folderPath },
    { ext: ".svg",  path: folderPath },
    { ext: ".ico",  path: folderPath },
    { ext: ".tiff", path: folderPath },
    { ext: ".heic", path: folderPath },
    { ext: ".raw",  path: folderPath }
];

module.exports = { category, folderPath, extensions };
