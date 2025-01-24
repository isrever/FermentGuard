const nodemailer = require('nodemailer');
const {
    logYellow,
    logRedError
} = require('../utils/logger');

let transporter;

/**
 * Initializes the email transporter using the provided configuration.
 *
 * This function configures an email transporter for sending emails via Gmail using the `nodemailer` library.
 * If the configuration is missing or incomplete, the initialization is skipped and a warning is logged.
 *
 * @param {Object} config - The email configuration object.
 * @param {string} config.gmailUser - The Gmail username (email address) to authenticate.
 * @param {string} config.gmailPass - The Gmail password or app-specific password to authenticate.
 *
 * @returns {boolean} - Returns `true` if the transporter was successfully initialized, `false` otherwise.
 */
const initializeEmailTransporter = (config) => {
    if (!config || !config.gmailUser || !config.gmailPass) {
        logRedError('Email configuration is missing or incomplete. Skipping email initialization.');
        return false; // Indicate that the transporter was not initialized
    }

    logYellow("Initializing email transporter...");
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.gmailUser,
            pass: config.gmailPass,
        }
    });
    return true; // Indicate successful initialization
};

/**
 * Sends an email alert using the configured email transporter.
 *
 * This function sends an email with the specified subject and message to the recipient email address provided in the configuration.
 * It logs errors if the email fails to send or if the configuration is incomplete.
 *
 * @param {string} subject - The subject of the email.
 * @param {string} message - The body of the email message.
 * @param {Object} config - The email configuration object.
 * @param {string} config.gmailUser - The Gmail username (email address) to authenticate.
 * @param {string} config.gmailPass - The Gmail password or app-specific password to authenticate.
 * @param {string} config.recipientEmail - The recipient's email address.
 *
 * @returns {void}
 */
const sendEmailAlert = (subject, message, config) => {
    if (!config || !config.gmailUser || !config.gmailPass) {
        logRedError('Email configuration is not set up or missing credentials. Email will not be sent.');
        return;
    }

    const mailOptions = {
        from: config.gmailUser,
        to: config.recipientEmail,
        subject: subject,
        text: message,
    };

    logYellow(`Attempting to send email to ${config.recipientEmail} with subject: "${subject}"`);

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            logRedError(`Error sending email: ${error.message}`);
        } else {
            logYellow(`Email sent: ${info.response}`);
        }
    });
};

module.exports = {
    initializeEmailTransporter,
    sendEmailAlert
};