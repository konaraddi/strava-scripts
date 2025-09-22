// This script was generated using github copilot.
// It is designed to bulk edit Strava activities' gear.

// Entry point for the Strava bulk edit script
// This file will handle the CLI and orchestrate the main functionality

const http = require('http');
const readline = require('readline');
const url = require('url');

const PORT = 8080;
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

// Prompt user for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function fetchRegisteredGear(accessToken) {
  console.log("\nFetching registered gear (Running Shoes)...");

  const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const athleteData = await athleteResponse.json();

  if (athleteData.shoes && athleteData.shoes.length > 0) {
    console.log("\nRegistered Running Shoes:");
    athleteData.shoes.forEach((shoe, index) => {
      console.log(`${index + 1}. ${shoe.name} (ID: ${shoe.id}, Total Miles: ${shoe.converted_distance || 0})`);
    });

    const gearIndex = await prompt("\nSelect running shoes by number (default is 1): ");
    const selectedGear = athleteData.shoes[gearIndex - 1] || athleteData.shoes[0];

    console.log(`\nSelected Running Shoes: ${selectedGear.name} (ID: ${selectedGear.id}, Total Miles: ${selectedGear.converted_distance || 0})`);
    return selectedGear.id;
  } else {
    console.error("\nNo registered running shoes found.");
    throw new Error("No running shoes available for selection.");
  }
}

async function promptDateInput(question) {
  const dateInput = await prompt(question);
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateInput}. Please use YYYY/MM/DD.`);
  }
  return date.toISOString().split('T')[0]; // Return date in YYYY-MM-DD format
}

async function getDateRangeFromUser() {
  console.log("\nPlease provide the date range for filtering activities.");
  const startDate = await promptDateInput("Start Date (YYYY/MM/DD): ");
  const endDate = await promptDateInput("End Date (YYYY/MM/DD): ");

  if (new Date(startDate) > new Date(endDate)) {
    throw new Error("Start date must be before or equal to end date.");
  }

  console.log(`\nDate Range Received:\nStart Date: ${startDate}\nEnd Date: ${endDate}`); // Confirmation print
  return { startDate, endDate };
}

async function getStravaCredentials() {
  const clientIdFromArg = process.argv[2];
  const secretFromArg = process.argv[3];

  let clientId, clientSecret;

  if (clientIdFromArg) {
    console.log("\nUsing Strava Client ID provided as an argument.");
    clientId = clientIdFromArg;
  } else {
    console.log("\nNo Strava Client ID provided as an argument. Prompting for input...");
    clientId = await prompt("Enter your Strava Client ID: ");
  }

  if (secretFromArg) {
    console.log("\nUsing Strava Client Secret provided as an argument.");
    clientSecret = secretFromArg;
  } else {
    console.log("\nNo Strava Client Secret provided as an argument. Prompting for input...");
    clientSecret = await prompt("Enter your Strava Client Secret: ");
  }

  return { clientId, clientSecret };
}

async function fetchRunningActivities(accessToken, startDate, endDate) {
  console.log("\nFetching running activities...");

  let allActivities = [];
  let page = 1;
  const perPage = 30; // Strava API default page size

  while (true) {
    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?before=${new Date(endDate).getTime() / 1000}&after=${new Date(startDate).getTime() / 1000}&page=${page}&per_page=${perPage}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const activities = await activitiesResponse.json();

    if (!Array.isArray(activities) || activities.length === 0) {
      break; // Exit loop if no more activities are returned
    }

    allActivities = allActivities.concat(activities);
    page++;
  }

  const runningActivities = allActivities.filter(
    (activity) => activity.type === 'Run' && !activity.gear_id // Exclude activities with gear already attached
  );

  if (runningActivities.length === 0) {
    console.log("\nNo running activities found within the specified date range that need gear updates.");
  } else {
    console.log("\nRunning Activities (without gear):");
    runningActivities.forEach((activity, index) => {
      console.log(`${index + 1}. ${activity.name} (ID: ${activity.id}, Date: ${activity.start_date})`);
    });
  }

  return runningActivities;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bulkEditActivities(accessToken, activities, gearId) {
  console.log("\nStarting bulk edit of activities...");

  // Prompt user for confirmation before proceeding
  console.log("\nThe following activities will be updated:");
  activities.forEach((activity, index) => {
    console.log(`${index + 1}. ${activity.name} (ID: ${activity.id}, Date: ${activity.start_date})`);
  });

  const confirmation = await prompt("\nDo you want to proceed with the bulk edit? (yes/no): ");
  if (confirmation.toLowerCase() !== 'yes') {
    console.log("\nBulk edit canceled by the user.");
    return;
  }

  for (const activity of activities) {
    try {
      const updateResponse = await fetch(
        `https://www.strava.com/api/v3/activities/${activity.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gear_id: gearId }),
        }
      );

      if (updateResponse.ok) {
        console.log(`Successfully updated activity: ${activity.name} (ID: ${activity.id})`);
      } else {
        const errorData = await updateResponse.json();
        console.error(`Failed to update activity: ${activity.name} (ID: ${activity.id}). Error:`, errorData);
      }
    } catch (error) {
      console.error(`Error updating activity: ${activity.name} (ID: ${activity.id}).`, error.message);
    }
  }

  console.log("\nBulk edit completed.");

  // Add a 10-second delay before fetching updated gear mileage
  console.log("\nWaiting 10 seconds to ensure updates are reflected...");
  await delay(10000);

  // Fetch and print updated gear mileage
  const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const athleteData = await athleteResponse.json();

  if (athleteData.shoes && athleteData.shoes.length > 0) {
    console.log("\nUpdated Running Shoes Mileage:");
    athleteData.shoes.forEach((shoe) => {
      console.log(`${shoe.name} (ID: ${shoe.id}, Total Miles: ${shoe.converted_distance || 0})`);
    });
  }
}

