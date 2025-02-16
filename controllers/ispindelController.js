const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const {
    logYellow,
    logRedError
} = require('../utils/logger');
const {
    sendEmailAlert,
    initializeEmailTransporter
} = require('../utils/emailUtils');
const {
    writeDataToFile
} = require('../utils/fileUtils');
const {
    loadEmailConfig
} = require('./emailController');
const {
    loadTokens
} = require('./tokenController');

const lastSGFilePath = path.join(config.dataDir, 'last_sg.json');
const dataDir = path.join(config.dataDir);

/**
 * Loads the last recorded specific gravity (SG) values from a file.
 *
 * This function checks if the SG file exists and reads its contents. If the file exists,
 * it parses and returns the JSON content. If the file does not exist, it returns an empty object.
 *
 * @returns {Object} - An object containing the last recorded SG values for each token.
 */
const loadLastSGValues = () => {
    if (fs.existsSync(lastSGFilePath)) {
        return JSON.parse(fs.readFileSync(lastSGFilePath, 'utf8'));
    }
    return {};
};

/**
 * Saves the last recorded specific gravity (SG) values to a file.
 *
 * This function writes the provided SG values to a file in JSON format. 
 * It overwrites the existing file if it already exists and logs the save operation.
 *
 * @param {Object} values - An object containing the last recorded SG values for each token.
 * @param {string} values[tokenName] - The specific gravity value for the token.
 *
 * @returns {void}
 */
const saveLastSGValues = (values) => {
    fs.writeFileSync(lastSGFilePath, JSON.stringify(values, null, 2));
    logYellow(`Saved last SG values to ${lastSGFilePath}`);
};

/**
 * Handles POST requests for iSpindel data submission.
 *
 * This function processes incoming iSpindel data, validates the token, calculates derived values,
 * updates SG (specific gravity) values, logs data, and optionally sends email alerts based on the
 * configured thresholds and email settings.
 *
 * It writes data such as angle, temperature, battery, and SG to respective files and updates SG change
 * notifications if certain thresholds are met.
 *
 * @param {IncomingMessage} req - The HTTP request object containing iSpindel data in JSON format.
 * @param {ServerResponse} res - The HTTP response object used to send the status of the data processing.
 *
 * @returns {void}
 *
 * @throws {Error} If the request data cannot be processed or there is an issue with token validation.
 */
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
            //gravity + offset tokens[name]
            const sg = data.gravity + config.offset;

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
                    if (sg !== undefined && previousSG !== undefined && (!previousSG || Math.abs(sg - previousSG) >= config.SG_CHANGE_THRESHOLD)) {
                        logYellow(`The SG value for ${tokenName} has changed significantly. New SG value is ${sg}.`)
                        sendEmailAlert(
                            `SG Alert for ${tokenName}`,
                            `The SG value for ${tokenName} has changed significantly. New SG value is ${sg}.`,
                            emailConfig
                        );
                    }

                    if (sg !== undefined && previousSG !== undefined && config.ONETHIRDBREAK !== null && (!previousSG || (sg >= config.ONETHIRDBREAK && Math.abs(sg - config.ONETHIRDBREAK) <= 0.005))) {
                        logYellow("SG is greater than or equal to ONETHIRDBREAK and within +0.005.");
                        sendEmailAlert(
                            `SG Alert for ${tokenName} - Approaching ONETHIRDBREAK`,
                            `The SG value for ${tokenName} is greater than or equal to the threshold and within +0.005 of the specified limit (${config.ONETHIRDBREAK}). The current SG value is ${sg}.`,
                            emailConfig
                        );
                    }

                    if (sg !== undefined && previousSG !== undefined && config.ONETHIRDBREAK !== null && (!previousSG || (sg <= config.ONETHIRDBREAK && Math.abs(sg - config.ONETHIRDBREAK) <= 0.005))) {
                        logYellow("SG is less than ONETHIRDBREAK and within -0.005.");
                        sendEmailAlert(
                            `SG Alert for ${tokenName} - Passed ONETHIRDBREAK`,
                            `The SG value for ${tokenName} is less than or equal to the the threshold and within -0.005 of the specified limit (${config.ONETHIRDBREAK}). The current SG value is ${sg}.`,
                            emailConfig
                        );
                    }
                    // Check if SG has reached 1.000 or changed
                    if (sg !== undefined && previousSG !== undefined && (sg >= 1.000 - 0.005 && sg <= 1.000 + 0.005)) {
                        logYellow(`The SG value for ${tokenName} is ±0.005 of 1.000. Current SG value is ${sg}.`);
                        sendEmailAlert(
                            `SG Alert for ${tokenName}`,
                            `The SG value for ${tokenName} is within ±0.005 of 1.000. Current SG value is ${sg}.`,
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
            fs.mkdirSync(tokenDataDir, {
                recursive: true
            });

            writeDataToFile(path.join(tokenDataDir, 'angle_data.dat'), `${timestamp}, ${angle}`);
            writeDataToFile(path.join(tokenDataDir, 'temperature_data.dat'), `${timestamp}, ${temperature}`);
            writeDataToFile(path.join(tokenDataDir, 'battery_data.dat'), `${timestamp}, ${battery}`);
            writeDataToFile(path.join(tokenDataDir, 'sg_data.dat'), `${timestamp}, ${sg}`);

            res.writeHead(200, {
                'Content-Type': 'text/plain'
            });
            res.end('Data processed successfully');
        } catch (error) {
            logRedError(`Error processing iSpindel data: ${error.message}`);
            res.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            res.end(`Error processing data: ${error.message}`);
        }
    });
};

module.exports = {
    handleIspindelPost
};