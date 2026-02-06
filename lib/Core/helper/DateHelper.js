/**
 * DateHelper - Utility class for date formatting and manipulation
 * 
 * This fix addresses the ICS export issue where all-day events were incorrectly
 * formatted with a 'Z' (UTC designator) suffix, causing import issues in Outlook.
 */
class DateHelper {
    /**
     * Format a date according to the specified format string
     * @param {Date} date - The date to format
     * @param {string} format - Format string (e.g., 'u' for YYYYMMDD, 'uu' for YYYYMMDDTHHmmss)
     * @returns {string} Formatted date string
     */
    static format(date, format) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            throw new Error('Invalid date provided');
        }

        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        switch (format) {
            case 'u':
                // Date-only format for all-day events (VALUE=DATE in ICS)
                // Per RFC 5545, VALUE=DATE should NOT include timezone designator
                // Format: YYYYMMDD (no 'Z' suffix)
                return `${year}${month}${day}`;
            
            case 'uu':
                // Date-time format without timezone for floating time (VALUE=DATE-TIME in ICS)
                // Per RFC 5545, floating date-times should NOT include timezone designator
                // Format: YYYYMMDDTHHmmss (no 'Z' suffix)
                return `${year}${month}${day}T${hours}${minutes}${seconds}`;
            
            case 'uZ':
                // Date-time format WITH UTC timezone designator
                // Use this when you explicitly need UTC timezone
                // Format: YYYYMMDDTHHmmssZ (with 'Z' suffix)
                return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
            
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DateHelper;
}
