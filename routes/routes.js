const { servePage } = require('../controllers/pageController.js');
const { handleIspindelPost } = require('../controllers/ispindelController');
const { handleEmailConfig } = require('../controllers/emailController');
const { serveData, clearData } = require('../controllers/dataController');
const { handleTokenManagement } = require('../controllers/tokenController');
const { createBackup, restoreBackup } = require('../controllers/backupController');
const { logYellow } = require('../utils/logger');
const config = require('../config/config');

const requestHandler = (req, res) => {
    logYellow(`Handling request: ${req.method} ${req.url}`);

    if (req.method === 'POST' && req.url === config.requestPath) {
        handleIspindelPost(req, res);
    } else if (req.method === 'GET' && req.url === '/get-email-config') {
        handleEmailConfig(req, res);
    } else if (req.method === 'POST' && req.url === '/save-email-config') {
        handleEmailConfig(req, res);
    } else if (req.method === 'GET' && req.url === '/') {
        servePage(res);
    } else if (req.method === 'GET' && req.url === '/data') {
        serveData(res);
    } else if (req.method === 'POST' && req.url === '/clear-data') {
        clearData(res);
    } else if (req.url === '/token') {
        handleTokenManagement(req, res);
    } else if (req.method === 'POST' && req.url === '/backup') {
        createBackup(res);
    } else if (req.method === 'POST' && req.url === '/restore') {
        restoreBackup(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
};

module.exports = { requestHandler };
