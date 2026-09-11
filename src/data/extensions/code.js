const os   = require("os");
const path = require("path");

const category   = "Code";
const folderPath = path.join(os.homedir(), "Documents", "Code");

const extensions = [
    { ext: ".js",   path: folderPath },
    { ext: ".jsx",  path: folderPath },
    { ext: ".ts",   path: folderPath },
    { ext: ".tsx",  path: folderPath },
    { ext: ".py",   path: folderPath },
    { ext: ".java", path: folderPath },
    { ext: ".cpp",  path: folderPath },
    { ext: ".c",    path: folderPath },
    { ext: ".cs",   path: folderPath },
    { ext: ".html", path: folderPath },
    { ext: ".css",  path: folderPath },
    { ext: ".json", path: folderPath },
    { ext: ".xml",  path: folderPath },
    { ext: ".php",  path: folderPath },
    { ext: ".rb",   path: folderPath },
    { ext: ".go",   path: folderPath },
    { ext: ".rs",   path: folderPath },
    { ext: ".sh",   path: folderPath },
    { ext: ".bat",  path: folderPath },
    { ext: ".sql",  path: folderPath },
    { ext: ".yaml", path: folderPath },
    { ext: ".yml",  path: folderPath },
    { ext: ".toml", path: folderPath },
    { ext: ".env",  path: folderPath }
];

module.exports = { category, folderPath, extensions };
