function updateDates() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const today = new Date();

  new cUseful.Fiddler(sheet)
    .filterRows(function(row) {
      var date = new Date(row.Date);
      date.setHours(23,59,59.0);
      if(today.getTime() - date.getTime() > 0) {
        Logger.log("Filtering row for passed event:");
        Logger.log(row);
        return false;
      } else {
        return true;
      }
    }).dumpValues();
  
    const data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();
    var sundayEvents = new Map();
    for(var i = 1; i < data.length; i++) {
        if(data[i][0].toString().trim() === "" || data[i][1].toString().trim() === "") {
          continue;
        }
        if(data[i][0].getDay() === 0 && data[i][1].getHours() === 9 && data[i][1].getMinutes() === 30)  {
          const dateStr = Utilities.formatDate(data[i][0], Session.getScriptTimeZone(), "MM/dd/YYYY");
          sundayEvents.set(dateStr, data[i]);
        }
    }

    var nearestSunday = new Date();
    while(nearestSunday.getDay() != 0) {
      nearestSunday.setDate(nearestSunday.getDate() + 1)
    }

    var currentSunday = new Date(nearestSunday);
    var addedEvents = new Array();
    for(var i = 0; i < 24; i++) {
      currentSunday.setDate(currentSunday.getDate() + 7);
      const dateStr = Utilities.formatDate(currentSunday, Session.getScriptTimeZone(), "MM/dd/YYYY");
      if(!sundayEvents.has(dateStr)) {
        addedEvents.push([
          dateStr, "9:30:00 AM", "12:00:00 PM",
          "", "", "", "",
          "Sunday Morning Service", ""
        ]);
      }
    }
    if(addedEvents.length > 0) {
      Logger.log("Adding Future Sundays");
      Logger.log(addedEvents);
      SpreadsheetApp
        .getActiveSheet()
        .getRange(data.length + 1, 1, addedEvents.length, 9)
        .setValues(addedEvents);
    }

    SpreadsheetApp.getActiveSheet().sort(1);
}