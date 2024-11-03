/**
 * @OnlyCurrentDoc
 */
YouTube.setTokenService(function() {
  return getYouTubeService().getAccessToken();
});

NONPROFIT_CATEGORY = 29;
 
// Read data from current sheet and create live events returning details back to sheet
function createBroadcasts() {
  var sheet = SpreadsheetApp.getActiveSheet();
  new cUseful.Fiddler(sheet)
    .mapRows(function(row) {
      if (!row.youtube_url) { // if not already scheduled
        // Create a broadcast
        Logger.log("Creating broadcast for row:");
        Logger.log(row);
        var broadcast_resource = insertBroadcast(row);

        // Update the category
        updateVideo(broadcast_resource.id, row.title, NONPROFIT_CATEGORY);

        // Prep data to add back to the sheet
        row.youtube_url = "https://youtu.be/" + broadcast_resource.id;
      }
      return row;
    }).dumpValues();
}

function updateVideo(video_id, title, category_id) {
  var update_video_response = YouTube.videosUpdate("id,snippet", {
    "id": video_id,
    "snippet": {
      "title": title
      "categoryId": category_id
    }
  }, {});
  Logger.log(update_video_response);
  return update_video_response;
}
 
// The following is based on
// https://developers.google.com/youtube/v3/live/code_samples/python#create_a_broadcast_and_stream
// LICENCE Copyright Google http://www.apache.org/licenses/LICENSE-2.0
// Create a liveBroadcast resource and set its title, scheduled start time,
// scheduled end time, and privacy status.
function insertBroadcast(options) {
  const formattedDate = Utilities.formatDate(
    options.date, 
    Session.getScriptTimeZone(), 
    "YYYY-MM-dd'T'HH:mm:ssZZZZZ");
  var insert_broadcast_response = YouTube.liveBroadcastsInsert("snippet,status", {
    "snippet": {
      "title": options.title,
      "description": options.description,
      "scheduledStartTime": formattedDate
    },
    "status": {
      "privacyStatus": "public",
    }
  }, {});
  Logger.log(insert_broadcast_response);
  return insert_broadcast_response;
}