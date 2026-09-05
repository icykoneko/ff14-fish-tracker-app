// Shared helpers for calendar event exports.

let CalendarExport = function() {
  const encoder = new TextEncoder();

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatEorzeaHour(hour) {
    if (hour === 24) return '24:00';
    const wholeHour = Math.floor(hour);
    const minutes = Math.round((hour - wholeHour) * 60);
    return pad2(wholeHour) + ':' + pad2(minutes);
  }

  function describeWeather(fish) {
    const previous = _(fish.conditions.previousWeatherSet).map(weather => __p(weather, 'name'));
    const current = _(fish.conditions.weatherSet).map(weather => __p(weather, 'name'));

    if (previous.length > 0) {
      return previous.join(' / ') + ' -> ' + (current.length ? current.join(' / ') : 'any weather');
    }

    return current.length ? current.join(' / ') : 'Any weather';
  }

  function describeBait(fish) {
    const tugIndicators = {
      light: '(!)',
      medium: '(!!)',
      heavy: '(!!!)'
    };

    const catchPath = fish.bestCatchPath || [];
    return _(catchPath).map((step, index) => {
      const itemIds = Array.isArray(step) ? step : [step];

      const names = _(itemIds).map(itemId => {
        const item = DATA.ITEMS[itemId];
        return item ? __p(item, 'name') : String(itemId);
      }).join(' / ');

      const nextStep = catchPath[index + 1];
      const nextFishId = Array.isArray(nextStep) ? nextStep[0] : nextStep;
      const nextTug = index === catchPath.length - 1
          ? tugIndicators[fish.tug]
          : DATA.FISH[nextFishId] && tugIndicators[DATA.FISH[nextFishId].tug];

      return nextTug ? names + ' ' + nextTug : names;
    }).join(' -> ');
  }

  function describeEorzeaTime(fish) {
    return fish.startHour === 0 && fish.endHour === 24
        ? 'All day ET'
        : formatEorzeaHour(fish.startHour) + '-' + formatEorzeaHour(fish.endHour) + ' ET';
  }

  function buildFishEvent(fish, targetRange) {
    if (!fish || !targetRange) {
      return null;
    }

    const intuitionFish = fish.intuitionFish || [];

    // Preparation data is required for intuition fish
    if (intuitionFish.length > 0 && targetRange.preparationStart === undefined) {
      return null;
    }

    const preparation = fishWatcher.getPrepFor(fish, targetRange);
    const prerequisites = _(intuitionFish).map(predator => {
      const predatorFish = predator.data;

      return {
        name: predatorFish.name,
        count: predator.count,
        time: describeEorzeaTime(predatorFish),
        weather: describeWeather(predatorFish),
        bait: describeBait(predatorFish)
      };
    });

    const locationParts = [fish.location.zoneName, fish.location.name].filter(Boolean);
    const hasIntuition = prerequisites.length > 0;
    const description = hasIntuition
        ? ['Target: ' + fish.name + ' - ' + describeEorzeaTime(fish), 'Weather: ' + describeWeather(fish)]
        : ['Eorzea time: ' + (fish.startHour === 0 && fish.endHour === 24
            ? 'All day'
            : describeEorzeaTime(fish)), 'Weather: ' + describeWeather(fish)];

    const bait = describeBait(fish);
    if (bait) {
      description.push('Bait: ' + bait);
    }

    if (fish.video && fish.video.youtube) {
      description.push('Video guide: https://youtu.be/' + fish.video.youtube);
    }

    if (hasIntuition) {
      description.push(""); // Line break
      description.push("Intuition Requirements:");
      _(prerequisites).each(prerequisite => {
        let requirement = prerequisite.count + 'x ' + prerequisite.name + ' - ' + prerequisite.time +
            ' - Weather: ' + prerequisite.weather;
        if (prerequisite.bait) {
          requirement += ' - Bait: ' + prerequisite.bait;
        }
        description.push(requirement);
      });
      description.push('The calendar event starts when intuition fish are available.');
      description.push(""); // Line break
    }

    if (preparation.moochFish !== null) {
      description.push('The calendar event starts when ' + preparation.moochFish.name +
          ' is available.');
    }
    description.push('Patch: ' + fish.patch);

    // Just checking to ensure we're actually exporting a REAL fish
    const fishId = (fish.id & 0x80000000) !== 0 && fish.origId !== undefined
        ? fish.origId
        : fish.id;
    return {
      fishId: fishId,
      title: fish.name + ' window',
      start: eorzeaTime.toEarth(preparation.start),
      end: eorzeaTime.toEarth(+targetRange.end),
      targetStart: eorzeaTime.toEarth(+targetRange.start),
      location: locationParts.join(' - '),
      description: description.join('\n')
    };
  }

  function formatUtcCalendarDate(timestamp) {
    return new Date(timestamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function escapeCalendarText(value) {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\r?\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,');
  }

  function foldCalendarLine(line) {
    const folded = [];
    let current = '';
    let currentBytes = 0;

    for (const character of line) {
      const characterBytes = encoder.encode(character).length;
      const byteLimit = folded.length === 0 ? 75 : 74;

      if (current && currentBytes + characterBytes > byteLimit) {
        folded.push(current);
        current = ' ' + character;
        currentBytes = 1 + characterBytes;
      } else {
        current += character;
        currentBytes += characterBytes;
      }
    }
    if (current) folded.push(current);
    return folded.join('\r\n');
  }

  function serializeICalendar(event) {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FFXIV Fish Tracker//Next Fish Window//EN',
      'BEGIN:VEVENT',
      'UID:ffxiv-fish-' + event.fishId + '-' + event.start + '@fish-tracker',
      'DTSTAMP:' + formatUtcCalendarDate(Date.now()),
      'DTSTART:' + formatUtcCalendarDate(event.start),
      'DTEND:' + formatUtcCalendarDate(event.end),
      'SUMMARY:' + escapeCalendarText(event.title)
    ];

    if (event.location) lines.push('LOCATION:' + escapeCalendarText(event.location));
    if (event.description) {
      lines.push('DESCRIPTION:' + escapeCalendarText(event.description));
    }
    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');
    return _(lines).map(foldCalendarLine).join('\r\n') + '\r\n';
  }

  function createGoogleCalendarUrl(event) {
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', event.title);
    url.searchParams.set('dates', formatUtcCalendarDate(event.start) + '/' + formatUtcCalendarDate(event.end));
    if (event.description) url.searchParams.set('details', event.description);
    if (event.location) url.searchParams.set('location', event.location);
    return url.toString();
  }

  function downloadICalendar(event, filename) {
    const contents = serializeICalendar(event);
    const blob = new Blob([contents], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    buildFishEvent: buildFishEvent,
    createGoogleCalendarUrl: createGoogleCalendarUrl,
    downloadICalendar: downloadICalendar
  };
}();
