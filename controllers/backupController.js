const fs = require('fs');
const path = require('path');
const os = require('os'); // Import os module to use the system's temp directory
const {
    logYellow,
    logRedError
} = require('../utils/logger');
const config = require('../config/config');
const {
    createDirectoryIfNotExists
} = require('../utils/fileUtils');
const {
    loadTokens
} = require('./tokenController');


const backupFilePath = path.join(config.dataDir, 'backup.json');
const tokensFilePath = path.join(config.dataDir, 'ispindel_tokens.json');

/**
 * Creates a backup of tokens and writes it to a specified backup file.
 *
 * This function loads the tokens, creates a backup object, and writes it as a JSON file to the configured backup file path.
 * It sends a success or error response to the client based on the outcome of the operation.
 *
 * @param {ServerResponse} res - The HTTP response object used to send the status of the backup operation.
 *
 * @returns {void}
 */
const createBackup = (res) => {
    logYellow("Creating backup...");
    try {
        const tokens = loadTokens();
        const backup = {
            tokens
        };

        fs.writeFileSync(backupFilePath, JSON.stringify(backup, null, 2));

        logYellow(`Backup created successfully at ${backupFilePath}`);
        res.writeHead(200, {
            'Content-Type': 'text/plain'
        });
        res.end('Backup created successfully');
    } catch (error) {
        logRedError(`Failed to create backup: ${error.message}`);
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        res.end(`Failed to create backup: ${error.message}`);
    }
};

/**
 * Restores data from a backup file uploaded via an HTTP request.
 *
 * This function reads and processes the uploaded backup file (in multipart form data), extracts JSON content,
 * and restores the tokens and their associated data. It also ensures that required directories and data files
 * are created or updated as needed. Temporary files created during the process are removed after successful restoration.
 *
 * @param {IncomingMessage} req - The HTTP request object containing the uploaded backup file.
 * @param {ServerResponse} res - The HTTP response object used to send the status of the restoration process.
 *
 * @returns {void}
 */
const restoreBackup = (req, res) => {
    logYellow("Restoring data from backup...");

    let rawData = '';

    req.on('data', (chunk) => {
        rawData += chunk.toString();
    });

    req.on('end', () => {
        try {
            // Find the start and end of the JSON data in the multipart form data
            const jsonStartIndex = rawData.indexOf('{');
            const jsonEndIndex = rawData.lastIndexOf('}') + 1;

            if (jsonStartIndex === -1 || jsonEndIndex === -1) {
                throw new Error('Uploaded file is malformed or no JSON content found.');
            }

            // Extract the JSON content
            const jsonContent = rawData.substring(jsonStartIndex, jsonEndIndex);
            logYellow(`Extracted JSON content: ${jsonContent}`);

            // Parse the JSON content
            const backup = JSON.parse(jsonContent);

            const tokensFilePath = path.join(config.dataDir, 'ispindel_tokens.json');
            fs.writeFileSync(tokensFilePath, JSON.stringify(backup.tokens, null, 2));
            logYellow(`Restored tokens to ${tokensFilePath}`);

            // Ensure directories and necessary files exist for each token
            for (const tokenName of Object.keys(backup.tokens)) {
                const tokenDir = path.join(config.dataDir, tokenName);
                createDirectoryIfNotExists(tokenDir); // Create directory if it doesn't exist

                // Ensure each required data file exists
                const dataFiles = ['angle_data.dat', 'temperature_data.dat', 'battery_data.dat', 'sg_data.dat'];
                dataFiles.forEach(file => {
                    const filePath = path.join(tokenDir, file);
                    if (!fs.existsSync(filePath)) {
                        fs.writeFileSync(filePath, ''); // Create an empty file if it doesn't exist
                        logYellow(`Created empty data file: ${filePath}`);
                    }
                });
            }

            // Delete the uploaded_backup.json file
            const uploadedBackupFilePath = path.join(config.dataDir, 'uploaded_backup.json');
            if (fs.existsSync(uploadedBackupFilePath)) {
                fs.unlinkSync(uploadedBackupFilePath);
                logYellow(`Deleted temporary backup file: ${uploadedBackupFilePath}`);
            }

            res.writeHead(200, {
                'Content-Type': 'text/plain'
            });
            res.end('Data restored successfully');
        } catch (error) {
            logRedError(`Failed to restore data: ${error.message}`);
            res.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            res.end(`Failed to restore data: ${error.message}`);
        }
    });

    req.on('error', (error) => {
        logRedError(`Failed to receive file: ${error.message}`);
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        res.end(`Failed to receive file: ${error.message}`);
    });
};


module.exports = {
    createBackup,
    restoreBackup
};