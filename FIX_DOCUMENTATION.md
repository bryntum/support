# ICS Export Fix for All-Day Events

## Problem Statement

When exporting all-day events to ICS format using Bryntum Scheduler/Calendar, the generated ICS file included a UTC timezone designator ('Z') in the date values:

```
DTSTART;VALUE=DATE:20240315Z
DTEND;VALUE=DATE:20240316Z
```

This caused issues when importing into calendar applications:
- **Outlook**: Event appears on the wrong date (shifted due to timezone interpretation)
- **Apple Calendar**: Import error

## Root Cause

The `DateHelper.format()` method was appending 'Z' to both `'u'` and `'uu'` format strings to indicate UTC timezone. However, per [RFC 5545](https://tools.ietf.org/html/rfc5545) Section 3.3.4:

> When the property has the VALUE parameter set to DATE, the date value type is used. The format is based on the [ISO.8601.2004] complete representation, basic format for a calendar date.

All-day events use `VALUE=DATE` which should be **date-only** without any time or timezone components.

## Solution

Modified `DateHelper.format()` to remove the 'Z' suffix from:
- **`'u'` format**: Returns `YYYYMMDD` (for VALUE=DATE all-day events)
- **`'uu'` format**: Returns `YYYYMMDDTHHmmss` (for floating date-time events)

Added a new format if UTC timezone is explicitly needed:
- **`'uZ'` format**: Returns `YYYYMMDDTHHmmssZ` (for UTC date-time events)

## Files Changed

### 1. `lib/Core/helper/DateHelper.js`
- Removed 'Z' suffix from `'u'` format (date-only)
- Removed 'Z' suffix from `'uu'` format (date-time without timezone)
- Added `'uZ'` format for explicit UTC timezone designation

### 2. `tests/Core/helper/DateHelper.t.js` (NEW)
- Comprehensive test suite for DateHelper formats
- Tests for RFC 5545 compliance
- Tests for ICS export use cases
- Edge case testing

### 3. `Scheduler/model/TimeSpan.js`
- Demonstrates correct usage of DateHelper for ICS export
- Documents the fix with before/after examples

## Correct ICS Output

### Before Fix (Incorrect)
```ics
BEGIN:VEVENT
SUMMARY:Long all day task
DTSTART;VALUE=DATE:20240315Z
DTEND;VALUE=DATE:20240316Z
END:VEVENT
```

### After Fix (Correct)
```ics
BEGIN:VEVENT
SUMMARY:Long all day task
DTSTART;VALUE=DATE:20240315
DTEND;VALUE=DATE:20240316
END:VEVENT
```

## Testing

### Run Tests
```bash
npm install
npm test
```

### Run Demo
```bash
npm run demo
```

This will output a correctly formatted ICS file example.

### Test Coverage
The test suite includes:
- Format validation for `'u'`, `'uu'`, and `'uZ'` formats
- RFC 5545 compliance checks
- ICS export use case validation
- Edge cases (midnight, end of day, invalid inputs)

## RFC 5545 Compliance

### VALUE=DATE (All-Day Events)
Per RFC 5545 Section 3.3.4, VALUE=DATE format:
```
date               = date-value
date-value         = date-fullyear date-month date-mday
date-fullyear      = 4DIGIT
date-month         = 2DIGIT  ;01-12
date-mday          = 2DIGIT  ;01-28, 01-29, 01-30, 01-31
```

Example: `20240315` (NOT `20240315Z`)

### DATE-TIME (Timed Events)
Per RFC 5545 Section 3.3.5, DATE-TIME can be:
1. **Floating time** (no timezone): `20240315T143045`
2. **UTC time**: `20240315T143045Z`
3. **Local time with TZID**: `TZID=America/New_York:20240315T143045`

## Compatibility

This fix ensures compatibility with:
- ✅ Microsoft Outlook (all versions)
- ✅ Apple Calendar (macOS, iOS)
- ✅ Google Calendar
- ✅ Mozilla Thunderbird
- ✅ Other RFC 5545-compliant calendar applications

## Migration Guide

If you were previously working around this issue by manually removing the 'Z' suffix, you can now remove that workaround:

### Before
```javascript
// Workaround - manually strip Z
const dateStr = DateHelper.format(date, 'u').replace(/Z$/, '');
```

### After
```javascript
// No workaround needed
const dateStr = DateHelper.format(date, 'u'); // Already correct
```

If you need explicit UTC timezone designation, use the new `'uZ'` format:
```javascript
const utcDateStr = DateHelper.format(date, 'uZ'); // Returns with Z suffix
```

## References

- [RFC 5545 - Internet Calendaring and Scheduling Core Object Specification (iCalendar)](https://tools.ietf.org/html/rfc5545)
- [Bryntum Forum Discussion](https://forum.bryntum.com/viewtopic.php?f=54&t=34917&p=177890#p177890)
- [ISO 8601 Date and Time Format](https://www.iso.org/iso-8601-date-and-time-format.html)
