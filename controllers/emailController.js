const { logYellow, logRedError } = require('../utils/logger');
const { readJSONFile, writeJSONFile } = require('../utils/fileUtils');
const { initializeEmailTransporter } = require('../utils/emailUtils');
const path = require('path');
const config = require('../config/config');
const emailConfigFilePath = path.join(config.dataDir, 'email_config.json');

const loadEmailConfig = () => readJSONFile(emailConfigFilePath);
const saveEmailConfig = (config) => writeJSONFile(emailConfigFilePath, config);

const handleEmailConfig = (req, res) => {
    logYellow("Handling email config request...");
    if (req.method === 'GET') {
        const emailConfig = loadEmailConfig();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(emailConfig));
    } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const emailConfig = JSON.parse(body);
                saveEmailConfig(emailConfig);
                initializeEmailTransporter(emailConfig);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'Email configuration saved successfully' }));
            } catch (error) {
                logRedError('Error saving email configuration:', error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Failed to save email configuration');
            }
        });
    }
};

module.exports = { handleEmailConfig, loadEmailConfig };
