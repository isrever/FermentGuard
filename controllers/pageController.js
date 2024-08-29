const fs = require('fs');
const path = require('path');
const { logYellow, logRedError } = require('../utils/logger');

const servePage = (res) => {
    logYellow("Serving index page...");
    const htmlPath = path.join(__dirname, '../public', 'index.html');
    fs.readFile(htmlPath, (err, content) => {
        if (err) {
            logRedError("Error loading page:", err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading page');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        }
    });
};

module.exports = { servePage };
