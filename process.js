// Very quick day before script to parse VGMCon's schedule and turn it into multiple iCals, based on the activity
// This is released as MIT Code, if you want to use it for some reason
// I am not a JavaScript developer, sorry.

// Based on https://www.twilio.com/en-us/blog/web-scraping-and-parsing-html-in-node-js-with-jsdom

import got from 'got'
import jsdom from 'jsdom'
import fs from 'fs'
import moment from 'moment'
import ical, {ICalCalendarMethod} from 'ical-generator';
import crypto from 'crypto'


const {JSDOM} = jsdom;

const dataMatchRegex = /([A-Za-z]+) ([0-9: ]+[ap]m) - ([0-9: ]+[ap]m)/;

const calendarDict = {
    "Activity": ical({name: 'VGMCon 2025 - Activity'}).method(ICalCalendarMethod.REQUEST),
    "Gaming": ical({name: 'VGMCon 2025 - Gaming'}).method(ICalCalendarMethod.REQUEST),
    "General": ical({name: 'VGMCon 2025 - General'}).method(ICalCalendarMethod.REQUEST),
    "Jam Space": ical({name: 'VGMCon 2025 - Jam Space'}).method(ICalCalendarMethod.REQUEST),
    "Music": ical({name: 'VGMCon 2025 - Music'}).method(ICalCalendarMethod.REQUEST),
    "Online": ical({name: 'VGMCon 2025 - Online'}).method(ICalCalendarMethod.REQUEST),
    "Panel": ical({name: 'VGMCon 2025 - Panel'}).method(ICalCalendarMethod.REQUEST),
    "All Events": ical({name: 'VGMCon 2025 - All Events'}).method(ICalCalendarMethod.REQUEST),
};


const vgmUrl = 'https://vgmcon.org/schedule/';

got(vgmUrl).then(response => {
    const dom = new JSDOM(response.body);

    var days = dom.window.document.getElementsByClassName("conference_day")

    Array.from(days).forEach((el) => {

        var day = el.getElementsByTagName("h3")[0].innerHTML

        console.log("Day is " + day)
        console.log()

        const pageDate = moment(day, 'dddd DD MMM YYYY')

        var entry = el.getElementsByClassName("workshop")

        Array.from(entry).forEach((ell) => {

            var event = ell.getElementsByTagName("h4")[0].innerHTML.replaceAll("\n", " ").replace("&amp;", "&");

            // Strip out [3:30p]-style text from the event name
            if(event.includes("]"))
            {
                event = event.split("] ")[1]
            }

            // location and presenter names are backwards?
            var location = ""
            if(ell.getElementsByClassName("presenter").length !== 0)
            {
                location = ell.getElementsByClassName("presenter")[0].innerHTML.replaceAll("&amp;", "&");
            }

            var presenter = ""
            if(ell.getElementsByClassName("location").length !== 0)
            {
                presenter = ell.getElementsByClassName("location")[0].textContent.replaceAll("&amp;", "&");
            }

            // "Theme" is the type/category
            var theme = ""
            if(ell.getElementsByClassName("theme").length !== 0)
            {

                var themes = ell.getElementsByClassName("theme")
                for (let item of themes) {

                    // Some events have multiple "themes" now with the day. We don't want that.
                    if(item.textContent.includes("Friday") || item.textContent.includes("Saturday") || item.textContent.includes("Sunday"))
                    {
                        continue;
                    }
                    else
                    {
                        theme = item.textContent.replaceAll("&amp;", "&");
                        break;
                    }
                }

            }

            var when = ""
            if(ell.getElementsByClassName("session").length !== 0)
            {
                when = ell.getElementsByClassName("session")[0].textContent.replaceAll("&amp;", "&");
            }

            var description = ""
            if(ell.getElementsByClassName("description").length !== 0)
            {
                description = ell.getElementsByClassName("description")[0].textContent.replaceAll("\n", " ").replaceAll("&amp;", "&");
            }

            console.log()
            console.log(event)
            console.log("--> At : " + location)
            console.log("--> By : " + presenter)
            console.log("--> Typ: " + theme)
            console.log("--> Dsc: " + description)
            console.log("--> Whn: " + when)

            // If it errors, skip it and keep going
            // This seems to only happen with events that don't have an end time?
            try {
                const matches = dataMatchRegex.exec(when);

                console.log(matches)

                // Create a date/time string and parse it, then do terrible timezone handling
                const actualStartDate = moment(day + " " + matches[2], 'dddd DD MMM YYYY h:mm a').add(-4, "hours")
                const actualEndDate = moment(day + " " + matches[3], 'dddd DD MMM YYYY h:mm a').add(-4, "hours")

                console.log(day + " " + matches[2])
                console.log(day + " " + matches[3])

                console.log(actualStartDate)
                console.log(actualEndDate)

                // Fix for panels that span two days during overnight panels
                if(matches[2].endsWith("pm") && matches[3].endsWith("am"))
                {
                    actualEndDate.add(1,"day")
                }

                // console.log("starts at " + actualStartDate + ", ends at " + actualEndDate)

                // Remove quotes from the title
                let eventTitle = event.replaceAll('"',"")

                // Hack to generate a unique value, rather than a random uuid every run
                let uuid = crypto.createHash('md5').update(eventTitle).digest("hex")

                // Create the actual event
                calendarDict[theme].createEvent({
                    start: actualStartDate.toDate(),
                    end: actualEndDate.toDate(),
                    summary: eventTitle,
                    description: description,
                    location: location,
                    floating: true,
                    id: uuid,
                    stamp: moment("2025-03-28T00:00:00.000Z")

                });

                // Create the actual event
                calendarDict["All Events"].createEvent({
                    start: actualStartDate.toDate(),
                    end: actualEndDate.toDate(),
                    summary: eventTitle,
                    description: description,
                    location: location,
                    floating: true,
                    id: uuid,
                    stamp: moment("2025-03-28T00:00:00.000Z")

                });

            }
            catch(err) {
                console.log(err)
                console.log("whomp")
            }

        });
    });


    // And write everything to disk
    Object.entries(calendarDict).forEach(function callback(entry, index) {
        const [key, value] = entry;
        fs.writeFile('calendars/' + key + ".ics", calendarDict[key].toString(), err => {
            if (err) {
                console.error(err);
            } else {
                // file written successfully
            }
        });
    });

}).catch(err => {
    console.log(err);
});