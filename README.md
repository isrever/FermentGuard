# Ferment Guard 0.8.2-alpha ( Still under development )

Ferment Guard is a Node.js application designed to monitor and manage data from iSpindel devices. The application can generate, regenerate and delete tokens, log, backup, and restore data and send email alerts based on specific gravity (SG) and battery level thresholds. The app also features a web-based interface for displaying the data.
## Features

- **Data Logging**: Records data from iSpindel devices including angle, temperature, battery, and specific gravity (SG).
- **Email Alerts**: Sends email notifications when significant changes in SG are detected.
- **Data Backup and Restore**: Allows you to back up your data and restore it when needed.
- **Web Interface**: Provides a simple web interface to view and manage your fermentation data.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v12 or later)

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/isrever/FermentGuard.git
   cd ferment-guard
2. navigate to the folder in command prompt and run "npm install" to install the dependcies.
3. run "npm start" to start the app and load a browser to "127.0.0.1:8080" 
