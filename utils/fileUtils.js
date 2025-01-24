const fs = require('fs');
const path = require('path');
const {
    logYellow
} = require('./logger');

/**
 * Creates a directory if it does not already exist.
 *
 * This function checks whether the specified directory exists, and if not, creates it. 
 * It uses the `fs.mkdirSync` method with the `recursive` option to ensure all parent directories are created if necessary.
 *
 * @param {string} dir - The path of the directory to check or create.
 *
 * @returns {void}
 */
const createDirectoryIfNotExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }
};

/**
 * Ensures that a file exists, creating the file and its parent directory if necessary.
 *
 * This function checks whether the specified file exists. If it does not, the function creates the parent directory (if it doesn't exist)
 * and initializes the file with an empty JSON object (`{}`).
 *
 * @param {string} filePath - The path of the file to check or create.
 *
 * @returns {void}
 */
const ensureFileExists = (filePath) => {
    const dir = path.dirname(filePath);
    createDirectoryIfNotExists(dir);

    if (!fs.existsSync(filePath)) {
        logYellow(`Creating file: ${filePath}`);
        fs.writeFileSync(filePath, '{}'); // Initialize the file with an empty JSON object
    }
};

/**
 * Reads and parses a JSON file, ensuring the file exists beforehand.
 *
 * This function ensures the specified file exists by creating it if necessary (using `ensureFileExists`),
 * then reads the file and parses its contents as JSON. If the file is empty, it returns an empty object (`{}`).
 *
 * @param {string} filePath - The path of the JSON file to read.
 *
 * @returns {Object} - The parsed JSON content of the file. Returns an empty object (`{}`) if the file is empty.
 *
 * @throws {SyntaxError} - If the file contains invalid JSON.
 */
const readJSONFile = (filePath) => {
    ensureFileExists(filePath);
    return JSON.parse(fs.readFileSync(filePath, 'utf8').trim() || '{}');
};

/**
 * Writes data to a JSON file, overwriting the file if it already exists.
 *
 * This function serializes the provided data as a JSON string and writes it to the specified file.
 * If the file or its directory does not exist, it will not create them automatically, so ensure the directory exists beforehand.
 * Logs the written content to the console and throws an error if the write operation fails.
 *
 * @param {string} filePath - The path of the JSON file to write.
 * @param {Object} data - The data to be serialized and written to the file.
 *
 * @throws {Error} - Throws an error if the write operation fails.
 */
const writeJSONFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`File successfully written to: ${filePath}`);
        console.log(`File content: ${JSON.stringify(data, null, 2)}`); // Log the written data
    } catch (error) {
        console.error(`Error writing to file: ${filePath}`, error);
        throw error;
    }
};

const writeDataToFile = (filePath, data) => {
    try {
        fs.appendFileSync(filePath, `${data}\n`);
        logYellow(`Data successfully written to ${filePath}`);
    } catch (error) {
        logRedError(`Failed to write to file: ${filePath} - Error: ${error.message}`);
    }
};

module.exports = {
    ensureFileExists,
    readJSONFile,
    writeJSONFile,
    createDirectoryIfNotExists,
    writeDataToFile
};