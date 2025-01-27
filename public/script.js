window.sgChart = null;
window.tiltChart = null;
window.temperatureChart = null;
window.batteryChart = null;

// Define ANSI escape codes for colors
const colors = {
    reset: "\x1b[0m", // Resets all attributes
    bright: "\x1b[1m", // Brightens the text (bold)
    dim: "\x1b[2m", // Dim text
    underscore: "\x1b[4m", // Underlined text
    blink: "\x1b[5m", // Blinking text
    reverse: "\x1b[7m", // Reverses the foreground and background colors
    hidden: "\x1b[8m", // Hides the text

    // Foreground (text) colors
    fgBlack: "\x1b[30m",
    fgRed: "\x1b[31m",
    fgGreen: "\x1b[32m",
    fgYellow: "\x1b[33m",
    fgBlue: "\x1b[34m",
    fgMagenta: "\x1b[35m",
    fgCyan: "\x1b[36m",
    fgWhite: "\x1b[37m",

    // Background colors
    bgBlack: "\x1b[40m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
    bgWhite: "\x1b[47m"
};

// Modified logYellow and logRedError for color output
const logYellow = (message) => {
    console.log(`${colors.fgYellow}%s${colors.reset}`, message);
};

const logRedError = (message) => {
    console.error(`${colors.fgRed}%s${colors.reset}`, message);
};

/**
 * Generates configuration options for a chart with customizable axis labels, colors, and background color.
 *
 * @param {string} yAxisLabel - The label for the Y-axis of the chart.
 * @param {string} axisColor - The color for the axis titles and ticks.
 * @param {string} bgColor - The background color of the chart.
 * @returns {Object} The chart configuration options.
 */

function generateChartOptions(yAxisLabel, axisColor, bgColor) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                time: {
                    tooltipFormat: 'MMM d, yyyy, HH:mm:ss',
                    unit: 'minute',
                    displayFormats: {
                        minute: 'MMM d, HH:mm',
                        hour: 'MMM d, HH:mm',
                        day: 'MMM d',
                    }
                },
                title: {
                    display: true,
                    text: 'Date & Time',
                    color: axisColor,
                },
                ticks: {
                    color: axisColor,
                    source: 'data',
                    autoSkip: true,
                    maxRotation: 90,
                    minRotation: 90,
                }
            },
            y: {
                title: {
                    display: true,
                    text: yAxisLabel,
                    color: axisColor,
                },
                ticks: {
                    color: axisColor,
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    color: axisColor,
                }
            }
        },
        backgroundColor: bgColor,
    };
}

// Initialize GridStack for moveable widgets
document.addEventListener('DOMContentLoaded', function() {
    if (typeof GridStack !== 'undefined') {
        const grid = GridStack.init();
        console.log("GridStack initialized");
    } else {
        console.error("GridStack is not defined");
    }
});



async function fetchEmailConfig() {
    try {
        const response = await fetch('/get-email-config');
        if (!response.ok) throw new Error('Network response was not ok');

        const config = await response.json();

        document.getElementById('recipientEmail').value = config.recipientEmail || '';
        document.getElementById('gmailUser').value = config.gmailUser || '';
        document.getElementById('gmailPass').value = config.gmailPass || '';
    } catch (error) {
        logRedError('Failed to fetch email configuration:', error);
    }
}

document.getElementById('emailConfigForm').addEventListener('submit', async(event) => {
    event.preventDefault();

    const emailConfig = {
        recipientEmail: document.getElementById('recipientEmail').value,
        gmailUser: document.getElementById('gmailUser').value,
        gmailPass: document.getElementById('gmailPass').value,
    };

    try {
        const response = await fetch('/save-email-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailConfig),
        });

        const result = await response.json();
        alert(result.status);
    } catch (error) {
        logRedError('Failed to save email configuration:', error);
        alert('Failed to save email configuration.');
    }
});

function calculatePlatoFromSG(sg) {
    return (-1 * 616.868) + (1111.14 * sg) - (630.272 * Math.pow(sg, 2)) + (135.997 * Math.pow(sg, 3));
}

function updateWidgets(latestSG, latestTilt, latestTemperature, latestBattery) {
    document.getElementById('sgWidget').textContent = latestSG ? latestSG.toFixed(3) : 'N/A';
    document.getElementById('tiltWidget').textContent = latestTilt ? `Tilt: ${latestTilt.toFixed(2)}°` : 'Tilt: N/A';
    document.getElementById('platoWidget').textContent = latestSG ? `Plato: ${calculatePlatoFromSG(latestSG).toFixed(2)}` : 'Plato: N/A';
    document.getElementById('temperatureWidget').textContent = latestTemperature ? `${latestTemperature.toFixed(1)} °C` : 'N/A';
    document.getElementById('batteryWidget').textContent = latestBattery ? `${latestBattery}%` : 'N/A';
}

