import datetime
from typing import NamedTuple

import dateparser


class Event(NamedTuple):
    date: datetime.date
    start: datetime.time
    end: datetime.time
    crew: list[str]
    description: str


header = [
    "Date",
    "Start Time",
    "End Time",
    "Person 1",
    "Person 2",
    "Person 3",
    "Person 4:,"
    "Description"]


def get_signup_data(sheet, sheet_id) -> list[Event]:
    result = (
        sheet.values()
        .get(spreadsheetId=sheet_id, range="Signup")
        .execute()
    )
    values = result.get("values", [])

    if not values:
        return []

    data = values[1:]
    events = []
    for row in data:
        events.append(Event(
            date=dateparser.parse(row[0]).date(),
            start=dateparser.parse(row[1]).time(),
            end=dateparser.parse(row[2]).time(),
            crew=[name for name in row[3:7] if name.strip()],
            description=row[7] if len(row) >= 7 else None
        ))

    return events


def to_spreadsheet_rows(events: list[Event]) -> list[list[str]]:
    result = []

    for e in events:
        row = [
            e.date.strftime("%m/%d/%Y"),
            e.start.strftime("%I:%M %p"),
            e.end.strftime("%I:%M %p"),
        ]
        for i in range(4):
            try:
                row.append(e.crew[i])
            except:
                row.append("")
        row.append(e.description)
        result.append(row)
    return result
