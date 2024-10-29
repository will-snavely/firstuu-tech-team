/**
 * Authorizes and makes a request to the YouTube Data API.
 */
function setup() {
  var service = getYouTubeService();
  YouTube.setTokenService(function() {
    return service.getAccessToken();
  });
  if (service.hasAccess()) {
    var result = YouTube.channelsList("snippet", {
      mine: true
    });
    Logger.log(JSON.stringify(result, null, 2));
    throw "Open View > Logs to see result";
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s',
      authorizationUrl);
    throw "Open View > Logs to get authentication url";
  }
}
 
/**
 * Configures the service.
 */
function getYouTubeService() {
  return OAuth2.createService('YouTube')
    // Set the endpoint URLs.
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
    .setTokenUrl('https://accounts.google.com/o/oauth2/token')
    // Set the client ID and secret.
    .setClientId(getStaticScriptProperty_('client_id'))
    .setClientSecret(getStaticScriptProperty_('client_secret'))
    // Set the name of the callback function that should be invoked to complete
    // the OAuth flow.
    .setCallbackFunction('authCallback')
    // Set the property store where authorized tokens should be persisted
    // you might want to switch to Script Properties if sharing access
    .setPropertyStore(PropertiesService.getUserProperties())
    // Set the scope and additional Google-specific parameters.
    .setScope(["https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.force-ssl",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtubepartner",
      "https://www.googleapis.com/auth/youtubepartner-channel-audit"
    ])
    .setParam('access_type', 'offline');
}
 
/**
 * Handles the OAuth callback.
 */
function authCallback(request) {
  var service = getYouTubeService();
  var authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success!');
  } else {
    return HtmlService.createHtmlOutput('Denied');
  }
}
/**
 * Logs the redirect URI to register in the Google Developers Console.
 */
function logRedirectUri() {
  var service = getYouTubeService();
  Logger.log(service.getRedirectUri());
  throw "Open View > Logs to get redirect url";
}
 
/**
 * Reset the authorization state, so that it can be re-tested.
 */
function reset() {
  var service = getYouTubeService();
  service.reset();
}
 
/**
 * Gets a static script property, using long term caching.
 * @param {string} key The property key.
 * @returns {string} The property value.
 */
function getStaticScriptProperty_(key) {
  var value = CacheService.getScriptCache().get(key);
  if (!value) {
    value = PropertiesService.getScriptProperties().getProperty(key);
    CacheService.getScriptCache().put(key, value, 21600);
  }
  return value;
}