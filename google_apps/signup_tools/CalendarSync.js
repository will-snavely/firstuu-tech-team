function syncCalendarOnTimer() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var allData = sheet.getDataRange();
  var dataWithoutHeader = allData.offset(1, 0, allData.getNumRows() - 1);
  syncCalendar(dataWithoutHeader);
}

function syncCalendarOnEdit(e) {
  var range = e.range;
  if(e.range.getRow() === 1) {
    if(e.range.getLastRow() === 1) {
      return;
    } else {
      range = range.offset(1, 0, range.getNumRows() - 1);
    }
  }
  syncCalendar(e.range);
}

function syncCalendar(range) {
  var sheet = SpreadsheetApp.getActiveSheet();
  const calendarId = PropertiesService.getScriptProperties().getProperty("CALENDAR_ID");
  var calendar = CalendarApp.getCalendarById(calendarId);

  var startRow = range.getRow();
  var lastRow = range.getLastRow();
  console.log("Start row: " + startRow);
  console.log("Last row: " + lastRow);

  var data = sheet.getSheetValues(startRow, 1, lastRow, 10);
  var earliest = new Date();
  earliest.setFullYear(3000) 
  var latest = new Date();
  latest.setFullYear(1000);
  for (var i = 0; i < data.length; i++) {
    const entry = data[i];
    if(String(entry[0]).trim() !== '') {
      if(entry[0].getTime() < earliest.getTime()) {
        earliest = new Date(entry[0]);
      }
      if(entry[0].getTime() > latest.getTime()) {
        latest = new Date(entry[0]);
      }
    } 
  }

  console.log("Earliest Date: " + earliest);
  console.log("Latest Date: " + latest);
  earliest.setDate(earliest.getDate() - 5);
  earliest.setHours(12,0,0,0);
  latest.setDate(latest.getDate() + 1);
  latest.setHours(12,0,0,0);
  var events = calendar.getEvents(earliest, latest);
  const eventMap = new Map();
  for(var i = 0; i < events.length; i++) {
    eventMap.set(events[i].getId(), events[i]);
  }

  for (var i = 0; i < data.length; i++) {
    var date = data[i][0];
    var startTime = data[i][1];
    var endTime = data[i][2];
    var description = data[i][7];

    if(String(date).trim() === '' 
      || String(startTime).trim() === '' 
      || String(endTime).trim() === '' 
      || String(description).trim() === '') {
      continue;
    }

    startTime.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    endTime.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());

    var crew = [];
    for (var j = 0; j < 4; j++) {
      var signup = data[i][3+j];
      if(String(signup).trim() !== '') {
        crew.push(signup);
      }
    }

    var crewString = "(Volunteers Needed)"
    if(crew.length > 0) {
      crewString = "(" + crew.join(", ") + ")";
    }

    const eventDesc = description + " " + crewString;
    const eventId = data[i][8];

    if(String(eventId) === '') {
      var event = calendar.createEvent(eventDesc, startTime, endTime);
      console.log("Created Event with ID: " + event.getId());
      event.setColor(CalendarApp.EventColor.BLUE);
      sheet.getRange(startRow + i, 9).setValue(event.getId());
    } else {
      var event = eventMap.get(eventId);
      if(event.getTitle() !== eventDesc 
          || event.getStartTime().getTime() !== startTime.getTime() 
          || event.getEndTime().getTime() !== endTime.getTime()) {
        console.log("Updating Event with ID: " + event.getId());
        event.setTitle(eventDesc);
        event.setTime(startTime, endTime);
      }
    }
  }
}