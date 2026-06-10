(function () {
  "use strict";

  var MATCH_DATA = __MATCH_DATA__;
  var OVERLAP_SET = new Set(__OVERLAP_IDS__);
  var TZ_KEY = "wc2026-timezone";

  var TZ_OPTIONS = [
    { value: "auto", label: "Auto (your device)" },
    { value: "America/Los_Angeles", label: "Pacific (PT)" },
    { value: "America/Denver", label: "Mountain (MT)" },
    { value: "America/Chicago", label: "Central (CT)" },
    { value: "America/New_York", label: "Eastern (ET)" },
    { value: "America/Anchorage", label: "Alaska" },
    { value: "Pacific/Honolulu", label: "Hawaii" },
    { value: "UTC", label: "UTC" },
    { value: "Europe/London", label: "London" },
    { value: "Europe/Berlin", label: "Central Europe" },
    { value: "Asia/Tokyo", label: "Tokyo" },
    { value: "Australia/Sydney", label: "Sydney" },
  ];

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveTz(value) {
    if (value === "auto") {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
      } catch (e) {
        return "America/Los_Angeles";
      }
    }
    return value;
  }

  function tzLabel(value) {
    if (value === "auto") return "your local time";
    var hit = TZ_OPTIONS.filter(function (o) { return o.value === value; })[0];
    return hit ? hit.label : value;
  }

  function formatInTz(utcIso, tz) {
    var d = new Date(utcIso);
    var dateLabel = d.toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    var timeLabel = d.toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    var map = {};
    for (var i = 0; i < parts.length; i++) {
      map[parts[i].type] = parts[i].value;
    }
    var dateKey = map.year + "-" + map.month + "-" + map.day;
    return { dateLabel: dateLabel, timeLabel: timeLabel, dateKey: dateKey, parts: map };
  }

  function streamLabel(m) {
    var tv = m.network === "FOX" ? "Fox" : "FS1";
    return tv + " · FOX One" + (m.tubi ? " · Tubi" : "");
  }

  function slugify(s) {
    return String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  function icsEscape(text) {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  function partsToIcs(p) {
    return p.year + p.month + p.day + "T" + p.hour + p.minute + "00";
  }

  function calendarHref(m, tz, dateLabel, timeLabel) {
    var start = formatInTz(m.utcKickoff, tz);
    var endUtc = new Date(new Date(m.utcKickoff).getTime() + 2 * 60 * 60 * 1000);
    var end = formatInTz(endUtc.toISOString(), tz);
    var desc = [
      "Watch: " + streamLabel(m),
      m.detail,
      "Kickoff: " + dateLabel + " " + timeLabel,
    ].join("\n");
    var ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//WC2026 Watch Plan//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + m.id + "@wc2026-watch-plan",
      "DTSTAMP:20260609T120000Z",
      "DTSTART;TZID=" + tz + ":" + partsToIcs(start.parts),
      "DTEND;TZID=" + tz + ":" + partsToIcs(end.parts),
      "SUMMARY:" + icsEscape(m.matchup),
      "DESCRIPTION:" + icsEscape(desc),
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
  }

  function calBtn(m, tz, dateLabel, timeLabel) {
    return (
      '<a class="cal-btn" href="' +
      calendarHref(m, tz, dateLabel, timeLabel) +
      '" download="' +
      esc(slugify(m.matchup)) +
      '.ics">Add to calendar</a>'
    );
  }

  function matchCard(m, tz, fmt) {
    var overlap = OVERLAP_SET.has(m.id);
    var cls = ["match", overlap ? "overlap" : "", m.usa ? "usa" : ""].filter(Boolean).join(" ");
    var net = m.network === "FOX" ? "fox" : "fs1";
    return (
      '<article class="' + cls + '" data-id="' + m.id + '" data-phase="' + m.phase +
      '" data-network="' + m.network + '" data-usa="' + m.usa + '" data-overlap="' + overlap +
      '" data-teams="' + esc(m.teams) + '">' +
      '<div class="match-top"><time class="kickoff">' + esc(fmt.timeLabel) +
      '</time><span class="net ' + net + '">' + (m.network === "FOX" ? "Fox" : "FS1") + "</span></div>" +
      "<h3 class=\"matchup\">" + esc(m.matchup) + "</h3>" +
      '<p class="detail">' + esc(m.detail) + " · " + esc(m.phase) + "</p>" +
      '<p class="stream">' + esc(streamLabel(m)) + "</p>" +
      calBtn(m, tz, fmt.dateLabel, fmt.timeLabel) +
      "</article>"
    );
  }

  function matchRow(m, tz, fmt) {
    var overlap = OVERLAP_SET.has(m.id);
    var cls = [overlap ? "overlap" : "", m.usa ? "usa" : ""].filter(Boolean).join(" ");
    var net = m.network === "FOX" ? "fox" : "fs1";
    return (
      '<tr class="' + cls + '" data-id="' + m.id + '" data-phase="' + m.phase +
      '" data-network="' + m.network + '" data-usa="' + m.usa + '" data-overlap="' + overlap +
      '" data-teams="' + esc(m.teams) + '">' +
      "<td>" + esc(fmt.timeLabel) + "</td><td><strong>" + esc(m.matchup) +
      '</strong><div class="detail">' + esc(m.detail) + '</div></td><td class="hide-mobile">' +
      esc(m.phase) + '</td><td><span class="net ' + net + '">' +
      (m.network === "FOX" ? "Fox" : "FS1") +
      '</span><div class="stream">' + esc(streamLabel(m)) + "</div></td><td>" +
      calBtn(m, tz, fmt.dateLabel, fmt.timeLabel) + "</td></tr>"
    );
  }

  function matchesFilter(el, phase, network, show) {
    var p = el.getAttribute("data-phase");
    var n = el.getAttribute("data-network");
    var overlap = el.getAttribute("data-overlap") === "true";
    if (phase !== "all" && p !== phase) return false;
    if (network !== "all" && n !== network) return false;
    if (show === "overlap" && !overlap) return false;
    if (show.indexOf("team:") === 0) {
      var want = show.slice(5);
      var teams = (el.getAttribute("data-teams") || "").split("|");
      if (teams.indexOf(want) === -1) return false;
    }
    return true;
  }

  function applyFilters() {
    var phase = document.getElementById("f-phase").value;
    var network = document.getElementById("f-network").value;
    var show = document.getElementById("f-show").value;
    var visible = 0;
    var days = document.querySelectorAll("details.day");
    for (var d = 0; d < days.length; d++) {
      var dayVisible = 0;
      var items = days[d].querySelectorAll(".cards .match[data-id]");
      for (var i = 0; i < items.length; i++) {
        var ok = matchesFilter(items[i], phase, network, show);
        items[i].classList.toggle("hidden", !ok);
        if (ok) dayVisible++;
      }
      days[d].classList.toggle("hidden", dayVisible === 0);
      visible += dayVisible;
    }
    document.getElementById("count-note").textContent =
      visible + " of " + MATCH_DATA.length + " matches";
  }

  function renderUsa(tz) {
    var usa = MATCH_DATA.filter(function (m) { return m.usa; });
    var cards = "";
    var rows = "";
    for (var i = 0; i < usa.length; i++) {
      var m = usa[i];
      var fmt = formatInTz(m.utcKickoff, tz);
      cards +=
        '<article class="match usa"><div class="match-top"><time class="kickoff">' +
        esc(fmt.dateLabel) + " · " + esc(fmt.timeLabel) +
        '</time></div><h3 class="matchup">' + esc(m.matchup) +
        '</h3><p class="stream">' + esc(streamLabel(m)) + "</p>" +
        calBtn(m, tz, fmt.dateLabel, fmt.timeLabel) + "</article>";
      rows +=
        '<tr class="usa"><td>' + esc(fmt.dateLabel) + "</td><td>" + esc(fmt.timeLabel) +
        "</td><td><strong>" + esc(m.matchup) + "</strong></td><td>" +
        esc(streamLabel(m)) + "</td><td>" + calBtn(m, tz, fmt.dateLabel, fmt.timeLabel) + "</td></tr>";
    }
    document.getElementById("usa-mobile").innerHTML = cards;
    document.getElementById("usa-desktop").innerHTML = rows;
  }

  function renderSchedule(tz) {
    var byDate = new Map();
    var formatted = [];
    for (var i = 0; i < MATCH_DATA.length; i++) {
      var m = MATCH_DATA[i];
      var fmt = formatInTz(m.utcKickoff, tz);
      formatted.push({ m: m, fmt: fmt });
      if (!byDate.has(fmt.dateKey)) byDate.set(fmt.dateKey, []);
      byDate.get(fmt.dateKey).push({ m: m, fmt: fmt });
    }

    var dates = Array.from(byDate.keys()).sort();
    var html = "";
    for (var d = 0; d < dates.length; d++) {
      var key = dates[d];
      var day = byDate.get(key);
      day.sort(function (a, b) {
        return new Date(a.m.utcKickoff) - new Date(b.m.utcKickoff);
      });
      var overlaps = day.filter(function (x) { return OVERLAP_SET.has(x.m.id); }).length;
      var open = day.some(function (x) { return x.m.usa || OVERLAP_SET.has(x.m.id); });
      var badge = overlaps > 0
        ? '<span class="badge warn">' + overlaps / 2 + " simultaneous</span>"
        : '<span class="badge">' + day.length + " matches</span>";
      var label = day[0].fmt.dateLabel;
      var cards = day.map(function (x) { return matchCard(x.m, tz, x.fmt); }).join("\n");
      var rows = day.map(function (x) { return matchRow(x.m, tz, x.fmt); }).join("\n");
      html +=
        '<details class="day" data-date="' + key + '"' + (open ? " open" : "") + ">" +
        '<summary><span class="day-label">' + esc(label) + "</span>" + badge + "</summary>" +
        '<div class="cards mobile-only">' + cards + "</div>" +
        '<div class="table-wrap desktop-only"><table><thead><tr><th>Kickoff</th><th>Match</th>' +
        '<th class="hide-mobile">Round</th><th>Watch</th><th>Calendar</th></tr></thead><tbody>' +
        rows + "</tbody></table></div></details>";
    }
    document.getElementById("schedule").innerHTML = html;
  }

  function renderAll() {
    var tzSelect = document.getElementById("f-tz").value;
    var tz = resolveTz(tzSelect);
    try { localStorage.setItem(TZ_KEY, tzSelect); } catch (e) {}
    document.getElementById("tz-note").textContent =
      "Kickoffs shown in " + tzLabel(tzSelect) + ".";
    renderUsa(tz);
    renderSchedule(tz);
    applyFilters();
  }

  function init() {
    var tzEl = document.getElementById("f-tz");
    var saved = "auto";
    try { saved = localStorage.getItem(TZ_KEY) || "auto"; } catch (e) {}
    if (TZ_OPTIONS.some(function (o) { return o.value === saved; })) {
      tzEl.value = saved;
    }
    tzEl.addEventListener("change", renderAll);
    ["f-phase", "f-network", "f-show"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", applyFilters);
    });
    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
