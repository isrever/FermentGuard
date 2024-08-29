const fs = require('fs');
const path = require('path');
const { logYellow } = require('./logger');

const createDirectoryIfNotExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const ensureFileExists = (filePath) => {
    const dir = path.dirname(filePath);
    createDirectoryIfNotExists(dir);

    if (!fs.existsSync(filePath)) {
        logYellow(`Creating file: ${filePath}`);
        fs.writeFileSync(filePath, '{}'); // Initialize the file with an empty JSON object
    }
};

const readJSONFile = (filePath) => {
    ensureFileExists(filePath);
    return JSON.parse(fs.readFileSync(filePath, 'utf8').trim() || '{}');
};

const writeJSONFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

module.exports = { ensureFileExists, readJSONFile, writeJSONFile, createDirectoryIfNotExists };
