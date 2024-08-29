const nodemailer = require('nodemailer');
const { logYellow, logRedError } = require('../utils/logger');

let transporter;

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

module.exports = { initializeEmailTransporter, sendEmailAlert };
