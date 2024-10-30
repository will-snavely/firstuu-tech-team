const UPCOMING_SERVICES_URL = "https://www.first-unitarian-pgh.org/about-worship/upcoming-worship-services/";

function updateRecentServicesSheet() {
    var oldData = SpreadsheetApp.getActiveSheet().getDataRange().getValues();
    var urlMap = new Map();
    for (var i = 1; i < oldData.length; i++) {
      urlMap.set(oldData[i][3], oldData[i]);
    }

    var services = getUpcomingServices();
    var newData = new Array();
    for (var i = 0; i < services.length; i++) {
      service = services[i];
      if(!urlMap.has(service.church_url)) {
        urlMap.set(service.church_url, service);
        newData.push(flatten(service));
      }
    }

    if(newData.length > 0) {
      SpreadsheetApp.getActiveSheet()
        .getRange(oldData.length + 1, 1, newData.length, 5)
        .setValues(newData);
      SpreadsheetApp.getActiveSheet().sort(2);
    }
}

function flatten(service) {
  return [
    service.title,
    service.date,
    service.description,
    service.church_url,
    service.youtube_url
  ];
}

function getContent_(url) {
    Logger.log("Attempting to fetch URL: " + url);
    return UrlFetchApp.fetch(url).getContentText();
}

function parseMonth(s) {
  const lc = s.toLowerCase();
  if(lc === "january" || lc.startsWith("jan")) {
    return 0;
  } else if(lc === "february" || lc.startsWith("feb")) {
    return 1;
  } else if(lc === "march" || lc.startsWith("feb")) {
    return 2;
  } else if(lc === "april" || lc.startsWith("apr")) {
    return 3;
  } else if(lc === "may") {
    return 4;
  }else if(lc === "june" || lc.startsWith("jun")) {
    return 5;
  } else if(lc === "july" || lc.startsWith("jul")) {
    return 6;
  } else if(lc === "august" || lc.startsWith("aug")) {
    return 7;
  } else if(lc === "september" || lc.startsWith("sep")) {
    return 8;
  } else if(lc === "october" || lc.startsWith("oct")) {
    return 9;
  } else if(lc === "november" || lc.startsWith("nov")) {
    return 10;
  } else if(lc === "december" || lc.startsWith("dec")) {
    return 11;
  } else {
    throw new Error("Unrecognized month: " + s);
  }
}

function parseDate(s) {
  Logger.log("Attempting to parse string: " + s);
  var parts = s.toLowerCase().split(/\s+/);  
  const month = parseMonth(parts[0]);
  const day = parseInt(parts[1].replace(",", ""));
  const year = parseInt(parts[2]);
  
  const timeStr = parts[3];
  const timeParts = timeStr.split(":");
  var hours = parseInt(timeParts[0]);
  const minuteStr = timeParts[1];
  var minutes;
  var isAM = false;
  if(minuteStr.includes("am") || minuteStr.includes("pm")) {
    minutes = parseInt(minuteStr.replace("am", "").replace("pm", ""));
    isAM = minuteStr.includes("am");
  } else {
    minutes = parseInt(minuteStr);
    isAM = parts[4].includes("am");
  }

  if(!isAM) {
    hours = hours + 12;
  }
  
  var result = new Date();
  result.setFullYear(year, month, day);
  result.setHours(hours, minutes, 0, 0);
  Logger.log(result);
  return result;
}

function getServiceDetails(url) {
  const content = getContent_(url);
  const $ = Cheerio.load(content);
  const title = $("h1.entry-title").text();
  const date = $("time").text();
  var description = "";
  $("div.entry-content p").each(function() {
    const text = $(this).text().trim();
    if(!text.startsWith("Livestreamed")) {
      description += $(this).text().trim() + "\n";
    }
  });
  return {
    title: title,
    date: parseDate(date),
    description: description.trim(),
    church_url: url,
    youtube_url: ""
  }
}

function getUpcomingServices() {
  const content = getContent_(UPCOMING_SERVICES_URL);
  const $ = Cheerio.load(content);
  const results = new Array();
  $("article.featured").each(function() {
    const serviceUrl = $(this).find("a").attr("href");
    results.push(getServiceDetails(serviceUrl));
  });
  return results;
}