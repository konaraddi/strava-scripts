# Strava scripts

This repository contains a script to bulk edit the gear associated with your Strava activities. The script uses the Strava API to authenticate, fetch activities, and update the gear in bulk.

## Features
- OAuth authentication with Strava.
- Fetch activities based on filters.
- Update gear for multiple activities at once.

## Prerequisites
- Node.js installed on your system.
- A Strava account.
- A Strava API application with client ID and client secret.

## Setup
1. Clone this repository:
   ```bash
   git clone https://github.com/konaraddi/strava-scripts.git
   cd strava-scripts
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following content:
   ```env
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   STRAVA_REDIRECT_URI=http://localhost:3000
   ```

## Usage
1. Run the script:
   ```bash
   node bulk-edit-gear.js
   ```
2. Follow the instructions in the terminal to authenticate with Strava and perform bulk gear edits.

## Notes
This script was generated using GitHub Copilot and customized for bulk editing Strava activities' gear.

## License
This project is licensed under the MIT License.
