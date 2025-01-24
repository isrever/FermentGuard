const colors = {
    reset: "\x1b[0m",
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    brightBlack: "\x1b[90m",
    brightRed: "\x1b[91m",
    brightGreen: "\x1b[92m",
    brightYellow: "\x1b[93m",
    brightBlue: "\x1b[94m",
    brightMagenta: "\x1b[95m",
    brightCyan: "\x1b[96m",
    brightWhite: "\x1b[97m",
};

/**
 * Logs a message to the console with optional color formatting.
 *
 * This function allows you to print messages to the console with a specified color.
 * By default, the message will be printed in the default console color.
 *
 * @param {string} message - The message to log to the console.
 * @param {string} [color=colors.reset] - The color code to apply to the message. Defaults to no color (reset).
 */
const log = (message, color = colors.reset) => {
    console.log(`${color}%s${colors.reset}`, message);
};


/**
 * Logs a message to the console in yellow.
 *
 * This function is a shorthand for logging messages with yellow color formatting.
 * It uses the `log` function with the `colors.yellow` code.
 *
 * @param {string} message - The message to log in yellow.
 */
const logYellow = (message) => log(message, colors.yellow);


/**
 * Logs a message to the console in red.
 *
 * This function is a shorthand for logging messages with red color formatting.
 * It uses the `log` function with the `colors.red` code.
 *
 * @param {string} message - The message to log in red.
 */
const logRedError = (message) => log(message, colors.red);

module.exports = {
    logYellow,
    logRedError
};