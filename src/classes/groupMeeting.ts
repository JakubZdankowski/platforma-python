export const meetingDays = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'] as const;
export type GroupMeeting = { meeting_day: number | null; meeting_time: string | null };

export function formatMeeting(group: GroupMeeting): string {
  if (group.meeting_day === null || !group.meeting_time) return 'Termin nieustalony';
  return `${meetingDays[group.meeting_day - 1]}, ${group.meeting_time.slice(0, 5)}`;
}

export function meetingFromForm(form: FormData): GroupMeeting {
  const day = String(form.get('meeting_day') ?? '');
  const time = String(form.get('meeting_time') ?? '');
  if (!day && !time) return { meeting_day: null, meeting_time: null };
  if (!/^[1-7]$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('Wybierz dzień tygodnia i godzinę zajęć.');
  }
  return { meeting_day: Number(day), meeting_time: time };
}
