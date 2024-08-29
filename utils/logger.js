const colors = {
    reset: "\x1b[0m",
    fgYellow: "\x1b[33m",
    fgRed: "\x1b[31m",
};

const logYellow = (message) => {
    console.log(`${colors.fgYellow}%s${colors.reset}`, message);
    console.log("---------");
};

const logRedError = (message) => {
    console.error(`${colors.fgRed}%s${colors.reset}`, message);
    console.error("---------");
};
module.exports = { logYellow, logRedError };
