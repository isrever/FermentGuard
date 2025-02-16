const fs = require('fs');
const path = require('path');
const {
    logYellow,
    logRedError
} = require('../utils/logger');
const config = require('../config/config');
const {
    readJSONFile,
    writeJSONFile,
    ensureFileExists
} = require('../utils/fileUtils');
const crypto = require('crypto');

const tokensFilePath = path.join(config.dataDir, 'ispindel_tokens.json');

/**
 * Loads tokens from the token file and ensures each token has a default `offset` field.
 *
 * This function ensures the token file exists, reads its content, and parses it as JSON.
 * If any tokens are missing the `offset` field, it initializes it to `0`. If an error occurs,
 * it logs the error and returns an empty object.
 *
 * @returns {Object} - An object containing the loaded tokens. Each token is ensured to have an `offset` field.
 */
const loadTokens = () => {
    try {
        ensureFileExists(tokensFilePath, '{}');
        const tokens = readJSONFile(tokensFilePath);

        // Ensure all tokens have an offset field
        Object.keys(tokens).forEach((name) => {
            if (!('offset' in tokens[name])) {
                tokens[name].offset = 0; // Default offset value
            }
        });

        return tokens;
    } catch (error) {
        logRedError(`Error loading tokens: ${error.message}`);
        return {};
    }
};

/**
 * Saves tokens to the token file in JSON format.
 *
 * This function writes the provided tokens object to the token file. If an error occurs during the operation,
 * it logs the error. The tokens object is expected to have keys representing token names, and values containing
 * details about each token.
 *
 * @param {Object} tokens - An object containing tokens to save.
 *
 * @returns {void}
 */
const saveTokens = (tokens) => {
    try {
        console.log('Attempting to save tokens:', tokens);
        writeJSONFile(tokensFilePath, tokens);
        console.log('Tokens successfully saved.');
    } catch (error) {
        logRedError(`Error saving tokens: ${error.message}`);
    }
};

/**
 * Updates the formula and offset of a specific token in the token file.
 *
 * This function modifies the `formula` and `offset` properties of a given token identified by its name.
 * If the token exists, the changes are saved to the token file. If the token is not found, an error message is logged and returned.
 *
 * @param {string} name - The name of the token to update.
 * @param {string} formula - The formula to associate with the token.
 * @param {number|string} offset - The offset value to associate with the token (parsed as a float).
 *
 * @returns {Object} - An object containing the status of the operation:
 *   - `{ status: 'ok', message: 'Updated <name>' }` if the update is successful.
 *   - `{ status: 'error', message: 'Token <name> not found' }` if the token does not exist.
 *   - `{ status: 'error', message: 'Failed to update token: <error>' }` if an error occurs during the update.
 */
const updateTokenFormula = (name, formula, offset) => {
    try {
        const tokens = loadTokens();
        if (tokens[name]) {
            tokens[name].formula = formula;
            tokens[name].offset = parseFloat(offset) || 0;
            console.log('Updated token:', tokens[name]); // Log updated token
            console.log('Tokens before saving (updateTokenFormula):', JSON.stringify(tokens, null, 2));
            saveTokens(tokens);
            logYellow(`Updated formula and offset for token: ${name}`);
            return {
                status: 'ok',
                message: `Updated ${name}`
            };
        } else {
            logRedError(`Token ${name} not found.`);
            return {
                status: 'error',
                message: `Token ${name} not found`
            };
        }
    } catch (error) {
        logRedError(`Failed to update token: ${error.message}`);
        return {
            status: 'error',
            message: `Failed to update token: ${error.message}`
        };
    }
};

/**
 * Creates the necessary directories and files for a specific token.
 *
 * This function ensures that the directory structure and required data files
 * for a given token are created. If the directory or files already exist, they are not recreated.
 *
 * @param {string} tokenName - The name of the token for which directories and files need to be created.
 *
 * @returns {void}
 */
const createTokenDirectoriesAndFiles = (tokenName) => {
    const tokenDataDir = path.join(__dirname, '../data', tokenName);

    if (!fs.existsSync(tokenDataDir)) {
        logYellow(`Creating directory for token: ${tokenName}`);
        fs.mkdirSync(tokenDataDir, {
            recursive: true
        });
    }

    // Create necessary data files
    const filesToCreate = ['angle_data.dat', 'temperature_data.dat', 'battery_data.dat', 'sg_data.dat'];
    filesToCreate.forEach((file) => {
        const filePath = path.join(tokenDataDir, file);
        ensureFileExists(filePath); // This function creates the file if it doesn't exist
    });
};

/**
 * Adds a new token with the specified name and optional color.
 *
 * This function creates a new token with a unique value, assigns it a color, and initializes its
 * formula and offset. It also ensures that the necessary directories and files for the token
 * are created. If a token with the same name already exists, an error message is returned.
 *
 * @param {string} name - The name of the new token.
 * @param {string} [color='#000000'] - The color associated with the token, defaulting to black if not provided.
 *
 * @returns {Object} - An object indicating the status of the operation:
 *   - `{ status: 'ok', token: <newTokenValue> }` if the token is successfully added.
 *   - `{ status: 'error', message: 'Token name already exists' }` if the token name is already in use.
 */
