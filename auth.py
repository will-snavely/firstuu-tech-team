import os.path

import requests
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build


def get_refresh_token(cli_id, secret, refresh):
    params = {
        "grant_type": "refresh_token",
        "client_id": cli_id,
        "client_secret": secret,
        "refresh_token": refresh
    }

    authorization_url = "https://oauth2.googleapis.com/token"
    r = requests.post(authorization_url, data=params)
    if r.ok:
        return r.json()['access_token']
    else:
        return None


def authenticate(scopes, token_path="token.json"):
    creds = None
    client_id = os.environ.get("CLIENT_ID")
    client_secret = os.environ.get("CLIENT_SECRET")
    refresh_token = os.environ.get("REFRESH_TOKEN")

    if client_id and client_secret and refresh_token:
        access_token = get_refresh_token(client_id, client_secret, refresh_token)
        creds = Credentials(access_token)
    elif os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, scopes)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "credentials.json", scopes
            )
            creds = flow.run_local_server(port=0)
        with open(token_path, "w") as token:
            token.write(creds.to_json())
    return creds


def sheets_service(creds):
    return build("sheets", "v4", credentials=creds)


def youtube_service(creds):
    return build("youtube", "v3", credentials=creds)
