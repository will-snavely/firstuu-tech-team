import json
import os.path
import traceback
from datetime import datetime

import dateparser
import discord

import auth

# The ID and range of a sample spreadsheet.
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")
DISCORD_WEBHOOK_SUCCESS = os.environ.get("DISCORD_WEBHOOK_SUCCESS")
DISCORD_WEBHOOK_FAILURE = os.environ.get("DISCORD_WEBHOOK_FAILURE")
DISCORD_NAMES = os.environ.get("DISCORD_NAMES")


def get_signup_data(sheet):
    result = (
        sheet.values()
        .get(spreadsheetId=SPREADSHEET_ID, range="Signup")
        .execute()
    )
    values = result.get("values", [])

    if not values:
        return []

    return values


def main():
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    service = auth.get_authenticated_service(scopes, "sheets", "v4")
    discord_name_map = {}
    try:
        with open("discord_names.json") as f:
            discord_name_map = json.load(f)
    except:
        pass

    # Call the Sheets API
    today = datetime.now().date()
    sheet = service.spreadsheets()
    sheet_all = get_signup_data(sheet)
    data = sheet_all[1:]

    days_threshold = 2
    events = []
    for row in data:
        date = dateparser.parse(row[0]).date()
        delta = (date - today).days
        if delta == days_threshold:
            events.append(row)

    sheet_data = sheet.get(spreadsheetId=SPREADSHEET_ID).execute()
    sheet_url = sheet_data["spreadsheetUrl"]

    for event in events:
        crew = [name for name in event[3:7] if name.strip()]
        notif_strs = []
        for name in crew:
            if discord_name_map and name.lower() in discord_name_map:
                handle = discord_name_map.get(name.lower())
                notif_strs.append("<@{1}>".format(name, handle))
            else:
                notif_strs.append(name)

        message = ""
        crew_str = "Crew: {0}\n".format(", ".join(crew))
        notify_str = ""
        if notif_strs:
            notify_str = ", ".join(notif_strs)

        if len(crew) == 0:
            message += "URGENT: No volunteers for this service yet.\n"
        elif len(crew) == 1:
            message += crew_str
            message += "Only one volunteer signed up!\n"
        else:
            message += crew_str
        message += "Scheduling/signup: {0}".format(sheet_url)

        if DISCORD_WEBHOOK_SUCCESS:
            webhook = discord.SyncWebhook.from_url(DISCORD_WEBHOOK_SUCCESS)
            embed = discord.Embed(
                title="Upcoming Event: {0} on {1}, {2} - {3}".format(event[-1], event[0], event[1], event[2]),
                description=message)
            webhook.send(notify_str, embed=embed)


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
