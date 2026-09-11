const os   = require("os");
const path = require("path");

const category   = "Archives";
const folderPath = path.join(os.homedir(), "Downloads", "Compressed");

const extensions = [
    { ext: ".zip",  path: folderPath },
    { ext: ".rar",  path: folderPath },
    { ext: ".7z",   path: folderPath },
    { ext: ".tar",  path: folderPath },
    { ext: ".gz",   path: folderPath },
    { ext: ".bz2",  path: folderPath },
    { ext: ".xz",   path: folderPath },
    { ext: ".iso",  path: folderPath },
    { ext: ".cab",  path: folderPath },
    { ext: ".tgz",  path: folderPath }
];

module.exports = { category, folderPath, extensions };
