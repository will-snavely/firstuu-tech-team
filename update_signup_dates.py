import os.path
import traceback
from datetime import datetime, timedelta, time

import discord

import auth
import events

# The ID and range of a sample spreadsheet.
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")
DISCORD_WEBHOOK_FAILURE = os.environ.get("DISCORD_WEBHOOK_FAILURE")


def main():
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    creds = auth.authenticate(scopes, token_path="sheets_token.json")
    sheets = auth.sheets_service(creds)

    current_events = [
        ev for ev in events.get_signup_data(sheets.spreadsheets(), SPREADSHEET_ID)
        if (ev.date - datetime.now().date()).days >= -1
    ]

    current_events.sort(key=lambda ev: ev.date)
    sunday_events = [e for e in current_events if e.date.weekday() == 6 and e.start == time(9, 30)]
    covered_sundays = set(ev.date for ev in sunday_events)

    nearest_sunday = datetime.now()
    while nearest_sunday.weekday() != 6:
        nearest_sunday += timedelta(days=1)

    current_sunday = nearest_sunday
    added_events = []
    for x in range(24):
        current_sunday = current_sunday + timedelta(weeks=1)
        if current_sunday.date() not in covered_sundays:
            added_events.append(events.Event(
                date=current_sunday.date(),
                start=time(9, 30),
                end=time(12),
                crew=[],
                description="Sunday Morning Service",
                event_id=""))

    all_events = current_events + added_events
    all_events.sort(key=lambda ev: ev.date)
    new_sheet = [events.header] + events.to_spreadsheet_rows(all_events)

    (sheets.spreadsheets()
     .values()
     .clear(
        spreadsheetId=SPREADSHEET_ID,
        range="Signup",
    ).execute())

    (sheets.spreadsheets()
     .values()
     .update(
        spreadsheetId=SPREADSHEET_ID,
        range="Signup",
        valueInputOption="USER_ENTERED",
        body={"values": new_sheet},
    ).execute())


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        if DISCORD_WEBHOOK_FAILURE:
            webhook = discord.SyncWebhook.from_url(DISCORD_WEBHOOK_FAILURE)
            embed = discord.Embed(
                title="Error in update_signin_dates.py",
                description="```{}```".format(traceback.format_exc()))
            webhook.send("", embed=embed)
        raise e
