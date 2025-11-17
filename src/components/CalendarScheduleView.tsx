import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
// (FullCalendar CSS is loaded via CDN in index.html)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CalendarScheduleViewProps {
  sundays: { date: string; teamId: number; isChristmas?: boolean; isEaster?: boolean; isGoodFriday?: boolean }[];
  getTeamById: (id: number) => { leader: string; members: string[] } | undefined;
  onShowSongs: (date: string) => void;
}

const CalendarScheduleView: React.FC<CalendarScheduleViewProps> = ({ sundays, getTeamById, onShowSongs }) => {
  // Prepare events for FullCalendar
  const events = sundays.map(sunday => {
    const team = getTeamById(sunday.teamId);
    let title = team?.leader || 'Unassigned';
    let backgroundColor = '#2563eb'; // default blue
    let borderColor = '#1d4ed8';
    
    if (sunday.isChristmas) {
      title = `🎄 Christmas: ${title}`;
      backgroundColor = '#f87171'; // red for Christmas
      borderColor = '#b91c1c';
    } else if (sunday.isEaster) {
      title = `🐣 Easter: ${title}`;
      backgroundColor = '#fbbf24'; // yellow for Easter
      borderColor = '#d97706';
    } else if (sunday.isGoodFriday) {
      title = `✝️ Good Friday: ${title}`;
      backgroundColor = '#7c3aed'; // purple for Good Friday
      borderColor = '#5b21b6';
    }
    
    return {
      title,
      date: sunday.date,
      backgroundColor,
      borderColor,
      textColor: '#fff',
      extendedProps: { isChristmas: sunday.isChristmas, isEaster: sunday.isEaster, isGoodFriday: sunday.isGoodFriday },
    };
  });

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Calendar View (Sundays & Special Dates)</CardTitle>
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