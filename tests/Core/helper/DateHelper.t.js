/**
 * DateHelper.t.js - Test suite for DateHelper
 * 
 * Tests the fix for ICS export issue with all-day events
 * Issue: All-day events were exported with 'Z' suffix, causing import errors in Outlook
 * Fix: Remove 'Z' suffix from 'u' and 'uu' formats per RFC 5545
 */

const DateHelper = require('../../../lib/Core/helper/DateHelper');

describe('DateHelper', () => {
    describe('format method', () => {
        let testDate;

        beforeEach(() => {
            // Create a test date: 2024-03-15 14:30:45 UTC
            testDate = new Date(Date.UTC(2024, 2, 15, 14, 30, 45));
        });

        describe('u format (date-only for VALUE=DATE)', () => {
            it('should format date without timezone indicator', () => {
                const result = DateHelper.format(testDate, 'u');
                expect(result).toBe('20240315');
            });

            it('should not include Z suffix', () => {
                const result = DateHelper.format(testDate, 'u');
                expect(result).not.toContain('Z');
            });

            it('should have exactly 8 characters (YYYYMMDD)', () => {
                const result = DateHelper.format(testDate, 'u');
                expect(result.length).toBe(8);
            });

            it('should format correctly for different dates', () => {
                const date1 = new Date(Date.UTC(2024, 0, 1, 0, 0, 0)); // Jan 1, 2024
                const date2 = new Date(Date.UTC(2024, 11, 31, 23, 59, 59)); // Dec 31, 2024
                
                expect(DateHelper.format(date1, 'u')).toBe('20240101');
                expect(DateHelper.format(date2, 'u')).toBe('20241231');
            });
        });

        describe('uu format (date-time for VALUE=DATE-TIME floating)', () => {
            it('should format date-time without timezone indicator', () => {
                const result = DateHelper.format(testDate, 'uu');
                expect(result).toBe('20240315T143045');
            });

            it('should not include Z suffix', () => {
                const result = DateHelper.format(testDate, 'uu');
                expect(result).not.toContain('Z');
            });

            it('should have exactly 15 characters (YYYYMMDDTHHmmss)', () => {
                const result = DateHelper.format(testDate, 'uu');
                expect(result.length).toBe(15);
            });

            it('should include T separator between date and time', () => {
                const result = DateHelper.format(testDate, 'uu');
                expect(result).toContain('T');
                expect(result.indexOf('T')).toBe(8); // T should be at position 8
            });

            it('should format correctly for different date-times', () => {
                const date1 = new Date(Date.UTC(2024, 0, 1, 9, 15, 30)); // Jan 1, 2024 09:15:30
                const date2 = new Date(Date.UTC(2024, 11, 31, 23, 59, 59)); // Dec 31, 2024 23:59:59
                
                expect(DateHelper.format(date1, 'uu')).toBe('20240101T091530');
                expect(DateHelper.format(date2, 'uu')).toBe('20241231T235959');
            });
        });

        describe('uZ format (explicit UTC with Z suffix)', () => {
            it('should format date-time with Z suffix when explicitly requested', () => {
                const result = DateHelper.format(testDate, 'uZ');
                expect(result).toBe('20240315T143045Z');
            });

            it('should include Z suffix', () => {
                const result = DateHelper.format(testDate, 'uZ');
                expect(result).toEndWith('Z');
            });
        });

        describe('RFC 5545 compliance', () => {
            it('u format should produce valid VALUE=DATE format per RFC 5545', () => {
                // Per RFC 5545 Section 3.3.4, VALUE=DATE must not have time or timezone
                const result = DateHelper.format(testDate, 'u');
                expect(result).toMatch(/^\d{8}$/); // Exactly 8 digits, nothing else
            });

            it('uu format should produce valid floating DATE-TIME format per RFC 5545', () => {
                // Per RFC 5545 Section 3.3.5, floating date-time has no UTC designator
                const result = DateHelper.format(testDate, 'uu');
                expect(result).toMatch(/^\d{8}T\d{6}$/); // YYYYMMDDTHHmmss format
                expect(result).not.toMatch(/Z$/); // No Z at the end
            });
        });

        describe('edge cases', () => {
            it('should throw error for invalid date', () => {
                expect(() => DateHelper.format(null, 'u')).toThrow('Invalid date provided');
                expect(() => DateHelper.format(undefined, 'u')).toThrow('Invalid date provided');
                expect(() => DateHelper.format('not a date', 'u')).toThrow('Invalid date provided');
            });

            it('should throw error for unsupported format', () => {
                expect(() => DateHelper.format(testDate, 'invalid')).toThrow('Unsupported format');
            });

            it('should handle midnight correctly', () => {
                const midnight = new Date(Date.UTC(2024, 2, 15, 0, 0, 0));
                expect(DateHelper.format(midnight, 'u')).toBe('20240315');
                expect(DateHelper.format(midnight, 'uu')).toBe('20240315T000000');
            });

            it('should handle end of day correctly', () => {
                const endOfDay = new Date(Date.UTC(2024, 2, 15, 23, 59, 59));
                expect(DateHelper.format(endOfDay, 'u')).toBe('20240315');
                expect(DateHelper.format(endOfDay, 'uu')).toBe('20240315T235959');
            });
        });

        describe('ICS export use case', () => {
            it('should format all-day event start date correctly for ICS', () => {
                // All-day event on March 15, 2024
                const allDayStart = new Date(Date.UTC(2024, 2, 15, 0, 0, 0));
                const result = DateHelper.format(allDayStart, 'u');
                
                // Should produce: DTSTART;VALUE=DATE:20240315 (not 20240315Z)
                expect(result).toBe('20240315');
                expect(result).not.toContain('Z');
            });

            it('should format all-day event end date correctly for ICS', () => {
                // All-day event ending on March 16, 2024 (exclusive end date)
                const allDayEnd = new Date(Date.UTC(2024, 2, 16, 0, 0, 0));
                const result = DateHelper.format(allDayEnd, 'u');
                
                // Should produce: DTEND;VALUE=DATE:20240316 (not 20240316Z)
                expect(result).toBe('20240316');
                expect(result).not.toContain('Z');
            });
        });
    });
});

console.log('DateHelper test suite loaded. Run with Jest or similar test runner.');
