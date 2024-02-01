const fs = require("fs");
const asciichart = require("asciichart");
const logFile = "windowTimeLog.json";

function readLogFile() {
  if (!fs.existsSync(logFile)) {
    console.error("Log file not found.");
    return [];
  }
  return JSON.parse(fs.readFileSync(logFile, "utf-8"));
}

function aggregateData(logs) {
  const data = {};
  logs.forEach((log) => {
    const date = log.startTime.split("T")[0];
    if (!data[date]) {
      data[date] = {};
    }
    if (!data[date][log.appName]) {
      data[date][log.appName] = 0;
    }
    data[date][log.appName] += log.durationSeconds / 60;
  });
  return data;
}

function getTopNApps(data, n) {
  const appSums = {};
  Object.values(data).forEach((day) => {
    Object.entries(day).forEach(([app, duration]) => {
      if (!appSums[app]) {
        appSums[app] = 0;
      }
      appSums[app] += duration;
    });
  });

  return Object.entries(appSums)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([app]) => app);
}

function prepareChartData(data, topApps) {
  const chartData = topApps.map((app) => ({ app, values: [] }));
  Object.keys(data).forEach((date) => {
    chartData.forEach((appData) => {
      appData.values.push(data[date][appData.app] || 0);
    });
  });
  return chartData;
}

function displayLineChart(chartData) {
  chartData.forEach((appData) => {
    console.log(`\n${appData.app}`);
    console.log(asciichart.plot(appData.values, { height: 10 }));
  });
}

function displaySummaryTable(data, topApps) {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoDate = weekAgo.toISOString().split("T")[0];

  console.log("\nSummary Table (Seconds)");
  console.log("App\t\tToday\t\tWeek\t\tAvg/Day");
  topApps.forEach((app) => {
    const todayTime = data[today] && data[today][app] ? data[today][app] : 0;
    let weekTime = 0;
    let daysCounted = 0;
    Object.entries(data).forEach(([date, apps]) => {
      if (date >= weekAgoDate && apps[app]) {
        weekTime += apps[app];
        daysCounted++;
      }
    });
    const avgDayTime = daysCounted > 0 ? weekTime / daysCounted : 0;
    console.log(
      `${app}\t\t${(todayTime).toPrecision(4)}\t\t${(weekTime).toPrecision(
        4
      )}\t\t${(avgDayTime).toPrecision(4)}`
    );
  });
}

const logs = readLogFile();
const aggregatedData = aggregateData(logs);
const topApps = getTopNApps(aggregatedData, 10);
const chartData = prepareChartData(aggregatedData, topApps);
displayLineChart(chartData);
displaySummaryTable(aggregatedData, topApps);
