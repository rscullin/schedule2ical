// Very quick day before script to parse VGMCon's schedule and turn it into multiple iCals, based on the activity
// This is released as MIT Code, if you want to use it for some reason
// I am not a JavaScript developer, sorry.

// Based on https://www.twilio.com/en-us/blog/web-scraping-and-parsing-html-in-node-js-with-jsdom

import got from 'got'
import jsdom from 'jsdom'
import fs from 'fs'
import moment from 'moment'
import ical, {ICalCalendarMethod} from 'ical-generator';

const {JSDOM} = jsdom;

const dataMatchRegex = /\[([0-9:]+[ap]) - ([0-9:]+[ap])\] (.*)/;

const calendarDict = {
    "Activity": ical({name: 'VGMCon 2024 - Activity'}).method(ICalCalendarMethod.REQUEST),
    "Gaming": ical({name: 'VGMCon 2024 - Gaming'}).method(ICalCalendarMethod.REQUEST),
    "General": ical({name: 'VGMCon 2024 - General'}).method(ICalCalendarMethod.REQUEST),
    "Jam Space": ical({name: 'VGMCon 2024 - Jam Space'}).method(ICalCalendarMethod.REQUEST),
    "Music": ical({name: 'VGMCon 2024 - Music'}).method(ICalCalendarMethod.REQUEST),
    "Online": ical({name: 'VGMCon 2024 - Online'}).method(ICalCalendarMethod.REQUEST),
    "Panel": ical({name: 'VGMCon 2024 - Panel'}).method(ICalCalendarMethod.REQUEST),
    "Speedrun": ical({name: 'VGMCon 2024 - Speedrun'}).method(ICalCalendarMethod.REQUEST),
};


const vgmUrl = 'https://vgmcon.org/2024-schedule/';

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

            var theme = ""
            if(ell.getElementsByClassName("theme").length !== 0)
            {
                theme = ell.getElementsByClassName("theme")[0].textContent.replaceAll("&amp;", "&");
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

            // If it errors, skip it and keep going
            // This seems to only happen with events that don't have an end time?
            try {
                const matches = dataMatchRegex.exec(event);

                // Create a date/time string and parse it, then do terrible timezone handling
                const actualStartDate = moment(day + matches[1], 'dddd DD MMM YYYY h:mm a').add(-5, "hours")
                const actualEndDate = moment(day + matches[2], 'dddd DD MMM YYYY h:mm a').add(-5, "hours")

                // console.log("starts at " + actualStartDate + ", ends at " + actualEndDate)

                // Remove quotes from the title
                let eventTitle = matches[3].replaceAll('"',"")

                // Create the actual event
                calendarDict[theme].createEvent({
                    start: actualStartDate.toDate(),
                    end: actualEndDate.toDate(),
                    summary: eventTitle,
                    description: description,
                    location: location,
                    floating: true
                });

            }
            catch(err) {
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