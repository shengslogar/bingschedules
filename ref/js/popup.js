/**
 * @name        popup.js
 * @description Manages popup window for extension, processing and exports
 * @requires    jquery, ics, ics.deps
 * @author      Sheng-Liang Slogar <slogar.sheng@gmail.com>
 */
chrome.tabs.executeScript({
    'code': '[window.location.hostname, document.title]'
}, function (props) {

    if (props) {

        props = props[0]; // only get current page info

        // IMPORTANT: This code must match the selector in background.js
        if (props[0] == 'ssb.cc.binghamton.edu' && props[1] == 'Student Detail Schedule') {

            $('#ext-enabled').addClass('visible');

            $('#export-btn').click(function (e) {
                chrome.tabs.executeScript({
                    'code': 'document.body.innerHTML',
                }, function (clientHTML) {
                    var $content = $("<body>", {html: clientHTML}); // recreate page locally for manipulation

                    var events = [];
                    var eventCount = 0;

                    // compile information
                    $content.find('.datadisplaytable').each(function () {
                        var $this = $(this);
                        var $caption = $this.children('.captiontext').first();


                        if (!events[eventCount])
                            events[eventCount] = {};

                        // time/date information
                        if ($caption.text() == 'Scheduled Meeting Times') {

                            // create associative array of "Scheduled Meeting Times"
                            // table
                            var compiledData = {};
                            var $tr1 = $this.find('tr').eq(0);
                            var $tr2 = $this.find('tr').eq(1);

                            $tr1.children().each(function (i) {
                                compiledData[$.trim($(this).text().toLowerCase())] = $.trim($tr2.children().eq(i).text());
                            });

                            // process recurrence
                            var byDay = [];
                            var byDayStr = compiledData['days'];

                            for (var i = 0; i < byDayStr.length; i++) {

                                var _char = byDayStr[i];

                                byDay.push(
                                    _char == 'M' ? 'MO' :
                                        _char == 'T' ? 'TU' :
                                            _char == 'W' ? 'WE' :
                                                _char == 'R' ? 'TH' :
                                                    _char == 'F' ? 'FR' : null
                                );
                            }

                            // process beginning and ending times
                            var timeExpl = compiledData['time'].split(' - '); // begin and end of class (i.e. 9:30 - 10:30)
                            var dateExpl = compiledData['date range'].split(' - '); // duration of class (i.e. Jan - Feb)

                            // converts 9:40 am -> 9:40
                            function parseTime(str) {
                                str = str.split(':');

                                var hh = Number.parseInt(str[0]);
                                var mm = Number.parseInt(str[1].split(' ')[0]);
                                var ap = str[1].split(' ')[1];

                                // convert 1pm to 13
                                if (ap == 'pm' && hh != '12')
                                    hh += 12;

                                // convert 12am to 00
                                if (ap == 'am' && hh == '12')
                                    hh -= 12;

                                return hh + ':' + mm;
                            }

                            // convert Jan 16, 2018 -> 2018 Jan 16
                            function parseDate(str) {

                                str = str.split(' ');

                                var month = str[0];
                                // trim off trailing comma
                                var day = Number.parseInt(str[1].substring(0, str[1].length - 1));
                                var year = Number.parseInt(str[2]);

                                return year + ' ' + month + ' ' + day;
                            }

                            events[eventCount]['begin'] = new Date(parseTime(timeExpl[0]) + ' ' + parseDate(dateExpl[0]));
                            events[eventCount]['end'] = new Date(parseTime(timeExpl[1]) + ' ' + parseDate(dateExpl[0]));

                            // merge into event
                            events[eventCount]['location'] = compiledData['where'];
                            events[eventCount]['description'] += '\\nType: ' + compiledData['schedule type'];

                            // get end date, but recurrence uses the "until" paradigm -- meaning
                            // to include the last recurrence, we must do this day + 1. The Date
                            // object automatically increments months and years for us.
                            var untilDate = new Date(parseTime(timeExpl[1]) + ' ' + parseDate(dateExpl[1]));
                            untilDate.setDate(untilDate.getDate() + 1);

                            events[eventCount]['rrule'] = {
                                'freq': 'WEEKLY',
                                'until': untilDate,
                                'interval': 1,
                                'byday': byDay
                            };

                            eventCount++;
                        }
                        // class information
                        else {
                            // compile table data
                            var compiledData = {};
                            console.log($this.find('tr'))
                            $this.find('tr').each(function () {
                                compiledData[$.trim($(this).children('th').text())] = $.trim($(this).children('td').text());
                            });

                            console.log(compiledData);

                            // Sample Captions
                            // Type 1   `Gen Physics I Calc - WTSN ONLY - PHYS 131 - W 1`
                            // Type 2   `Infinite Series - MATH 227 - 25`
                            var captionExpl = $caption.text().split(' - ');
                            var courseName = captionExpl[1];
                            var courseSection = captionExpl[2];

                            if (captionExpl.length > 3) {
                                courseName = captionExpl[2];
                                courseSection = captionExpl[3];
                            }

                            // remove all spaces
                            courseSection = courseSection.replace(/ /g, '');

                            // subject composed of course number and section
                            events[eventCount]['subject'] = courseName + '-' + courseSection;

                            // description composed of course full title and teacher, etc.
                            events[eventCount]['description'] =
                                'Name: ' + captionExpl[0]
                                + '\\nInstructor: ' + compiledData['Assigned Instructor:']
                                + '\\nCredits: ' + compiledData['Credits:']
                                + '\\nLevel: ' + compiledData['Level:']
                                + '\\nCampus: ' + compiledData['Campus:']
                                + '\\nCRN: ' + compiledData['CRN:']
                                + '\\nStatus: ' + compiledData['Status:'].replace(/\*/g, ''); // strip asterisks, i.e. `**Registered**`
                        }
                    });

                    // debug
                    console.debug(events);

                    if (events.length > 0) {

                        // generate ICS file
                        var cal = ics();
                        for (var i in events) {
                            var event = events[i];

                            cal.addEvent(
                                event['subject'],
                                event['description'],
                                event['location'],
                                event['begin'],
                                event['end'],
                                event['rrule']
                            )
                        }

                        cal.download('bing-schedules-export-' + $.now());

                        // all done, show help info
                        $('#ext-help').addClass('visible');
                    }
                    else {
                        // no events found
                        $('#ext-err').addClass('visible');
                    }

                    // hide initial pane
                    $('#ext-enabled').removeClass('visible');
                });

                e.preventDefault();
            });
        } else {
            $('#ext-disabled').addClass('visible');
        }
    }
    else { // i.e. chrome built-in page
        $('#ext-disabled').addClass('visible');
    }
});

// allow hrefs, chrome-extension style
$('a').click(function (e) {
    if (this.href) {
        chrome.tabs.create({url: this.href});
        e.preventDefault();
    }
});
