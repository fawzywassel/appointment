import { format, parse, addMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export class TimezoneUtil {
  /**
   * Convert a date from one timezone to another
   */
  static convertTimezone(
    date: Date,
    fromTimezone: string,
    toTimezone: string,
  ): Date {
    const zonedDate = toZonedTime(date, fromTimezone);
    return fromZonedTime(zonedDate, toTimezone);
  }

  /**
   * Get current time in a specific timezone
   */
  static getCurrentTimeInTimezone(timezone: string): Date {
    return toZonedTime(new Date(), timezone);
  }

  /**
   * Convert UTC date to specific timezone
   */
  static utcToTimezone(date: Date, timezone: string): Date {
    return toZonedTime(date, timezone);
  }

  /**
   * Convert timezone date to UTC
   */
  static timezoneToUtc(date: Date, timezone: string): Date {
    return fromZonedTime(date, timezone);
  }

  /**
   * Format date in specific timezone
   */
  static formatInTimezone(
    date: Date,
    timezone: string,
    formatStr: string = 'yyyy-MM-dd HH:mm:ss zzz',
  ): string {
    const zonedDate = toZonedTime(date, timezone);
    return format(zonedDate, formatStr);
  }

  /**
   * Check if two time ranges overlap
   */
  static doTimeRangesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date,
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Add buffer time to a date
   */
  static addBuffer(date: Date, bufferMinutes: number): Date {
    return addMinutes(date, bufferMinutes);
  }

  /**
   * Get ISO week day (1 = Monday, 7 = Sunday)
   */
  static getISOWeekDay(date: Date): number {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  }

  /**
   * Parse time string (HH:mm) and apply to date
   */
  static parseTimeString(timeStr: string, baseDate: Date = new Date()): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}
