import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
// (FullCalendar CSS is loaded via CDN in index.html)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CalendarScheduleViewProps {
  sundays: { date: string; teamId: number; isChristmas?: boolean }[];
  getTeamById: (id: number) => { leader: string; members: string[] } | undefined;
  onShowSongs: (date: string) => void;
}

const CalendarScheduleView: React.FC<CalendarScheduleViewProps> = ({ sundays, getTeamById, onShowSongs }) => {
  // Prepare events for FullCalendar
  const events = sundays.map(sunday => {
    const team = getTeamById(sunday.teamId);
    return {
      title: sunday.isChristmas
        ? `🎄 Christmas: ${team?.leader || 'Unassigned'}`
        : team?.leader || 'Unassigned',
      date: sunday.date,
      backgroundColor: sunday.isChristmas ? '#f87171' : '#2563eb', // red for Christmas, blue for others
      borderColor: sunday.isChristmas ? '#b91c1c' : '#1d4ed8',
      textColor: '#fff',
      extendedProps: { isChristmas: sunday.isChristmas },
    };
  });

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Calendar View (Sundays & Christmas)</CardTitle>
      </CardHeader>
      <CardContent>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={info => {
            info.jsEvent.preventDefault();
            onShowSongs(info.event.startStr);
          }}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
          height="auto"
          dayMaxEventRows={1}
          displayEventTime={false}
        />
      </CardContent>
    </Card>
  );
};

export default CalendarScheduleView; 