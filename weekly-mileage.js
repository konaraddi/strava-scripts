// Script to visualize weekly running mileage from Strava over the past year
// Zero dependencies - uses only built-in Node.js modules

const { authenticateWithStrava, closeReadline } = require('./lib/auth');
const { fetchAllActivities } = require('./lib/strava-api');

function getWeekNumber(date) {
  // ISO week date calculation
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

function getWeekStartDate(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}

function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function groupActivitiesByWeek(activities) {
  const weeklyData = {};

  activities.forEach((activity) => {
    const activityDate = new Date(activity.start_date);
    const { year, week } = getWeekNumber(activityDate);
    const weekKey = `${year}-W${String(week).padStart(2, '0')}`;

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        year,
        week,
        distance: 0,
        count: 0,
        weekStart: getWeekStartDate(year, week)
      };
    }

    // Strava returns distance in meters
    const miles = activity.distance * 0.000621371;
    weeklyData[weekKey].distance += miles;
    weeklyData[weekKey].count++;
  });

  // Convert to array and sort by date
  const sortedWeeks = Object.values(weeklyData).sort((a, b) =>
    a.weekStart.getTime() - b.weekStart.getTime()
  );

  return sortedWeeks;
}

function visualizeWeeklyMileage(weeklyData) {
  console.log("\n" + "=".repeat(80));
  console.log("WEEKLY RUNNING MILEAGE - PAST YEAR");
  console.log("=".repeat(80) + "\n");

  if (weeklyData.length === 0) {
    console.log("No running activities found in the past year.");
    return;
  }

  // Calculate stats
  const totalMiles = weeklyData.reduce((sum, week) => sum + week.distance, 0);
  const maxMiles = Math.max(...weeklyData.map(w => w.distance));
  const avgMiles = totalMiles / weeklyData.length;

  // Determine scale for bar chart (max width 50 characters)
  const maxBarWidth = 50;
  const scale = maxMiles > 0 ? maxBarWidth / maxMiles : 1;

  // Display bar chart
  weeklyData.forEach((week) => {
    const barLength = Math.round(week.distance * scale);
    const bar = '█'.repeat(barLength);
    const miles = week.distance.toFixed(1);
    const weekLabel = `${formatDate(week.weekStart)}`;

    console.log(`${weekLabel}  ${bar} ${miles} mi (${week.count} runs)`);
  });

  // Display summary statistics
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY STATISTICS");
  console.log("=".repeat(80));
  console.log(`Total Miles:   ${totalMiles.toFixed(1)} mi`);
  console.log(`Average/Week:  ${avgMiles.toFixed(1)} mi`);
  console.log(`Max Week:      ${maxMiles.toFixed(1)} mi`);
  console.log(`Total Weeks:   ${weeklyData.length}`);
  console.log("=".repeat(80) + "\n");
}

// Main execution
(async () => {
  try {
    console.log("Welcome to the Strava Weekly Mileage Visualizer!");

    // Authenticate with Strava
    const accessToken = await authenticateWithStrava(['read', 'read_all', 'profile:read_all', 'activity:read_all']);

    // Calculate date range (past year)
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const after = Math.floor(oneYearAgo.getTime() / 1000);
    const before = Math.floor(now.getTime() / 1000);

    // Fetch all running activities from the past year
    console.log("\nFetching running activities from the past year...");
    const activities = await fetchAllActivities(accessToken, { after, before, type: 'Run' });
    console.log(`Found ${activities.length} running activities in the past year.`);

    // Group activities by week
    const weeklyData = groupActivitiesByWeek(activities);

    // Visualize the data
    visualizeWeeklyMileage(weeklyData);

    closeReadline();
  } catch (error) {
    console.error("\nAn error occurred:", error.message);
    closeReadline();
    process.exit(1);
  }
})();
