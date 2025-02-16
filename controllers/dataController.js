const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const {
    logYellow,
    logRedError
} = require('../utils/logger');
const {
    readJSONFile,
    writeJSONFile,
    createDirectoryIfNotExists
} = require('../utils/fileUtils');
const {
    loadTokens
} = require('./tokenController');

const lastSGFilePath = path.join(config.dataDir, 'last_sg.json');

/**
 * Serves token data and ensures all necessary files and directories exist.
 *
 * This function loads token data, ensures required directories and files exist for each token,
 * and serves the data as a JSON response. If any files or directories are missing, they are created
 * dynamically during the process. If an error occurs, it logs the issue and responds with an error message.
 *
 * @param {ServerResponse} res - The HTTP response object used to send the token data or an error message.
 *
 * @returns {void}
 */
const serveData = (res) => {
    logYellow("Serving data...");
    let filesGenerated = false;

    try {
        const tokens = loadTokens();
        const data = {};

        for (const tokenName of Object.keys(tokens)) {
            const tokenDataDir = path.join(config.dataDir, tokenName);
            createDirectoryIfNotExists(tokenDataDir); // Ensure the directory exists

            // Define the required files
            const filesToServe = {
                angleData: 'angle_data.dat',
                temperatureData: 'temperature_data.dat',
                batteryData: 'battery_data.dat',
                sgData: 'sg_data.dat', // Added sg_data.dat
            };

            data[tokenName] = {};

            // Ensure each file exists and populate data
            for (const [key, fileName] of Object.entries(filesToServe)) {
                const filePath = path.join(tokenDataDir, fileName);
                if (!fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, ''); // Create the file if it doesn't exist
                    logYellow(`Created missing file: ${filePath}`);
                    filesGenerated = true; // Track if files were generated
                }
                data[tokenName][key] = fs.readFileSync(filePath, 'utf8');
            }

            // Add formula data
            data[tokenName].formula = tokens[tokenName].formula || '';
        }

        if (filesGenerated) {
            logYellow("Some files or directories were missing and have been generated.");
        }

        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(data));
    } catch (error) {
        logRedError(`Failed to serve data: ${error.message}`);
        if (filesGenerated) {
            logYellow("Files were generated despite the error.");
        }
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        res.end(`Failed to serve data: ${error.message}. Missing files or directories have been created.`);
    }
};


/**
 * Clears all data for the configured tokens and resets related files.
 *
 * This function ensures that all token data files and related logs are cleared by overwriting them with empty content.
 * It also ensures necessary directories exist and logs each cleared file. If an error occurs, it logs the issue and
 * sends an appropriate error response to the client.
 *
 * @param {ServerResponse} res - The HTTP response object used to send the status of the clear operation.
 *
 * @returns {void}
 */
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
        res.writeHead(200, {
            'Content-Type': 'text/plain'
        });
        res.end('All data cleared successfully');
    } catch (error) {
        logRedError(`Failed to clear data: ${error.message}`);
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        res.end(`Failed to clear data: ${error.message}`);
    }
};

module.exports = {
    serveData,
    clearData
};