const addToken = (name, color) => {
    logYellow(`Adding new token: ${name}`);
    const tokens = loadTokens();

    if (tokens[name]) {
        logRedError(`Token with name ${name} already exists.`);
        return {
            status: 'error',
            message: 'Token name already exists'
        };
    }

    const newToken = {
        value: crypto.randomBytes(16).toString('hex'),
        color: color || '#000000',
        formula: '', // Default empty formula, can be updated later
        offset: 0 // Default offset to 0
    };

    tokens[name] = newToken;
    saveTokens(tokens);

    // Create directories and files for the new token
    createTokenDirectoriesAndFiles(name);

    return {
        status: 'ok',
        token: newToken.value
    };
};

/**
 * Regenerates the token value for a specific token by name.
 *
 * This function generates a new unique token value for the specified token name
 * and updates it in the token file. If the token name does not exist, an error message is returned.
 *
 * @param {string} name - The name of the token to regenerate.
 *
 * @returns {Object} - An object indicating the status of the operation:
 *   - `{ status: 'ok', token: <newTokenValue> }` if the token is successfully regenerated.
 *   - `{ status: 'error', message: 'Token not found' }` if the token name does not exist.
 */
const regenerateToken = (name) => {
    logYellow(`Regenerating token for: ${name}`);
    const tokens = loadTokens();

    if (tokens[name]) {
        const newToken = crypto.randomBytes(16).toString('hex');
        tokens[name].value = newToken;
        console.log('Tokens before saving (regenerateToken):', JSON.stringify(tokens, null, 2));
        saveTokens(tokens);
        return {
            status: 'ok',
            token: newToken
        };
    } else {
        logRedError("Token not found.");
        return {
            status: 'error',
            message: 'Token not found'
        };
    }
};

/**
 * Deletes a token and its associated data directory and files.
 *
 * This function removes the specified token from the token file. If a data directory associated with the token exists,
 * it is also deleted along with its files. If the token does not exist, an error message is logged and returned.
 *
 * @param {string} name - The name of the token to delete.
 *
 * @returns {Object} - An object indicating the status of the operation:
 *   - `{ status: 'ok', name: <name> }` if the token is successfully deleted.
 *   - `{ status: 'error', message: 'Token not found' }` if the token name does not exist.
 */
const deleteToken = (name) => {
    logYellow(`Deleting token: ${name}`);
    const tokens = loadTokens();

    if (tokens[name]) {
        delete tokens[name];
        saveTokens(tokens);

        // Optionally, you might want to delete the associated directory and files
        const tokenDataDir = path.join(__dirname, '../data', name);
        if (fs.existsSync(tokenDataDir)) {
            fs.rmSync(tokenDataDir, {
                recursive: true,
                force: true
            });
            logYellow(`Deleted directory for token: ${name}`);
        }

        return {
            status: 'ok',
            name: name
        };
    } else {
        logRedError("Token not found.");
        return {
            status: 'error',
            message: 'Token not found'
        };
    }
};

/**
 * Handles HTTP requests for managing tokens.
 *
 * This function provides a RESTful interface for managing tokens, supporting the following operations:
 * - `GET`: Retrieves all tokens and sends them to the client in JSON format.
 * - `POST`: Performs actions such as adding, regenerating, deleting, or updating a token based on the provided `action`.
 * - `405 Method Not Allowed`: Responds if the HTTP method is not supported.
 *
 * @param {IncomingMessage} req - The HTTP request object.
 * @param {ServerResponse} res - The HTTP response object.
 *
 * @returns {void}
 */
const handleTokenManagement = (req, res) => {
    console.log(`Token route called: ${req.method}`);

    if (req.method === 'GET') {
        try {
            const tokens = loadTokens();
            console.log('Tokens sent to frontend:', JSON.stringify(tokens, null, 2));
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(tokens));
        } catch (error) {
            console.error(`Error handling GET /token: ${error.message}`);
            res.writeHead(500, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
                status: 'error',
                message: 'Failed to load tokens'
            }));
        }
    } else if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const {
                action,
                name,
                color,
                formula,
                offset
            } = JSON.parse(body);
            let result;

            if (action === 'add') {
                result = addToken(name, color);
            } else if (action === 'regenerate') {
                result = regenerateToken(name);
            } else if (action === 'delete') {
                result = deleteToken(name);
            } else if (action === 'updateFormula') {
                result = updateTokenFormula(name, formula, offset);
            }

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(result));
        });
    } else {
        res.writeHead(405, {
            'Content-Type': 'text/plain'
        });
        res.end('Method not allowed');
    }
};

module.exports = {
    loadTokens,
    handleTokenManagement,
    updateTokenFormula
};