// Example usage after obtaining access token
(async () => {
  try {
    console.log("Welcome to the Strava Bulk Edit Tool!");

    // Get Strava credentials (either from arguments or prompt)
    const { clientId, clientSecret } = await getStravaCredentials();

    // Generate authorization URL
    const authUrl = `${STRAVA_AUTH_URL}?client_id=${clientId}&response_type=code&redirect_uri=http://localhost:${PORT}/callback&scope=read,read_all,profile:read_all,activity:read_all,activity:write`;
    console.log("\nOpen the following URL in your browser to authorize the application:");
    console.log(authUrl);

    // Start local server to handle callback
    const server = http.createServer(async (req, res) => {
      if (req.url.startsWith('/callback')) {
        const query = url.parse(req.url, true).query;
        const authCode = query.code;

        if (authCode) {
          console.log("\nAuthorization code received: ", authCode);

          // Exchange authorization code for access token
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
            console.log("\nAccess token received: ", tokenData.access_token);

            // Fetch and select registered gear
            const selectedGearId = await fetchRegisteredGear(tokenData.access_token);
            console.log("\nSelected Gear ID:", selectedGearId);

            // Prompt for date range
            const { startDate, endDate } = await getDateRangeFromUser();
            console.log("\nSuccessfully received date range.");

            // Fetch running activities
            const runningActivities = await fetchRunningActivities(tokenData.access_token, startDate, endDate);

            // Perform bulk edit
            await bulkEditActivities(tokenData.access_token, runningActivities, selectedGearId);

            // Close readline interface after all prompts are completed
            rl.close();
          } else {
            console.error("\nFailed to retrieve access token:", tokenData);
          }
        } else {
          console.error("\nAuthorization code not found in callback.");
        }

        res.end("Authorization complete. You can close this tab.");
        server.close();
        rl.close();
      }
    });

    server.listen(PORT, () => {
      console.log(`\nWaiting for authorization callback on http://localhost:${PORT}/callback...`);
    });
  } catch (error) {
    console.error("\nAn error occurred:", error.message);
    rl.close(); // Ensure readline is closed even in case of an error
    process.exit(1);
  }
})();
