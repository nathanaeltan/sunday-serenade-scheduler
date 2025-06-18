import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CalendarScheduleViewProps {
  sundays: { date: string; teamId: number }[];
  getTeamById: (id: number) => { leader: string; members: string[] } | undefined;
  onShowSongs: (date: string) => void;
}

const CalendarScheduleView: React.FC<CalendarScheduleViewProps> = ({ sundays, getTeamById, onShowSongs }) => {
  // Convert sundays to a Set for quick lookup
  const sundayDates = new Set(sundays.map(s => s.date));
  const sundayMap = Object.fromEntries(sundays.map(s => [s.date, s]));

  // Helper to format date to yyyy-mm-dd
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Calendar View (Sundays Only)</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          tileContent={({ date, view }) => {
            if (view !== 'month') return null;
            const iso = formatDate(date);
            if (!sundayDates.has(iso)) return null;
            const sunday = sundayMap[iso];
            const team = getTeamById(sunday.teamId);
            return (
              <div style={{ marginTop: 4, fontSize: 12 }}>
                <div><strong>{team?.leader || 'Unassigned'}</strong></div>
                <button
                  style={{ fontSize: 10, color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); onShowSongs(iso); }}
                >
                  Songs
                </button>
              </div>
            );
          }}
          tileDisabled={({ date, view }) => {
            // Only enable Sundays that are in the sundays array
            if (view !== 'month') return true;
            const iso = formatDate(date);
            return !sundayDates.has(iso);
          }}
        />
      </CardContent>
    </Card>
  );
};

export default CalendarScheduleView; 