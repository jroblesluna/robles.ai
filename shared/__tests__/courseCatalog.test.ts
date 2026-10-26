import { expect, it } from 'vitest';
import { COURSE_IDS, courseWorkload, nextCourseStart } from '../courseCatalog';
const atNoon = (date: string) => new Date(date + 'T20:00:00Z');
it.each([
  ['2026-10-25', '2027-01-04'], ['2026-12-21', '2027-01-04'], ['2026-12-22', '2027-04-05'],
  ['2027-01-04', '2027-04-05'], ['2027-03-22', '2027-04-05'], ['2027-03-23', '2027-07-05'],
  ['2027-06-21', '2027-07-05'], ['2027-06-22', '2027-10-04'], ['2027-09-20', '2027-10-04'], ['2027-09-21', '2028-01-03'],
])('chooses the first quarterly Monday with at least 14 calendar days: %s', (today, expected) => {
  expect(nextCourseStart(atNoon(today))).toBe(expected);
});
it('uses Pacific calendar dates across UTC midnight', () => {
  expect(nextCourseStart(new Date('2026-12-22T01:00:00Z'))).toBe('2027-01-04');
  expect(nextCourseStart(new Date('2026-12-22T09:00:00Z'))).toBe('2027-04-05');
});
it('keeps the next start on a first Monday for every month of a year', () => {
  for (let month = 0; month < 12; month++) {
    const date = new Date(nextCourseStart(new Date(Date.UTC(2027, month, 15, 20))) + 'T12:00:00Z');
    expect(date.getUTCDay()).toBe(1); expect(date.getUTCDate()).toBeLessThanOrEqual(7);
    expect([0, 3, 6, 9]).toContain(date.getUTCMonth());
  }
});
it('calculates workload separately for live classes and practice', () => {
  expect(courseWorkload('openai-generative-ai')).toMatchObject({ weeks: 8, weeklyHours: 6, totalHours: 48, totalLiveHours: 24 });
  expect(courseWorkload('tensorflow-production')).toMatchObject({ weeks: 12, weeklyHours: 8, totalHours: 96, totalLiveHours: 48 });
  expect(COURSE_IDS).toHaveLength(6);
});
