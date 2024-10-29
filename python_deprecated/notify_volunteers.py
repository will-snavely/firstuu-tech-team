import json
import os.path
import traceback
from datetime import datetime

import discord

import auth
import events

# The ID and range of a sample spreadsheet.
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")
DISCORD_WEBHOOK_SUCCESS = os.environ.get("DISCORD_WEBHOOK_SUCCESS")
DISCORD_WEBHOOK_FAILURE = os.environ.get("DISCORD_WEBHOOK_FAILURE")


def main():
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    creds = auth.authenticate(scopes, token_path="sheets_token.json")
    service = auth.sheets_service(creds)
    discord_name_map = {}
    try:
        with open("discord_names.json") as f:
            discord_name_map = json.load(f)
    except:
        pass

    # Call the Sheets API
    today = datetime.now().date()
    sheet = service.spreadsheets()
    data = events.get_signup_data(sheet, SPREADSHEET_ID)

    days_threshold = 2
    target_events = []
    for row in data:
        delta = (row.date - today).days
        if delta == days_threshold:
            target_events.append(row)

    sheet_data = sheet.get(spreadsheetId=SPREADSHEET_ID).execute()
    sheet_url = sheet_data["spreadsheetUrl"]

    for ev in target_events:
        notif_strs = []
        for name in ev.crew:
            if discord_name_map and name.lower() in discord_name_map:
                handle = discord_name_map.get(name.lower())
                notif_strs.append("<@{1}>".format(name, handle))

        message = ""
        crew_str = "Crew: {0}\n".format(", ".join(ev.crew))
        notify_str = ""
        if notif_strs:
            notify_str = " ".join(notif_strs)

        if len(ev.crew) == 0:
            notify_str = "@everyone"
            message += "Action Needed: No volunteers for this service yet.\n"
        elif len(ev.crew) == 1:
            notify_str = "@everyone"
            message += crew_str
            message += "Notice: Only one volunteer signed up.\n"
        else:
            message += crew_str
        message += "Scheduling/signup: {0}".format(sheet_url)

        if DISCORD_WEBHOOK_SUCCESS:
            webhook = discord.SyncWebhook.from_url(DISCORD_WEBHOOK_SUCCESS)
            embed = discord.Embed(
                title="{0} on {1}, {2} - {3}".format(
                    ev.description,
                    ev.date, ev.start, ev.end),
                description=message)
            webhook.send("Upcoming Event Reminder " + notify_str, embed=embed)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        if DISCORD_WEBHOOK_FAILURE:
            webhook = discord.SyncWebhook.from_url(DISCORD_WEBHOOK_FAILURE)
            embed = discord.Embed(
                title="Error in notify_volunteers.py",
                description="```{}```".format(traceback.format_exc()))
            webhook.send("", embed=embed)
        raise e
