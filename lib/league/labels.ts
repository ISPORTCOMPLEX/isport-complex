export const TEAM_STATUS: Record<string, { label: string; tone: 'ok' | 'warn' | 'red' | 'muted' }> = {
  PENDING: { label: 'Čaká na schválenie', tone: 'warn' },
  APPROVED: { label: 'Schválený', tone: 'ok' },
  REJECTED: { label: 'Zamietnutý', tone: 'muted' },
};
export const GOAL_KIND: Record<string, string> = { EV: 'Bežný', PP: 'Presilovka', SH: 'Oslabenie', EN: 'Prázdna bránka', PS: 'Trestné strieľanie' };
export const POSITION: Record<string, string> = { F: 'Útočník', D: 'Obranca', G: 'Brankár' };