// Global chart instance
let myChart = null;

// This will store the colors assigned to each token
let tokenColors = {};

async function fetchData() {
    try {
        const response = await fetch('/data');
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();

        // Enhance data by adding the offset if it's missing
        Object.entries(data).forEach(([tokenName, tokenData]) => {
            if (typeof tokenData.offset === 'undefined') {
                // Try to find existing input value or default to 0
                const offsetInput = document.querySelector(`input.customOffsetInput[data-name="${tokenName}"]`);
                tokenData.offset = offsetInput ? parseFloat(offsetInput.value) || 0 : 0;
            }
        });

        return data;
    } catch (error) {
        console.error('Failed to fetch data:', error);
        return {}; // Return empty object on failure
    }
}


function showLoading(show) {
    document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
}

function calculateBatteryPercentage(voltage, factor = 196.83) {
    const maxVoltage = 4.2;
    const minVoltage = 3.0;
    const range = maxVoltage - minVoltage;

    // Adjust the voltage according to the factor
    const adjustedVoltage = voltage * factor / 191.8;

    // Ensure the adjusted voltage is within the min and max bounds
    const clampedVoltage = Math.max(Math.min(adjustedVoltage, maxVoltage), minVoltage);

    // Calculate the percentage
    const percentage = ((clampedVoltage - minVoltage) / range) * 100;

    // Return the percentage, ensuring it's within 0-100% and rounded to 2 decimal places
    return Math.min(Math.max(percentage, 0), 100).toFixed(2);
}

function calculateSG(tilt, formula) {
    try {
        const sanitizedFormula = formula.replace(/tilt/g, tilt);
        return eval(sanitizedFormula);
    } catch (e) {
        logRedError('Error evaluating custom formula:', e);
        return null;
    }
}

// Function to render the SG chart
function renderSGChart(data, axisColor, bgColor) {
    const isDarkMode = document.body.classList.contains('dark-mode');
    axisColor = isDarkMode ? 'white' : 'black';

    if (window.sgChart instanceof Chart) {
        window.sgChart.destroy();
    }

    const sgData = [];
    for (const [tokenName, tokenData] of Object.entries(data)) {
        const sgValues = [];
        const timestamps = [];

        if (tokenData && tokenData.angleData) {
            tokenData.angleData.trim().split('\n').forEach(row => {
                const [timestamp, angle] = row.split(', ');
                const parsedTimestamp = new Date(timestamp);
                timestamps.push(parsedTimestamp);

                const formula = tokenData.formula || "0.7452906386258465 + 0.01641104769215384 * tilt - 0.0003261402578710187 * tilt * tilt + 0.0000022994662242554533 * tilt * tilt * tilt";
                const sg = calculateSG(angle, formula) + (tokenData.offset || 0);

                sgValues.push({
                    x: parsedTimestamp,
                    y: sg
                });
            });
        }

        sgData.push({
            label: `${tokenName} - SG`,
            data: sgValues,
            borderColor: tokenColors[tokenName] || '#000000',
            backgroundColor: tokenColors[tokenName] || (isDarkMode ? '#fff' : '#333'),
            borderWidth: 2,
            fill: false,
            borderDash: [5, 5],
        });
    }

    window.sgChart = new Chart(document.getElementById('sgChart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: sgData
        },

        options: generateChartOptions('Specific Gravity', axisColor, bgColor)
    });
}


// Function to render the Tilt chart
function renderTiltChart(data, axisColor, bgColor) {
    const isDarkMode = document.body.classList.contains('dark-mode')
    axisColor = isDarkMode ? 'white' : 'black';
    if (window.tiltChart) window.tiltChart.destroy();

    const tiltData = [];
    for (const [tokenName, tokenData] of Object.entries(data)) {
        const tiltValues = [];
        const timestamps = [];

        if (tokenData && tokenData.angleData) {
            tokenData.angleData.trim().split('\n').forEach(row => {
                const [timestamp, angle] = row.split(', ');
                const parsedTimestamp = new Date(timestamp);
                timestamps.push(parsedTimestamp);
                tiltValues.push({
                    x: parsedTimestamp,
                    y: parseFloat(angle)
                });
            });
        }

        tiltData.push({
            label: `${tokenName} - Tilt`,
            data: tiltValues,
            borderColor: tokenColors[tokenName] || '#000000',
            backgroundColor: tokenColors[tokenName] || (isDarkMode ? '#fff' : '#333'),
            borderWidth: 2,
            fill: false,
            borderDash: [5, 5],
        });
    }

    window.tiltChart = new Chart(document.getElementById('tiltChart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: tiltData
        },
        options: generateChartOptions('Tilt Angle', axisColor, bgColor)
    });
}

