const os   = require("os");
const path = require("path");

const category   = "Videos";
const folderPath = path.join(os.homedir(), "Videos");

const extensions = [
    { ext: ".mp4",  path: folderPath },
    { ext: ".mkv",  path: folderPath },
    { ext: ".avi",  path: folderPath },
    { ext: ".mov",  path: folderPath },
    { ext: ".wmv",  path: folderPath },
    { ext: ".flv",  path: folderPath },
    { ext: ".webm", path: folderPath },
    { ext: ".m4v",  path: folderPath },
    { ext: ".3gp",  path: folderPath },
    { ext: ".ts",   path: folderPath }
];

module.exports = { category, folderPath, extensions };
