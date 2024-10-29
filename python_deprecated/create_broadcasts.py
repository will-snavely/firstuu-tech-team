#!/usr/bin/python

import os
import sys
import traceback
from collections import namedtuple

import bs4
import dateparser
import discord
import pytz
import requests
from discord import SyncWebhook
from googleapiclient.errors import HttpError
from pytz import timezone
from spellchecker import SpellChecker

import auth

Service = namedtuple(
    "Service",
    ["title", "when", "description"])
Broadcast = namedtuple(
    "Broadcast",
    ["title", "when", "description"]
)

upcoming = "https://www.first-unitarian-pgh.org/about-worship/upcoming-worship-services/"
eastern = timezone('US/Eastern')

DISCORD_WEBHOOK_SUCCESS = os.environ.get("DISCORD_WEBHOOK_SUCCESS")
DISCORD_WEBHOOK_FAILURE = os.environ.get("DISCORD_WEBHOOK_FAILURE")

sp = SpellChecker(language=None)
sp.word_frequency.load_text_file("months.txt")


def clean_date(text):
    parts = text.strip().split()
    new_parts = []
    for p in parts:
        if p.strip(",").isnumeric():
            new_parts.append(p)
        else:
            c = sp.correction(p)
            if c:
                new_parts.append(c)
            else:
                new_parts.append(p)
    result = (" ".join(new_parts))
    result = result.replace("am am", "am")
    result = result.replace("pm pm", "pm")
    return result


def get_upcoming_services():
    result = requests.get(upcoming)
    soup = bs4.BeautifulSoup(result.text, "html.parser")
    service_elems = soup.select("article.featured")
    for service in service_elems:
        link = service.select_one("a")
        service_result = requests.get(link["href"])
        service_soup = bs4.BeautifulSoup(service_result.text, "html.parser")
        title_elem = service_soup.select_one("h1.entry-title")
        time = service_soup.select_one("time")
        desc_paragraphs = service_soup.select_one("div.entry-content").select("p")
        desc_text = ""

        cleaned_date = clean_date(time.text)
        print("{0}, {1}=>{2}".format(title_elem.text, time.text, cleaned_date), file=sys.stderr)
        for d in desc_paragraphs:
            if not d.text.startswith("Livestreamed"):
                desc_text += d.text.strip() + "\n"
        yield Service(
            title_elem.text.strip(),
            dateparser.parse(cleaned_date),
            desc_text.strip())


# Create a liveBroadcast resource and set its title, scheduled start time,
# scheduled end time, and privacy status.
def insert_broadcast(youtube, title, start_time, desc, privacy_status):
    insert_broadcast_response = youtube.liveBroadcasts().insert(
        part="snippet,status",
        body=dict(
            snippet=dict(
                title=title,
                scheduledStartTime=start_time,
                description=desc
            ),
            status=dict(
                privacyStatus=privacy_status
            )
        )
    ).execute()
    return insert_broadcast_response


# Retrieve a list of broadcasts with the specified status.
def get_broadcasts(youtube, broadcast_status):
    result = []
    list_broadcasts_request = youtube.liveBroadcasts().list(
        broadcastStatus=broadcast_status,
        part='id,snippet',
        maxResults=50
    )
    while list_broadcasts_request:
        list_broadcasts_response = list_broadcasts_request.execute()
        for broadcast in list_broadcasts_response.get('items', []):
            snippet = broadcast.get("snippet")
            if snippet:
                title = snippet.get("title")
                description = snippet.get("description")
                when = snippet.get("scheduledStartTime")
                if when:
                    when = dateparser.parse(when)
                result.append(Broadcast(title, when, description))
        list_broadcasts_request = youtube.liveBroadcasts().list_next(
            list_broadcasts_request, list_broadcasts_response)
    return result


def main():
    scopes = ["https://www.googleapis.com/auth/youtube"]
    creds = auth.authenticate(scopes, token_path="youtube_token.json")
    youtube = auth.youtube_service(creds)
    broadcasts = []
    try:
        broadcasts = get_broadcasts(youtube, 'upcoming')
    except HttpError as e:
        print('An HTTP error %d occurred:\n%s' % (e.resp.status, e.content))

    covered = {}
    for b in broadcasts:
        if b.title.startswith("Sunday Service"):
            covered[b.when.date()] = b
    services = list(get_upcoming_services())

    for s in services:
        print(s, file=sys.stderr)
        date = s.when.date()
        if date not in covered:
            title = "Sunday Service {0}/{1}/{2}: {3}".format(
                date.month, date.day, date.year, s.title)
            loc_dt = eastern.localize(s.when)
            start = loc_dt.astimezone(pytz.utc).isoformat()
            response = insert_broadcast(
                youtube,
                title,
                start,
                s.description,
                "public")
            url = "https://youtube.com/live/{0}".format(response["id"])
            message = "Created new livestream: {0}".format(url)
            if DISCORD_WEBHOOK_SUCCESS:
                webhook = SyncWebhook.from_url(DISCORD_WEBHOOK_SUCCESS)
                webhook.send(embed=discord.Embed(
                    title="New Broadcast Created",
                    url=url,
                    description=title + "\nThis is an automated message."))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        if DISCORD_WEBHOOK_FAILURE:
            webhook = discord.SyncWebhook.from_url(DISCORD_WEBHOOK_FAILURE)
            embed = discord.Embed(
                title="Error in create_broadcasts.py",
                description="```{}```".format(traceback.format_exc()))
            webhook.send("", embed=embed)
        raise e