// Function to render the Temperature chart
function renderTemperatureChart(data, axisColor, bgColor) {
    const isDarkMode = document.body.classList.contains('dark-mode')
    axisColor = isDarkMode ? 'white' : 'black';
    if (window.temperatureChart) window.temperatureChart.destroy();

    const temperatureData = [];
    for (const [tokenName, tokenData] of Object.entries(data)) {
        const tempValues = [];
        const timestamps = [];

        if (tokenData && tokenData.temperatureData) {
            tokenData.temperatureData.trim().split('\n').forEach(row => {
                const [timestamp, temp] = row.split(', ');
                const parsedTimestamp = new Date(timestamp);
                timestamps.push(parsedTimestamp);
                tempValues.push({
                    x: parsedTimestamp,
                    y: parseFloat(temp)
                });
            });
        }

        temperatureData.push({
            label: `${tokenName} - Temperature`,
            data: tempValues,
            borderColor: tokenColors[tokenName] || '#000000',
            backgroundColor: tokenColors[tokenName] || (isDarkMode ? '#fff' : '#333'),
            borderWidth: 2,
            fill: false,
            borderDash: [5, 5],
        });
    }

    window.temperatureChart = new Chart(document.getElementById('temperatureChart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: temperatureData
        },
        options: generateChartOptions('Temperature (°C)', axisColor, bgColor)
    });
}

// Function to render the Battery chart
function renderBatteryChart(data, axisColor, bgColor) {
    const isDarkMode = document.body.classList.contains('dark-mode')
    axisColor = isDarkMode ? 'white' : 'black';
    if (window.batteryChart) window.batteryChart.destroy();

    const batteryData = [];
    for (const [tokenName, tokenData] of Object.entries(data)) {
        const batteryValues = [];
        const timestamps = [];

        if (tokenData && tokenData.batteryData) {
            tokenData.batteryData.trim().split('\n').forEach(row => {
                const [timestamp, voltage] = row.split(', ');
                const parsedTimestamp = new Date(timestamp);
                timestamps.push(parsedTimestamp);
                batteryValues.push({
                    x: parsedTimestamp,
                    y: parseFloat(voltage)
                });
            });
        }

        batteryData.push({
            label: `${tokenName} - Battery Voltage`,
            data: batteryValues,
            borderColor: tokenColors[tokenName] || '#000000',
            backgroundColor: tokenColors[tokenName] || (isDarkMode ? '#fff' : '#333'),
            borderWidth: 2,
            fill: false,
            borderDash: [5, 5],
        });
    }

    window.batteryChart = new Chart(document.getElementById('batteryChart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: batteryData
        },
        options: generateChartOptions('Battery Voltage', axisColor, bgColor)
    });
}


async function renderCharts() {
    try {
        const data = await fetchData();

        let latestSG = null;
        let latestTilt = null;
        let latestTemperature = null;
        let latestBattery = null;

        for (const [tokenName, tokenData] of Object.entries(data)) {
            const sgValues = (tokenData && tokenData.angleData) ? tokenData.angleData.trim().split('\n') : [];
            const tempValues = (tokenData && tokenData.temperatureData) ? tokenData.temperatureData.trim().split('\n') : [];
            const batteryValues = (tokenData && tokenData.batteryData) ? tokenData.batteryData.trim().split('\n') : [];

            if (sgValues && sgValues.length) {
                const lastSGEntry = sgValues[sgValues.length - 1].split(', ');
                latestSG = calculateSG(lastSGEntry[1], tokenData.formula) + 0.012661934;
                latestTilt = parseFloat(lastSGEntry[1]);
            }
            if (tempValues && tempValues.length) {
                latestTemperature = parseFloat(tempValues[tempValues.length - 1].split(', ')[1]);
            }
            if (batteryValues && batteryValues.length) {
                const lastBatteryEntry = batteryValues[batteryValues.length - 1].split(', ')[1];
                latestBattery = calculateBatteryPercentage(parseFloat(lastBatteryEntry));
            }
        }

        updateWidgets(latestSG, latestTilt, latestTemperature, latestBattery);

        renderSGChart(data, 'black', 'white');
        renderTiltChart(data, 'black', 'white');
        renderTemperatureChart(data, 'black', 'white');
        renderBatteryChart(data, 'black', 'white');
    } catch (error) {
        console.error('Failed to render charts:', error);
    }
}


