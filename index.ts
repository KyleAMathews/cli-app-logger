const activeWin = require("active-win");
const fs = require("fs");
const { execSync } = require("child_process");

let lastApp = "";
let lastStartTime = Date.now();
const logFile = "windowTimeLog.json";
const idleThreshold = 60; // 60 seconds of inactivity

function getIdleTime() {
  const script = `ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print $NF/1000000000; exit}'`;
  try {
    const idleTime = execSync(script).toString().trim();
    return parseInt(idleTime, 10);
  } catch (error) {
    console.error("Error getting idle time:", error);
    return 0;
  }
}

function logWindowUsage(appName, startTime, endTime) {
  const duration = (endTime - startTime) / 1000; // Duration in seconds
  const logEntry = {
    appName,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    durationSeconds: duration,
  };
  const existingLogs = fs.existsSync(logFile)
    ? fs.readFileSync(logFile, "utf-8")
    : "[]";
  const logs = JSON.parse(existingLogs);
  logs.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 4));
}

function trackActiveWindow() {
  const idleTime = getIdleTime();
  console.log({idleTime})
  if (idleTime < idleThreshold) {
    activeWin()
      .then((activeWindow) => {
        if (activeWindow) {
          const appName = activeWindow.owner.name;
          const currentTime = Date.now();

          if (appName !== lastApp) {
            if (lastApp) {
              // Log the usage of the last window
              logWindowUsage(lastApp, lastStartTime, currentTime);
            }
            // Update lastApp and lastStartTime for the new active window
            lastApp = appName;
            lastStartTime = currentTime;
          }
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  } else {
    lastApp = "";
    lastStartTime = Date.now();
  }
}

setInterval(trackActiveWindow, 10000); // Check every 10000 milliseconds (10 seconds)
