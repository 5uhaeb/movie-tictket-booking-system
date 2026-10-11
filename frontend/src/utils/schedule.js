export const getScheduledStart = (date, time = '') => {
  if (!date) return null;
  const scheduled = new Date(date);
  if (Number.isNaN(scheduled.getTime())) return null;

  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return scheduled;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (match[3]) hours = (hours % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  if (hours > 23 || minutes > 59) return scheduled;
  scheduled.setHours(hours, minutes, 0, 0);
  return scheduled;
};

export const isScheduleInPast = (date, time, now = new Date()) => {
  const scheduled = getScheduledStart(date, time);
  return Boolean(scheduled && scheduled <= now);
};
