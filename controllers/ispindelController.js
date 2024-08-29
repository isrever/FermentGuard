const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { logYellow, logRedError } = require('../utils/logger');
const { sendEmailAlert, initializeEmailTransporter} = require('../utils/emailUtils');
const { loadEmailConfig } = require('./emailController');
const { loadTokens } = require('./tokenController');

const lastSGFilePath = path.join(config.dataDir, 'last_sg.json');
const dataDir = path.join(config.dataDir);

const loadLastSGValues = () => {
    if (fs.existsSync(lastSGFilePath)) {
        return JSON.parse(fs.readFileSync(lastSGFilePath, 'utf8'));
    }
    return {};
};

const saveLastSGValues = (values) => {
    fs.writeFileSync(lastSGFilePath, JSON.stringify(values, null, 2));
    logYellow(`Saved last SG values to ${lastSGFilePath}`);
};

const writeDataToFile = (filePath, data) => {
    try {
        fs.appendFileSync(filePath, `${data}\n`);
        logYellow(`Data successfully written to ${filePath}`);
    } catch (error) {
        logRedError(`Failed to write to file: ${filePath} - Error: ${error.message}`);
    }
};

const handleIspindelPost = (req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
        try {
            logYellow('Processing received data...');
            const data = JSON.parse(body);
            logYellow(`Received data: ${JSON.stringify(data)}`);

            // Log the tilt (angle) data to the console
            logYellow(`Tilt (Angle) Data: ${data.angle}`);

            const receivedToken = data.token;
            const tokens = loadTokens();
            const tokenName = Object.keys(tokens).find(name => tokens[name].value === receivedToken);

            if (!tokenName) {
                throw new Error('Token not found in ispindel_tokens.json');
            }

            logYellow(`Token matched to: ${tokenName}`);

            const angle = data.angle;
            const temperature = data.temperature;
            const battery = data.battery;
            const sg = data.gravity;

            const emailConfig = loadEmailConfig();
            let emailEnabled = false;

            if (!emailConfig || Object.keys(emailConfig).length === 0) {
    logRedError('Email configuration is empty. Email functionality is disabled.');
} else {
    emailEnabled = initializeEmailTransporter(emailConfig);
}

            if (emailConfig) {
                const lastSGValues = loadLastSGValues();
                const previousSG = lastSGValues[tokenName];
                if (emailEnabled) {
                if (sg && previousSG !== undefined && (!previousSG || Math.abs(sg - previousSG) >= config.SG_CHANGE_THRESHOLD)) {
                    logYellow(`The SG value for ${tokenName} has changed significantly. New SG value is ${sg}.`)
                    sendEmailAlert(
                        `SG Alert for ${tokenName}`,
                        `The SG value for ${tokenName} has changed significantly. New SG value is ${sg}.`,
                        emailConfig
                    );
                }
            }

                lastSGValues[tokenName] = sg;
                saveLastSGValues(lastSGValues);
            } else {
                logRedError('Email configuration is not set up.');
            }

            const timestamp = new Date().toISOString();
            const tokenDataDir = path.join(dataDir, tokenName);
            fs.mkdirSync(tokenDataDir, { recursive: true });

            writeDataToFile(path.join(tokenDataDir, 'angle_data.dat'), `${timestamp}, ${angle}`);
            writeDataToFile(path.join(tokenDataDir, 'temperature_data.dat'), `${timestamp}, ${temperature}`);
            writeDataToFile(path.join(tokenDataDir, 'battery_data.dat'), `${timestamp}, ${battery}`);
            writeDataToFile(path.join(tokenDataDir, 'sg_data.dat'), `${timestamp}, ${sg}`);

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Data processed successfully');
        } catch (error) {
            logRedError(`Error processing iSpindel data: ${error.message}`);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Error processing data: ${error.message}`);
        }
    });
};

module.exports = { handleIspindelPost };
