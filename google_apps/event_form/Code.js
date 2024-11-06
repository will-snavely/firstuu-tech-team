function sendToDiscord(e) {
  const response = e.response.getItemResponses();
  let items = [];

  for (const responseAnswer of response) {
      const question = responseAnswer.getItem().getTitle();
      const answer = responseAnswer.getResponse();
      let parts = []

      try {
          parts = answer.match(/[\s\S]{1,1024}/g) || [];
      } catch (e) {
          parts = answer;
      }

      if (!answer) {
          continue;
      }

      for (const [index, part] of Object.entries(parts)) {
          if (index == 0) {
              items.push({
                  "name": question,
                  "value": part,
                  "inline": false
              });
          } else {
              items.push({
                  "name": question.concat(" (cont.)"),
                  "value": part,
                  "inline": false
              });
          }
      }
  }

  const options = {
      "method": "post",
      "headers": {
          "Content-Type": "application/json",
      },
      "payload": JSON.stringify({
          "content": "An event request has been sent to the tech team. Sign up here: https://docs.google.com/spreadsheets/d/1MQZ_Vr_B2U0mih87UEgg2KjBKXacx_PV8f0oJaMnPTk/edit?usp=sharing",
          "embeds": [{
              "title": "Tech Team Support Request",
              "color": 33023,
              "fields": items,
              "timestamp": new Date().toISOString()
          }]
      })
  };

  const hook = PropertiesService.getScriptProperties().getProperty("DISCORD_WEBHOOK");
  UrlFetchApp.fetch(hook, options);
};

function sendToSheets(e) {
  const sheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName("Signup");
  const response = e.response.getItemResponses();
  const title = response[0].getResponse();
  const dateStr = response[1].getResponse();
  const startStr = response[2].getResponse();
  const endStr = response[3].getResponse();
  const date = new Date(response[1].getResponse());
  const startDate = new Date(dateStr + " " + startStr)
  const endDate = new Date(dateStr + " " + endStr)

  sheet.appendRow([ 
    Utilities.formatDate(date, "America/New_York", "MM/dd/yyyy"), 
    Utilities.formatDate(startDate, "America/New_York", "h:mm a"), 
    Utilities.formatDate(endDate, "America/New_York", "h:mm a"), 
    "", "", "", "", title]);

  sheet.sort(1)
}

function onSubmit(e) {
  sendToDiscord(e);
  sendToSheets(e);
};