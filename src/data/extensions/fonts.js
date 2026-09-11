const os   = require("os");
const path = require("path");

const category   = "Fonts";
const folderPath = path.join(os.homedir(), "Documents", "Fonts");

const extensions = [
    { ext: ".ttf",   path: folderPath },
    { ext: ".otf",   path: folderPath },
    { ext: ".woff",  path: folderPath },
    { ext: ".woff2", path: folderPath },
    { ext: ".eot",   path: folderPath },
    { ext: ".fon",   path: folderPath }
];

module.exports = { category, folderPath, extensions };
