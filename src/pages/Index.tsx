
import { useState, useEffect } from "react";
import { Calendar, Users, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Team {
  id: number;
  name: string;
  leader: string;
}

interface WeekData {
  date: string;
  teams: number[];
}

const Index = () => {
  const [teams, setTeams] = useState<Team[]>([
    { id: 1, name: "Team Alpha", leader: "John Smith" },
    { id: 2, name: "Team Beta", leader: "Sarah Johnson" },
    { id: 3, name: "Team Gamma", leader: "Mike Wilson" },
    { id: 4, name: "Team Delta", leader: "Emily Davis" },
  ]);

  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", leader: "" });

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedTeams = localStorage.getItem('worship-teams');
    if (savedTeams) {
      setTeams(JSON.parse(savedTeams));
    }
  }, []);

  // Save teams to localStorage whenever teams change
  useEffect(() => {
    localStorage.setItem('worship-teams', JSON.stringify(teams));
  }, [teams]);

  // Generate next 8 Sundays
  const generateSundays = (): WeekData[] => {
    const sundays: WeekData[] = [];
    const today = new Date();
    const nextSunday = new Date(today);
    
    // Find next Sunday
    const daysUntilSunday = 7 - today.getDay();
    nextSunday.setDate(today.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));
    
    for (let i = 0; i < 8; i++) {
      const sunday = new Date(nextSunday);
      sunday.setDate(nextSunday.getDate() + (i * 7));
      
      // Determine which teams are scheduled (2 weeks on, 2 weeks off)
      const cycle = Math.floor(i / 2) % 2;
      const scheduledTeams = cycle === 0 ? [1, 2] : [3, 4];
      
      sundays.push({
        date: sunday.toISOString().split('T')[0],
        teams: scheduledTeams
      });
    }
    
    return sundays;
  };

  const sundays = generateSundays();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const startEditing = (team: Team) => {
    setEditingTeam(team.id);
    setEditForm({ name: team.name, leader: team.leader });
  };

  const saveChanges = (teamId: number) => {
    setTeams(teams.map(team => 
      team.id === teamId 
        ? { ...team, name: editForm.name, leader: editForm.leader }
        : team
    ));
    setEditingTeam(null);
  };

  const cancelEditing = () => {
    setEditingTeam(null);
    setEditForm({ name: "", leader: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Worship Team Schedule</h1>
          <p className="text-lg text-gray-600">Sunday service rotation - 2 weeks on, 2 weeks off</p>
        </div>

        {/* Team Management Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.map((team) => (
                <div key={team.id} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-2">
                    {editingTeam === team.id ? (
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="font-semibold"
                      />
                    ) : (
                      <h3 className="font-semibold">{team.name}</h3>
                    )}
                    
                    {editingTeam === team.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => saveChanges(team.id)}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing(team)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-xs text-gray-600">Leader</Label>
                    {editingTeam === team.id ? (
                      <Input
                        value={editForm.leader}
                        onChange={(e) => setEditForm({ ...editForm, leader: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{team.leader}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Sunday Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sundays.map((sunday, index) => {
                const scheduledTeams = teams.filter(team => sunday.teams.includes(team.id));
                const isCurrentWeek = index < 2;
                
                return (
                  <div 
                    key={sunday.date}
                    className={`p-4 border rounded-lg transition-all ${
                      isCurrentWeek ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {formatDate(sunday.date)}
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

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {scheduledTeams.map((team) => (
                          <span key={team.id}>
                            <span className="font-medium">{team.name}:</span> {team.leader}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Rotation Info */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-blue-900 mb-2">Rotation Pattern</h3>
              <p className="text-blue-700 text-sm">
                Teams 1 & 2 serve together for 2 weeks, then Teams 3 & 4 serve for 2 weeks. 
                This creates a balanced 50% service schedule for each team.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
