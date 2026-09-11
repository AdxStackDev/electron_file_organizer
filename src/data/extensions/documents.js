const os   = require("os");
const path = require("path");

const category   = "Documents";
const folderPath = path.join(os.homedir(), "Documents");

const extensions = [
    { ext: ".pdf",  path: folderPath },
    { ext: ".doc",  path: folderPath },
    { ext: ".docx", path: folderPath },
    { ext: ".xls",  path: folderPath },
    { ext: ".xlsx", path: folderPath },
    { ext: ".ppt",  path: folderPath },
    { ext: ".pptx", path: folderPath },
    { ext: ".txt",  path: folderPath },
    { ext: ".csv",  path: folderPath },
    { ext: ".rtf",  path: folderPath },
    { ext: ".odt",  path: folderPath },
    { ext: ".md",   path: folderPath },
    { ext: ".epub", path: folderPath }
];

module.exports = { category, folderPath, extensions };
