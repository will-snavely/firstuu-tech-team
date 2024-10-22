import os.path
import traceback
from datetime import datetime, timedelta

import dateparser
import discord

import auth

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# The ID and range of a sample spreadsheet.
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")
DISCORD_WEBHOOK_FAILURE = os.environ.get("DISCORD_WEBHOOK_FAILURE")


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
    current_date = datetime.now()
    sheet = service.spreadsheets()
    sheet_all = get_signup_data(sheet)
    header = sheet_all[0]
    data = sheet_all[1:]
    updated = [header]
    for row in data:
        if row[0].strip():
            date = dateparser.parse(row[0])
            delta = date - datetime.now()
            if delta.days >= 0:
                updated.append(row)

    data.sort(key=lambda r: dateparser.parse(r[0]))
    last = data[-1]
    last_date = dateparser.parse(last[0])
    next_date = last_date + timedelta(days=7)

    while (next_date - current_date).days <= 4 * 30:
        date_str = "{0}/{1}/{2}".format(next_date.month, next_date.day, next_date.year)
        new_row = [date_str, "9:30 AM", "12:00 PM", "", "", "", "", "Sunday Morning Service"]
        updated.append(new_row)
        next_date = next_date + timedelta(days=7)

    (service.spreadsheets()
     .values()
     .clear(
        spreadsheetId=SPREADSHEET_ID,
        range="Signup",
    ).execute())

    (service.spreadsheets()
     .values()
     .update(
        spreadsheetId=SPREADSHEET_ID,
        range="Signup",
        valueInputOption="USER_ENTERED",
        body={"values": updated},
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
