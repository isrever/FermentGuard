const fs = require('fs');
const path = require('path');
const {
    logYellow,
    logRedError
} = require('../utils/logger');

/**
 * Serves the index HTML page to the client.
 *
 * This function reads the `index.html` file from the `public` directory and serves it as an HTTP response.
 * If the file cannot be read (e.g., it does not exist or there is a file system error), it logs the error
 * and responds with a 500 status and an error message.
 *
 * @param {ServerResponse} res - The HTTP response object used to send the HTML content or an error message.
 *
 * @returns {void}
 */
const servePage = (res) => {
    logYellow("Serving index page...");
    const htmlPath = path.join(__dirname, '../public', 'index.html');
    fs.readFile(htmlPath, (err, content) => {
        if (err) {
            logRedError("Error loading page:", err);
            res.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            res.end('Error loading page');
        } else {
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end(content);
        }
    });
};

module.exports = {
    servePage
};