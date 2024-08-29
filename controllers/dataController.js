const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { logYellow, logRedError } = require('../utils/logger');
const { readJSONFile, writeJSONFile, createDirectoryIfNotExists } = require('../utils/fileUtils');
const { loadTokens } = require('./tokenController');

const lastSGFilePath = path.join(config.dataDir, 'last_sg.json');

const serveData = (res) => {
    logYellow("Serving data...");
    try {
        const tokens = loadTokens();
        const data = {};

        for (const tokenName of Object.keys(tokens)) {
            const tokenDataDir = path.join(config.dataDir, tokenName);
            data[tokenName] = {
                angleData: fs.readFileSync(path.join(tokenDataDir, 'angle_data.dat'), 'utf8'),
                temperatureData: fs.readFileSync(path.join(tokenDataDir, 'temperature_data.dat'), 'utf8'),
                batteryData: fs.readFileSync(path.join(tokenDataDir, 'battery_data.dat'), 'utf8'),
                formula: tokens[tokenName].formula || ''
            };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    } catch (error) {
        logRedError(`Failed to serve data: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Failed to serve data: ${error.message}`);
    }
};

const clearData = (res) => {
    logYellow("Clearing data...");
    try {
        const tokens = loadTokens();

        for (const tokenName of Object.keys(tokens)) {
            const tokenDataDir = path.join(config.dataDir, tokenName);
            createDirectoryIfNotExists(tokenDataDir);

            const filesToClear = ['angle_data.dat', 'temperature_data.dat', 'battery_data.dat', 'sg_data.dat'];

            filesToClear.forEach(file => {
                const filePath = path.join(tokenDataDir, file);
                fs.writeFileSync(filePath, ''); // Clear each file
                logYellow(`Cleared data in file: ${filePath}`);
            });
        }

        fs.writeFileSync(path.join(config.dataDir, 'ispindel_data.log'), '');
        fs.writeFileSync(lastSGFilePath, '{}'); // Clear the last SG values

        logYellow("All data cleared successfully.");
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('All data cleared successfully');
    } catch (error) {
        logRedError(`Failed to clear data: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Failed to clear data: ${error.message}`);
    }
};

module.exports = { serveData, clearData };
