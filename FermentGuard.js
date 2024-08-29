const http = require('http');
const config = require('./config/config');
const { requestHandler } = require('./routes/routes'); // Import the request handler
const { logYellow } = require('./utils/logger');
const { initializeEmailTransporter } = require('./utils/emailUtils');
const { loadEmailConfig } = require('./controllers/emailController');


// Load email configuration from the JSON file
const emailConfig = loadEmailConfig();

// Initialize the email transporter with the loaded config
initializeEmailTransporter(emailConfig);

const server = http.createServer(requestHandler);

server.listen(config.port, config.serverAddress, () => {
    logYellow(`Server listening on http://${config.serverAddress}:${config.port}`);
});
