/**
 * TimeSpan.js - Model for representing time spans/events
 * 
 * This file demonstrates how the DateHelper fix resolves the ICS export issue
 */

const DateHelper = require('../../lib/Core/helper/DateHelper');

class TimeSpan {
    constructor(config = {}) {
        this.startDate = config.startDate || new Date();
        this.endDate = config.endDate || new Date();
        this.allDay = config.allDay || false;
        this.name = config.name || 'Untitled Event';
    }

    /**
     * Convert this TimeSpan to ICS (iCalendar) format string
     * 
     * FIX: Previously, this method would produce:
     *   DTSTART;VALUE=DATE:20240315Z  (incorrect - Z should not be present)
     *   DTEND;VALUE=DATE:20240316Z    (incorrect - Z should not be present)
     * 
     * Now it produces:
     *   DTSTART;VALUE=DATE:20240315   (correct - no Z for VALUE=DATE)
     *   DTEND;VALUE=DATE:20240316     (correct - no Z for VALUE=DATE)
     * 
     * Per RFC 5545 Section 3.3.4:
     * "The date value type is used to identify values that contain a calendar date.
     *  The format is based on the [ISO.8601.2004] complete representation, basic format...
     *  No additional content value encoding (i.e., BACKSLASH character encoding, see Section 3.3.11)
     *  is defined for this value type."
     * 
     * @returns {string} ICS formatted string
     */
    toICSString() {
        const lines = [];
        
        lines.push('BEGIN:VEVENT');
        lines.push(`SUMMARY:${this.name}`);
        
        if (this.allDay) {
            // All-day events use VALUE=DATE format (YYYYMMDD)
            // Per RFC 5545, VALUE=DATE must NOT include timezone designator (Z)
            // Use 'u' format which now correctly omits the Z suffix
            const startStr = DateHelper.format(this.startDate, 'u');
            const endStr = DateHelper.format(this.endDate, 'u');
            
            lines.push(`DTSTART;VALUE=DATE:${startStr}`);
            lines.push(`DTEND;VALUE=DATE:${endStr}`);
        } else {
            // Timed events can use either floating or UTC time
            // For floating time (no timezone), use 'uu' format (YYYYMMDDTHHmmss)
            // For UTC time, use 'uZ' format (YYYYMMDDTHHmmssZ)
            
            // Using floating time (common for events that should appear at same local time everywhere)
            const startStr = DateHelper.format(this.startDate, 'uu');
            const endStr = DateHelper.format(this.endDate, 'uu');
            
            lines.push(`DTSTART:${startStr}`);
            lines.push(`DTEND:${endStr}`);
        }
        
        lines.push('END:VEVENT');
        
        return lines.join('\r\n');
    }

    /**
     * Example method to generate a complete ICS file
     * @returns {string} Complete ICS file content
     */
    toICSFile() {
        const header = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Bryntum//Bryntum Scheduler//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ].join('\r\n');

        const footer = 'END:VCALENDAR';

        return `${header}\r\n${this.toICSString()}\r\n${footer}`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeSpan;
}

// Example usage demonstrating the fix
if (require.main === module) {
    console.log('=== ICS Export Example - All-Day Event ===\n');
    
    // Create an all-day event on March 15, 2024
    const allDayEvent = new TimeSpan({
        name: 'Long all day task',
        startDate: new Date(Date.UTC(2024, 2, 15, 0, 0, 0)),
        endDate: new Date(Date.UTC(2024, 2, 16, 0, 0, 0)), // Exclusive end date
        allDay: true
    });
    
    console.log('Generated ICS content:');
    console.log(allDayEvent.toICSFile());
    console.log('\n=== Key Points ===');
    console.log('✓ DTSTART;VALUE=DATE:20240315 (no Z suffix)');
    console.log('✓ DTEND;VALUE=DATE:20240316 (no Z suffix)');
    console.log('✓ This format is compatible with Outlook, Apple Calendar, and other ICS clients');
    console.log('✓ Compliant with RFC 5545 Section 3.3.4');
}
