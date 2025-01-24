const {
    logYellow,
    logRedError
} = require('../utils/logger');
const {
    readJSONFile,
    writeJSONFile
} = require('../utils/fileUtils');
const {
    initializeEmailTransporter
} = require('../utils/emailUtils');
const path = require('path');
const config = require('../config/config');
const emailConfigFilePath = path.join(config.dataDir, 'email_config.json');

/**
 * Loads the email configuration from a JSON file.
 *
 * This function reads the email configuration stored in a JSON file and returns the parsed object.
 * If the file does not exist, it ensures the file is created with an empty JSON object before attempting to read it.
 *
 * @returns {Object} - The email configuration object loaded from the file.
 */
const loadEmailConfig = () => readJSONFile(emailConfigFilePath);

/**
 * Saves the email configuration to a JSON file.
 *
 * This function writes the provided email configuration object to a predefined file path.
 * If the file or its directory does not exist, it will be created automatically.
 *
 * @param {Object} config - The email configuration object to save.
 * @param {string} config.recipientEmail - The recipient's email address.
 * @param {string} config.gmailUser - The Gmail username (email address) used for authentication.
 * @param {string} config.gmailPass - The Gmail password or app-specific password used for authentication.
 *
 * @returns {void}
 */
const saveEmailConfig = (config) => writeJSONFile(emailConfigFilePath, config);

/**
 * Handles HTTP requests for retrieving or updating the email configuration.
 *
 * This function supports:
 * - `GET` requests: Retrieves the current email configuration from the JSON file and responds with it in JSON format.
 * - `POST` requests: Saves the provided email configuration, initializes the email transporter, and responds with a success message.
 * 
 * If an error occurs during saving or updating the configuration, it responds with an appropriate error message.
 *
 * @param {IncomingMessage} req - The HTTP request object.
 * @param {ServerResponse} res - The HTTP response object.
 *
 * @returns {void}
 */
const handleEmailConfig = (req, res) => {
    logYellow("Handling email config request...");
    if (req.method === 'GET') {
        const emailConfig = loadEmailConfig();
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(emailConfig));
    } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const emailConfig = JSON.parse(body);
                saveEmailConfig(emailConfig);
                initializeEmailTransporter(emailConfig);
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    status: 'Email configuration saved successfully'
                }));
            } catch (error) {
                logRedError('Error saving email configuration:', error);
                res.writeHead(500, {
                    'Content-Type': 'text/plain'
                });
                res.end('Failed to save email configuration');
            }
        });
    }
};

module.exports = {
    handleEmailConfig,
    loadEmailConfig
};