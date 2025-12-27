// Shared Strava API utilities

async function fetchAllActivities(accessToken, { after, before, type = null } = {}) {
  let allActivities = [];
  let page = 1;
  const perPage = 200; // Max allowed by Strava

  const params = new URLSearchParams({
    page: page,
    per_page: perPage,
  });

  if (after) params.append('after', after);
  if (before) params.append('before', before);

  while (true) {
    params.set('page', page);

    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const activities = await activitiesResponse.json();

    if (!Array.isArray(activities) || activities.length === 0) {
      break;
    }

    allActivities = allActivities.concat(activities);
    page++;

    // Show progress
    process.stdout.write(`\rFetched ${allActivities.length} activities...`);
  }

  console.log(); // New line after progress

  // Filter by type if specified
  if (type) {
    allActivities = allActivities.filter((activity) => activity.type === type);
  }

  return allActivities;
}

async function fetchAthlete(accessToken) {
  const response = await fetch('https://www.strava.com/api/v3/athlete', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return await response.json();
}

async function updateActivity(accessToken, activityId, updates) {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    }
  );

  return await response.json();
}

module.exports = {
  fetchAllActivities,
  fetchAthlete,
  updateActivity,
};