async function fetchTokens() {
    console.log('Fetching tokens...');
    const response = await fetch('/token');
    const tokens = await response.json();
    console.log('Tokens fetched (snapshot):', JSON.stringify(tokens, null, 2));

    const tokensList = document.getElementById('tokensList');
    tokensList.innerHTML = '';

    for (const [name, token] of Object.entries(tokens)) {
        console.log(`Processing token: ${name}`, token); // Log each token, including offset

        // Use token data directly without omitting fields
        const tokenData = {
            ...token, // Spread the token object to ensure all fields are included
        };

        console.log('Token data object:', tokenData); // Verify offset is included here

        const tokenItem = document.createElement('div');
        tokenItem.className = 'token-item';
        tokenItem.innerHTML = `
            <strong style="color: ${token.color};">${name}:</strong> ${token.value}
            <input type="text" name="custom polynomial input" placeholder="Enter custom polynomial" data-name="${name}" class="customPolynomialInput" value="${token.formula || ''}">
            <input type="text" name="custom offset input" laceholder="Enter custom offset" data-name="${name}" class="customOffsetInput" value="${token.offset || 0}">
            <button class="savePolynomialButton" data-token-name="${name}">Save</button>
            <a href="#" data-name="${name}" class="regenerateToken">Regenerate</a>
            <a href="#" data-name="${name}" class="deleteToken">Delete</a>`;
        tokensList.appendChild(tokenItem);
    }

    const addTokenLink = document.createElement('a');
    addTokenLink.href = '#';
    addTokenLink.id = 'addToken';
    addTokenLink.textContent = 'Add New Token';
    tokensList.appendChild(addTokenLink);

    document.getElementById('addToken').addEventListener('click', async(event) => {
        event.preventDefault();
        await addToken();
        await fetchTokens();
    });

    document.querySelectorAll('.regenerateToken').forEach(element => {
        element.addEventListener('click', async(event) => {
            event.preventDefault();
            const name = event.target.getAttribute('data-name');
            await regenerateToken(name);
            await fetchTokens();
            await renderCharts();
        });
    });

    document.querySelectorAll('.deleteToken').forEach(element => {
        element.addEventListener('click', async(event) => {
            event.preventDefault();
            const name = event.target.getAttribute('data-name');
            await deleteToken(name);
            await fetchTokens();
            await renderCharts();
        });
    });

    document.querySelectorAll('.savePolynomialButton').forEach((element) => {
        element.addEventListener('click', async(event) => {
            const name = event.target.getAttribute('data-token-name');
            const formulaInput = document.querySelector(`input.customPolynomialInput[data-name="${name}"]`);
            const offsetInput = document.querySelector(`input.customOffsetInput[data-name="${name}"]`);

            const formula = formulaInput.value;
            const offset = parseFloat(offsetInput.value) || 0;

            console.log(`Saving token: ${name}, Formula: ${formula}, Offset: ${offset}`);

            await updateTokenFormula(name, formula, offset);
            await fetchTokens(); // Reload tokens to reflect changes
        });
    });

}

async function updateTokenFormula(name, formula, offset) {
    const response = await fetch('/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'updateFormula',
            name,
            formula,
            offset,
        }),
    });
    const result = await response.json();
    if (result.status !== 'ok') {
        console.error(`Failed to update token ${name}:`, result.message);
        alert(`Failed to update token ${name}.`);
    }
}

async function regenerateToken(name) {
    const response = await fetch('/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'regenerate',
            name
        })
    });
    const result = await response.json();
    alert(`Token for ${name} has been regenerated.`);
    await fetchTokens();
    await renderCharts();
}

async function deleteToken(name) {
    const response = await fetch('/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'delete',
            name
        })
    });
    const result = await response.json();
    alert(`Token for ${name} has been deleted.`);
    await fetchTokens();
    await renderCharts();
}

async function addToken() {
    const name = prompt('Enter a name for the new token:');
    if (name) {
        const color = prompt('Enter a color for the new token (hex code, e.g., #ff0000):');
        if (color) {
            const response = await fetch('/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'add',
                    name,
                    color
                })
            });
            const result = await response.json();
            logYellow('Token added:', result);

            tokenColors[name] = color;

            alert(`Token for ${name} has been added with color ${color}.`);

            await fetchTokens();
            await renderCharts();
        }
    }
}

function toggleMode() {
    const body = document.body;
    const toggleButton = document.getElementById('modeToggle');

    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        toggleButton.textContent = 'Switch to Dark Mode';
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        toggleButton.textContent = 'Switch to Light Mode';
    }

    renderCharts();
}

