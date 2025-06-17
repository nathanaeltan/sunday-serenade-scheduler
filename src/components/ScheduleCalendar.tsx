
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface Team {
  id: number;
  name: string;
  leader: string;
  isActive: boolean;
  nextScheduled: string;
}

interface ScheduleCalendarProps {
  teams: Team[];
}

const ScheduleCalendar = ({ teams }: ScheduleCalendarProps) => {
  // Generate the next 8 weeks of Sundays
  const generateSundays = () => {
    const sundays = [];
    const today = new Date();
    const nextSunday = new Date(today);
    
    // Find next Sunday
    const daysUntilSunday = 7 - today.getDay();
    nextSunday.setDate(today.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));
    
    for (let i = 0; i < 8; i++) {
      const sunday = new Date(nextSunday);
      sunday.setDate(nextSunday.getDate() + (i * 7));
      sundays.push(sunday);
    }
    
    return sundays;
  };

  const sundays = generateSundays();
  
  // Determine which teams are scheduled for each Sunday
  const getScheduledTeams = (date: Date) => {
    // Simple logic: Teams 1&2 are active for first 2 weeks, then Teams 3&4
    const weekNumber = Math.floor((date.getTime() - sundays[0].getTime()) / (7 * 24 * 60 * 60 * 1000));
    const cycle = Math.floor(weekNumber / 2) % 2;
    
    if (cycle === 0) {
      return teams.filter(team => team.id === 1 || team.id === 2);
    } else {
      return teams.filter(team => team.id === 3 || team.id === 4);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Service Calendar</h2>
        <p className="text-gray-600">2-week rotation schedule for worship teams</p>
      </div>

      <Card className="bg-blue-50 border-blue-200 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Calendar className="w-5 h-5" />
            Rotation Pattern
          </CardTitle>
          <CardDescription className="text-blue-700">
            Teams serve for 2 consecutive Sundays, then take a 2-week break. This creates a balanced rotation 
            where each team serves 50% of the time.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {sundays.map((sunday, index) => {
          const scheduledTeams = getScheduledTeams(sunday);
          const isCurrentWeek = index < 2;
          
          return (
            <Card 
              key={index} 
              className={`transition-all duration-200 hover:shadow-lg ${
                isCurrentWeek ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {formatDate(sunday)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Week {index + 1} • {isCurrentWeek ? 'Current Rotation' : 'Upcoming'}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {scheduledTeams.map((team) => (
                      <Badge 
                        key={team.id} 
                        variant={isCurrentWeek ? "default" : "secondary"}
                        className="px-3 py-1"
                      >
                        {team.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {scheduledTeams.map((team) => (
                      <span key={team.id}>
                        <span className="font-medium">{team.name}:</span> {team.leader}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Team Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {teams.map((team) => (
              <div key={team.id} className="text-center">
                <Badge 
                  variant={team.isActive ? "default" : "secondary"}
                  className="mb-2"
                >
                  {team.name}
                </Badge>
                <p className="text-sm text-gray-600">
                  {team.isActive ? "Currently Serving" : "On Break"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleCalendar;
