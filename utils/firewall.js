const {
    exec
} = require('child_process');
const readline = require('readline');
const util = require('util');
const os = require('os');
const execAsync = util.promisify(exec);

/**
 * Dynamically imports the `is-admin` module and returns its exported function.
 *
 * This function loads the `is-admin` module at runtime and returns the module's default export if available,
 * or the full module if no default export exists. The returned function can then be used to check for
 * administrator privileges.
 *
 * @returns {Promise<Function>} - A promise that resolves to the `is-admin` module's export (a function to check admin privileges).
 */
const getIsAdmin = async() => {
    const importedModule = await
    import ('is-admin');
    return importedModule.default || importedModule;
};

/**
 * Prompts the user with a question in the terminal and returns their response as a boolean.
 *
 * This function uses the Node.js `readline` module to display a question to the user.
 * It resolves the promise with `true` if the user responds with "yes" (case-insensitive),
 * and `false` for any other response.
 *
 * @param {string} question - The question to display to the user in the terminal.
 *
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the user responds with "yes",
 * and `false` otherwise.
 */
const promptUser = (question) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes');
        });
    });
};

/**
 * Checks if specific Windows firewall rules exist for both inbound and outbound traffic.
 *
 * This function uses the `netsh advfirewall` command to verify if firewall rules with the specified name exist
 * for both inbound and outbound traffic. It returns `true` only if both rules are found, and `false` otherwise.
 * If an error occurs during the check (e.g., the rules do not exist), it returns `false`.
 *
 * @param {string} ruleName - The base name of the firewall rule to check (without "Inbound" or "Outbound").
 *
 * @returns {Promise<boolean>} - A promise that resolves to `true` if both the inbound and outbound rules exist, or `false` otherwise.
 */
const checkFirewallRuleExistsWindows = async(ruleName) => {
    try {
        const inboundCheck = await execAsync(`netsh advfirewall firewall show rule name=\"${ruleName} Inbound\"`);
        const outboundCheck = await execAsync(`netsh advfirewall firewall show rule name=\"${ruleName} Outbound\"`);

        const inboundExists = inboundCheck.stdout.includes(`${ruleName} Inbound`);
        const outboundExists = outboundCheck.stdout.includes(`${ruleName} Outbound`);

        return inboundExists && outboundExists;
    } catch (error) {
        return false;
    }
};

/**
 * Checks if a specific port is open in the firewall on a Linux system.
 *
 * This function uses the `iptables` command to check if a rule exists for the specified port.
 * It searches the iptables rules for any occurrence of the port and returns `true` if found, or `false` otherwise.
 * If an error occurs during execution (e.g., the command fails), it assumes the rule does not exist and returns `false`.
 *
 * @param {number|string} port - The port number to check in the iptables rules.
 *
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the port is found in the iptables rules, or `false` otherwise.
 */
const checkFirewallRuleExistsLinux = async(port) => {
    try {
        const checkIptables = await execAsync(`iptables -L -n | grep ':${port}'`);
        return checkIptables.stdout.includes(port);
    } catch (error) {
        return false;
    }
};

/**
 * Adds Windows firewall rules for a specific rule name and port.
 *
 * This function creates two firewall rules using the `netsh advfirewall` command:
 * - An inbound rule to allow TCP traffic on the specified port.
 * - An outbound rule to allow TCP traffic on the specified port.
 *
 * If an error occurs during the rule creation process, it logs the error message.
 *
 * @param {string} ruleName - The name of the firewall rule to create.
 * @param {number|string} port - The TCP port for which the rules should be created.
 *
 * @returns {Promise<void>} - A promise that resolves when the firewall rules are successfully added or logs an error if the operation fails.
 */
const addFirewallRulesWindows = async(ruleName, port) => {
    try {
        console.log('Adding Windows firewall rules...');

        await execAsync(`netsh advfirewall firewall add rule name=\"${ruleName} Inbound\" dir=in action=allow protocol=TCP localport=${port}`);
        console.log('Inbound Windows firewall rule added successfully.');

        await execAsync(`netsh advfirewall firewall add rule name=\"${ruleName} Outbound\" dir=out action=allow protocol=TCP localport=${port}`);
        console.log('Outbound Windows firewall rule added successfully.');
    } catch (error) {
        console.error(`Error adding Windows firewall rules: ${error.message}`);
    }
};

/**
 * Adds Linux firewall rules for a specific port.
 *
 * This function uses the `iptables` command to create two rules:
 * - An inbound rule (`INPUT`) to allow TCP traffic on the specified port.
 * - An outbound rule (`OUTPUT`) to allow TCP traffic originating from the specified port.
 *
 * If an error occurs during the rule creation process, it logs the error message.
 *
 * @param {number|string} port - The TCP port for which the rules should be created.
 *
 * @returns {Promise<void>} - A promise that resolves when the firewall rules are successfully added or logs an error if the operation fails.
 */
const addFirewallRulesLinux = async(port) => {
    try {
        console.log('Adding Linux firewall rules...');

        await execAsync(`iptables -A INPUT -p tcp --dport ${port} -j ACCEPT`);
        console.log('Inbound Linux firewall rule added successfully.');

        await execAsync(`iptables -A OUTPUT -p tcp --sport ${port} -j ACCEPT`);
        console.log('Outbound Linux firewall rule added successfully.');
    } catch (error) {
        console.error(`Error adding Linux firewall rules: ${error.message}`);
    }
};

/**
 * Configures firewall rules for a specific rule name and port based on the operating system.
 *
 * This function checks the platform (Windows or Linux) and ensures the script is run with administrator privileges.
 * It verifies whether the firewall rules already exist, prompts the user for consent, and adds the rules if necessary.
 * It supports both Windows and Linux platforms, handling them differently based on their respective firewall mechanisms.
 *
 * @param {string} ruleName - The name of the firewall rule to check or create (used only on Windows).
 * @param {number|string} port - The TCP port for which the rules should be configured.
 *
 * @returns {Promise<void>} - A promise that resolves when the configuration process is complete.
 *
 * @throws {Error} - Logs an error if the script is not run as an administrator or if the OS is unsupported.
 */
const configureFirewall = async(ruleName, port) => {
    if (!ruleName || !port) {
        console.error('Error: Rule name and port must be provided.');
        return;
    }

    const platform = os.platform();
    const isAdmin = await getIsAdmin();
    const admin = await isAdmin();

    if (!admin) {
        console.error('This script must be run as an administrator. Please restart with admin privileges.');
        return;
    }

    if (platform === 'win32') {
        const ruleExists = await checkFirewallRuleExistsWindows(ruleName);
        if (ruleExists) {
            console.log(`Firewall rules for "${ruleName}" already exist. No changes were made.`);
            return;
        }

        const userConsent = await promptUser(`Do you want to add firewall rules for port ${port} on Windows? (yes/no) `);
        if (userConsent) {
            await addFirewallRulesWindows(ruleName, port);
        } else {
            console.log('Firewall rules were not added.');
        }
    } else if (platform === 'linux') {
        const ruleExists = await checkFirewallRuleExistsLinux(port);
        if (ruleExists) {
            console.log(`Firewall rules for port ${port} already exist on Linux. No changes were made.`);
            return;
        }

        const userConsent = await promptUser(`Do you want to add firewall rules for port ${port} on Linux? (yes/no) `);
        if (userConsent) {
            await addFirewallRulesLinux(port);
        } else {
            console.log('Firewall rules were not added.');
        }
    } else {
        console.error('Unsupported operating system. This script supports only Windows and Linux.');
    }
};

module.exports = configureFirewall;