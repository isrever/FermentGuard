const fs = require('fs');
const path = require('path');
const { logYellow, logRedError } = require('../utils/logger');
const config = require('../config/config');
const { readJSONFile, writeJSONFile } = require('../utils/fileUtils');

const tokensFilePath = path.join(config.dataDir, 'ispindel_tokens.json');

const loadTokens = () => readJSONFile(tokensFilePath);

// Save tokens to the JSON file
const saveTokens = (tokens) => {
    writeJSONFile(tokensFilePath, tokens);
};

// Function to update the polynomial formula for a given token
const updateTokenFormula = (name, formula) => {
    try {
        const tokens = readJSONFile(tokensFilePath); // Read existing tokens
        if (tokens[name]) {
            tokens[name].formula = formula; // Update the formula
            writeJSONFile(tokensFilePath, tokens); // Save the updated tokens
            logYellow(`Updated formula for token: ${name}`);
            return { status: 'ok', message: `Formula updated for ${name}` };
        } else {
            logRedError(`Token ${name} not found.`);
            return { status: 'error', message: `Token ${name} not found` };
        }
    } catch (error) {
        logRedError(`Failed to update token formula: ${error.message}`);
        return { status: 'error', message: `Failed to update token formula: ${error.message}` };
    }
};

// Function to create necessary directories and files for a new token
const createTokenDirectoriesAndFiles = (tokenName) => {
    const tokenDataDir = path.join(__dirname, '../data', tokenName);

    if (!fs.existsSync(tokenDataDir)) {
        logYellow(`Creating directory for token: ${tokenName}`);
        fs.mkdirSync(tokenDataDir, { recursive: true });
    }

    // Create necessary data files
    const filesToCreate = ['angle_data.dat', 'temperature_data.dat', 'battery_data.dat', 'sg_data.dat'];
    filesToCreate.forEach((file) => {
        const filePath = path.join(tokenDataDir, file);
        ensureFileExists(filePath); // This function creates the file if it doesn't exist
    });
};

// Function to add a new token
const addToken = (name, color) => {
    logYellow(`Adding new token: ${name}`);
    const tokens = loadTokens();

    if (tokens[name]) {
        logRedError(`Token with name ${name} already exists.`);
        return { status: 'error', message: 'Token name already exists' };
    }

    const newToken = {
        value: crypto.randomBytes(16).toString('hex'),
        color: color || '#000000',
        formula: ''  // Default empty formula, can be updated later
    };

    tokens[name] = newToken;
    saveTokens(tokens);

    // Create directories and files for the new token
    createTokenDirectoriesAndFiles(name);

    return { status: 'ok', token: newToken.value };
};

// Function to regenerate an existing token
const regenerateToken = (name) => {
    logYellow(`Regenerating token for: ${name}`);
    const tokens = loadTokens();

    if (tokens[name]) {
        const newToken = crypto.randomBytes(16).toString('hex');
        tokens[name].value = newToken;
        saveTokens(tokens);
        return { status: 'ok', token: newToken };
    } else {
        logRedError("Token not found.");
        return { status: 'error', message: 'Token not found' };
    }
};

// Function to delete a token
const deleteToken = (name) => {
    logYellow(`Deleting token: ${name}`);
    const tokens = loadTokens();

    if (tokens[name]) {
        delete tokens[name];
        saveTokens(tokens);

        // Optionally, you might want to delete the associated directory and files
        const tokenDataDir = path.join(__dirname, '../data', name);
        if (fs.existsSync(tokenDataDir)) {
            fs.rmSync(tokenDataDir, { recursive: true, force: true });
            logYellow(`Deleted directory for token: ${name}`);
        }

        return { status: 'ok', name: name };
    } else {
        logRedError("Token not found.");
        return { status: 'error', message: 'Token not found' };
    }
};

const handleTokenManagement = (req, res) => {
    if (req.method === 'GET') {
        const tokens = loadTokens();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(tokens));
    } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const { action, name, color, formula } = JSON.parse(body);

            let result;
            if (action === 'add') {
                result = addToken(name, color);
            } else if (action === 'regenerate') {
                result = regenerateToken(name);
            } else if (action === 'delete') {
                result = deleteToken(name);
            } else if (action === 'updateFormula') {
                result = updateTokenFormula(name, formula);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        });
    } else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method not allowed');
    }
};

module.exports = { loadTokens, handleTokenManagement, updateTokenFormula };
