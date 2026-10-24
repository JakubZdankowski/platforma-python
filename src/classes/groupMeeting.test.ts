import { expect, test } from 'vitest';
import { formatMeeting, meetingFromForm } from './groupMeeting';

test('meeting fields round-trip as an ISO weekday and a minute-precision local time', () => {
  const form = new FormData(); form.set('meeting_day', '2'); form.set('meeting_time', '17:30');
  expect(meetingFromForm(form)).toEqual({ meeting_day: 2, meeting_time: '17:30' });
  expect(formatMeeting({ meeting_day: 2, meeting_time: '17:30:00' })).toBe('Wtorek, 17:30');
  expect(formatMeeting({ meeting_day: null, meeting_time: null })).toBe('Termin nieustalony');
});
test('partial and invalid meeting times are rejected instead of saved ambiguously', () => {
  for (const [day, time] of [['2',''], ['', '12:00'], ['8','12:00'], ['1','24:00']]) {
    const form = new FormData(); form.set('meeting_day', day!); form.set('meeting_time', time!);
    expect(() => meetingFromForm(form)).toThrow();
  }
});
