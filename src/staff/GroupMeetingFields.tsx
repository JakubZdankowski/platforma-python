import { meetingDays, type GroupMeeting } from '../classes/groupMeeting';

export function GroupMeetingFields({ value, required = false }: { value?: GroupMeeting; required?: boolean }) {
  return <><label className="field">Dzień tygodnia<select name="meeting_day" defaultValue={value?.meeting_day ?? ''} required={required}>
    <option value="">Wybierz dzień</option>{meetingDays.map((day, i) => <option key={day} value={i + 1}>{day}</option>)}
  </select></label><label className="field">Godzina (czas polski)<input name="meeting_time" type="time" step="60" defaultValue={value?.meeting_time?.slice(0, 5) ?? ''} required={required} /></label></>;
}
