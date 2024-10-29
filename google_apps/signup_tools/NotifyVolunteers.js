const SIGNUP = "https://docs.google.com/spreadsheets/d/1MQZ_Vr_B2U0mih87UEgg2KjBKXacx_PV8f0oJaMnPTk/edit";

function getDiscordNames() {
  const sheetId = PropertiesService.getScriptProperties().getProperty("DISCORD_NAMES_SHEET");
  const sheet = SpreadsheetApp.openById(sheetId);
  const values = sheet.getDataRange().getValues();
  var result = new Map();
  for(var i = 1; i < values.length; i++) {
    result.set(values[i][0], values[i][1]);
  }
  return result;
}

function sendToDiscord(event, nameMap) {
  var date = event[0];
  var startTime = event[1];
  var endTime = event[2];
  var description = event[7];

  var crew = new Array();
  var notifs = new Array();
  for (var j = 0; j < 4; j++) {
    var signup = String(event[3+j]).trim();
    if(signup !== '') {
      crew.push(signup);
      if(nameMap.has(signup.toLowerCase())) {
        const notif = "<@" + nameMap.get(signup.toLowerCase()) + ">";
        notifs.push(notif);
      } else {
        notifs.push(signup);
      }
    }
  }
  
  var embedTitle = description + " ";
  embedTitle += Utilities.formatDate(date, Session.getScriptTimeZone(), "MM/dd/YYYY") + ", ";
  embedTitle += Utilities.formatDate(startTime, Session.getScriptTimeZone(), "HH:mm") + "-";
  embedTitle += Utilities.formatDate(endTime, Session.getScriptTimeZone(), "HH:mm");
  
  var embedMessage = "";
  var notifyStr = notifs.join(" ");
  var crewStr = "Crew: " + crew.join(", ") + "\n";

  if(crew.length == 0) {
    notifyStr = "@everyone";
    embedMessage += "Action Needed: No volunteers for this service yet.\n";
  } else if(crew.length == 1) {
    notifyStr = "@everyone";
    embedMessage += crewStr;
    embedMessage += "Notice: Only one volunteer signed up.\n";
  } else {
    embedMessage += crewStr;
  }
  embedMessage += "Signup Sheet: " + SIGNUP;

  const options = {
      "method": "post",
      "headers": {
          "Content-Type": "application/json",
      },
      "payload": JSON.stringify({
          "content": "Upcoming Event Reminder " + notifyStr,
          "embeds": [{
              "title": embedTitle,
              "color": 33023,
              "description": embedMessage,
              "timestamp": new Date().toISOString()
          }]
      })  
  };
  const hook = PropertiesService.getScriptProperties().getProperty("DISCORD_NOTIFICATION_WEBHOOK");
  UrlFetchApp.fetch(hook, options);
};

function getDaysBetweenDates(d0, d1) {
  var msPerDay = 8.64e7;
  var x0 = new Date(d0);
  var x1 = new Date(d1);
  x0.setHours(12,0,0,0);
  x1.setHours(12,0,0,0);
  return Math.floor( (x1 - x0) / msPerDay );
}

function notifyVolunteers() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var today = new Date();
  var targetEvents = new Array();
  const discordNames = getDiscordNames();

  for (var i = 1; i < data.length; i++) {
    var date = data[i][0];
    var daysDelta = getDaysBetweenDates(today, date);
    if(daysDelta === 2) {
      targetEvents.push(data[i]);
    }
  }

  for (var i = 0; i < targetEvents.length; i++) {
    sendToDiscord(targetEvents[i], discordNames);
  }
}
