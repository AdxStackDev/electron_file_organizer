const os   = require("os");
const path = require("path");

const category   = "Music";
const folderPath = path.join(os.homedir(), "Music");

const extensions = [
    { ext: ".mp3",  path: folderPath },
    { ext: ".wav",  path: folderPath },
    { ext: ".flac", path: folderPath },
    { ext: ".aac",  path: folderPath },
    { ext: ".ogg",  path: folderPath },
    { ext: ".wma",  path: folderPath },
    { ext: ".m4a",  path: folderPath },
    { ext: ".opus", path: folderPath },
    { ext: ".aiff", path: folderPath }
];

module.exports = { category, folderPath, extensions };
