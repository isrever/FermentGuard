const {
    servePage
} = require('../controllers/pageController.js');
const {
    handleIspindelPost
} = require('../controllers/ispindelController');
const {
    handleEmailConfig
} = require('../controllers/emailController');
const {
    serveData,
    clearData
} = require('../controllers/dataController');
const {
    handleTokenManagement,
    loadTokens
} = require('../controllers/tokenController');
const {
    createBackup,
    restoreBackup
} = require('../controllers/backupController');
const {
    logYellow
} = require('../utils/logger');
const config = require('../config/config');

/**
 * Handles HTTP requests for retrieving tokens.
 *
 * This function supports only `GET` requests. It retrieves tokens from the token storage
 * and sends them to the frontend in JSON format. If the token retrieval fails, it responds
 * with an appropriate error message. For unsupported methods, it returns a 405 "Method Not Allowed" response.
 *
 * @param {IncomingMessage} req - The HTTP request object.
 * @param {ServerResponse} res - The HTTP response object.
 *
 * @returns {void}
 */
const handleTokenRequest = (req, res) => {
    if (req.method === 'GET') {
        try {
            const tokens = loadTokens(); // Load tokens
            console.log('Tokens sent to frontend:', JSON.stringify(tokens, null, 2)); // Debug log

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(tokens)); // Send tokens to the frontend
        } catch (error) {
            console.error('Error fetching tokens:', error.message);
            res.writeHead(500, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
                status: 'error',
                message: 'Failed to load tokens'
            }));
        }
    } else {
        res.writeHead(405, {
            'Content-Type': 'text/plain'
        });
        res.end('Method not allowed');
    }
};

/**
 * Handles incoming HTTP requests and routes them to the appropriate handlers.
 *
 * This function acts as a central dispatcher for handling various HTTP endpoints and methods.
 * It supports operations such as handling iSpindel data, managing email configuration, serving the homepage,
 * managing tokens, and performing backup or restore operations. If the request does not match any of the supported
 * routes, it responds with a 404 status and a "Not Found" message.
 *
 * @param {IncomingMessage} req - The HTTP request object.
 * @param {ServerResponse} res - The HTTP response object.
 *
 * @returns {void}
 */
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
        res.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        res.end('Not Found');
    }
};



module.exports = {
    requestHandler,
    handleTokenRequest
};