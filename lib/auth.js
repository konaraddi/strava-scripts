// Shared Strava OAuth authentication module

const http = require('http');
const url = require('url');
const readline = require('readline');

const PORT = 8080;
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function getStravaCredentials() {
  const clientIdFromArg = process.argv[2];
  const secretFromArg = process.argv[3];

  let clientId, clientSecret;

  // Priority: command line args > environment variables > prompt
  if (clientIdFromArg) {
    console.log("\nUsing Strava Client ID provided as an argument.");
    clientId = clientIdFromArg;
  } else if (process.env.CLIENT_ID) {
    console.log("\nUsing Strava Client ID from environment.");
    clientId = process.env.CLIENT_ID;
  } else {
    console.log("\nNo Strava Client ID found. Prompting for input...");
    clientId = await prompt("Enter your Strava Client ID: ");
  }

  if (secretFromArg) {
    console.log("\nUsing Strava Client Secret provided as an argument.");
    clientSecret = secretFromArg;
  } else if (process.env.CLIENT_SECRET) {
    console.log("\nUsing Strava Client Secret from environment.");
    clientSecret = process.env.CLIENT_SECRET;
  } else {
    console.log("\nNo Strava Client Secret found. Prompting for input...");
    clientSecret = await prompt("Enter your Strava Client Secret: ");
  }

  return { clientId, clientSecret };
}

async function authenticateWithStrava(scopes = ['read', 'read_all', 'profile:read_all', 'activity:read_all']) {
  const { clientId, clientSecret } = await getStravaCredentials();

  const scopeString = scopes.join(',');
  const authUrl = `${STRAVA_AUTH_URL}?client_id=${clientId}&response_type=code&redirect_uri=http://localhost:${PORT}/callback&scope=${scopeString}`;

  console.log("\nOpen the following URL in your browser to authorize the application:");
  console.log(authUrl);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.url.startsWith('/callback')) {
        const query = url.parse(req.url, true).query;
        const authCode = query.code;

        if (authCode) {
          console.log("\nAuthorization code received.");

          try {
            const tokenResponse = await fetch(STRAVA_TOKEN_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: authCode,
                grant_type: 'authorization_code',
              }),
            });

            const tokenData = await tokenResponse.json();

            if (tokenData.access_token) {
              console.log("Access token received.\n");
              res.end("Authorization complete. You can close this tab.");
              server.close();
              resolve(tokenData.access_token);
            } else {
              res.end("Authorization failed. You can close this tab.");
              server.close();
              reject(new Error(`Failed to retrieve access token: ${JSON.stringify(tokenData)}`));
            }
          } catch (error) {
            res.end("Authorization error. You can close this tab.");
            server.close();
            reject(error);
          }
        } else {
          res.end("Authorization code not found. You can close this tab.");
          server.close();
          reject(new Error("Authorization code not found in callback."));
        }
      }
    });

    server.listen(PORT, () => {
      console.log(`\nWaiting for authorization callback on http://localhost:${PORT}/callback...`);
    });
  });
}

function closeReadline() {
  rl.close();
}

module.exports = {
  authenticateWithStrava,
  closeReadline,
  prompt,
};
