/**
 * @OnlyCurrentDoc
 */
YouTube.setTokenService(function() {
  return getYouTubeService().getAccessToken();
});
 
// Read data from current sheet and create live events returning details back to sheet
function createBroadcasts() {
  var sheet = SpreadsheetApp.getActiveSheet();
  new cUseful.Fiddler(sheet)
    .mapRows(function(row) {
      if (!row.youtube_url) { // if not already scheduled
        // Create a broadcast
        var broadcast_resource = insertBroadcast(row);
        // step 2 - prep data to add back to the sheet
        row.youtube_url = "https://youtu.be/" + broadcast_resource.id;
      }
      return row;
    }).dumpValues();
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