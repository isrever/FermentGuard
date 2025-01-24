const http = require('http');
const config = require('./config/config');
const { requestHandler } = require('./routes/routes'); // Import the request handler
const { logYellow } = require('./utils/logger');
const { initializeEmailTransporter } = require('./utils/emailUtils');
const { loadEmailConfig } = require('./controllers/emailController');
const configureFirewall = require('./utils/firewall');

const startServer = async () => {
  try {
    // Configure the firewall (wait for completion)
    await configureFirewall('FermentGuard', config.port);

    // Load email configuration from the JSON file
    const emailConfig = loadEmailConfig();

    // Initialize the email transporter with the loaded config
    initializeEmailTransporter(emailConfig);

    // Start the server
    const server = http.createServer(requestHandler);

    server.listen(config.port, config.serverAddress, () => {
      logYellow(`Server listening on http://${config.serverAddress}:${config.port}`);
    });
  } catch (error) {
    console.error('Error starting the server:', error);
  }
};

// Start the server
startServer();