async function clearData() {
    const response = await fetch('/clear-data', {
        method: 'POST'
    });
    if (response.ok) {
        alert('All data has been cleared.');
        renderCharts();
    } else {
        alert('Failed to clear data.');
    }
}

async function backupData() {
    try {
        const response = await fetch('/backup', {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Network response was not ok');
        alert('Backup created successfully.');
    } catch (error) {
        logRedError('Backup data error:', error);
        alert('Failed to create backup. Please try again later.');
    }
}

async function restoreData() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', async() => {
        const file = fileInput.files[0];
        if (file) {
            console.log(`Selected file: ${file.name}, size: ${file.size} bytes`);

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/restore', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) throw new Error('Network response was not ok');
                alert('Data restored successfully.');
                location.reload();
            } catch (error) {
                console.error('Restore data error:', error);
                alert('Failed to restore data. Please try again later.');
            }
        } else {
            console.error('No file selected');
        }
    });
    fileInput.click();
}

function exportDashboard() {
    const isDarkMode = document.body.classList.contains('dark-mode');

    // Create a wrapper for exporting
    const wrapper = document.createElement('div');
    wrapper.id = 'exportWrapper';
    wrapper.style.position = 'absolute';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.zIndex = '-1';
    wrapper.style.backgroundColor = isDarkMode ? '#333' : '#fff';
    wrapper.style.margin = '0';
    wrapper.style.padding = '0';
    wrapper.style.display = 'block';

    // Clone the gridstack section
    const gridstackOriginal = document.querySelector('.grid-stack');
    const gridstackClone = gridstackOriginal.cloneNode(true);
    gridstackClone.style.margin = '0';
    gridstackClone.style.padding = '0';
    gridstackClone.style.height = `${gridstackOriginal.offsetHeight}px`; // Force set height
    gridstackClone.style.width = `${gridstackOriginal.offsetWidth}px`; // Force set width
    wrapper.appendChild(gridstackClone);

    // Debugging: Check gridstackClone height
    console.log("Gridstack height (forced):", gridstackClone.style.height);

    // Append the original chart canvases directly to the wrapper
    const chartContainer = document.getElementById('chartContainer');
    const originalCanvases = [
        document.getElementById('sgChart'),
        document.getElementById('tiltChart'),
        document.getElementById('temperatureChart'),
        document.getElementById('batteryChart')
    ];
    originalCanvases.forEach((canvas) => {
        if (canvas) {
            wrapper.appendChild(canvas); // Temporarily append original canvas
        }
    });

    // Append wrapper to the DOM
    document.body.appendChild(wrapper);

    // Debugging: Ensure all elements are in the wrapper
    console.log("Wrapper content:", wrapper.innerHTML);

    // Use html2canvas to capture the entire wrapper
    html2canvas(wrapper, {
        scale: 3, // High resolution
        useCORS: true,
        backgroundColor: isDarkMode ? '#333' : '#fff',
        windowWidth: wrapper.offsetWidth,
        windowHeight: wrapper.offsetHeight,
    }).then(canvas => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'dashboard.png';
        link.click();

        // Revert changes: Move original canvases back to their original container
        originalCanvases.forEach((canvas) => {
            if (canvas) {
                chartContainer.appendChild(canvas); // Move canvas back to chartContainer
            }
        });

        // Remove wrapper after export
        document.body.removeChild(wrapper);
    }).catch(error => {
        console.error("Error exporting the dashboard:", error);
        alert("Failed to export the dashboard. Please try again.");
    });
}

document.addEventListener('DOMContentLoaded', async() => {

    // Check if GridStack is available before initializing
    if (typeof GridStack !== 'undefined') {
        const grid = GridStack.init();
        console.log("GridStack initialized");
    } else {
        console.error("GridStack is not defined");
    }

    logYellow('DOMContentLoaded event fired, calling fetchTokens');
    await fetchTokens();
    await fetchEmailConfig();

    setTimeout(async() => {
        await renderCharts();
    }, 100);

    document.getElementById('modeToggle').addEventListener('click', async() => {
        toggleMode();
        await renderCharts();
    });

    document.getElementById('clearDataButton').addEventListener('click', clearData);
    document.getElementById('backupDataButton').addEventListener('click', backupData);
    document.getElementById('restoreDataButton').addEventListener('click', restoreData);
    document.getElementById('exportDashboardButton').addEventListener('click', exportDashboard);
    const body = document.body;
    const toggleButton = document.getElementById('modeToggle');

    body.classList.add('dark-mode');
    toggleButton.textContent = 'Switch to Light Mode';

    setInterval(async() => {
        await renderCharts();
    }, 60000);
});