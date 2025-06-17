
import { useState } from "react";
import { Calendar, Users, ArrowRightLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TeamManagement from "@/components/TeamManagement";
import SwapRequests from "@/components/SwapRequests";
import ScheduleCalendar from "@/components/ScheduleCalendar";

interface Team {
  id: number;
  name: string;
  leader: string;
  isActive: boolean;
  nextScheduled: string;
}

interface SwapRequest {
  id: number;
  fromTeam: string;
  toTeam: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
}

const Index = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'teams' | 'swaps' | 'calendar'>('dashboard');
  
  const [teams, setTeams] = useState<Team[]>([
    { id: 1, name: "Team Alpha", leader: "John Smith", isActive: true, nextScheduled: "2025-01-19" },
    { id: 2, name: "Team Beta", leader: "Sarah Johnson", isActive: true, nextScheduled: "2025-01-19" },
    { id: 3, name: "Team Gamma", leader: "Mike Wilson", isActive: false, nextScheduled: "2025-02-02" },
    { id: 4, name: "Team Delta", leader: "Emily Davis", isActive: false, nextScheduled: "2025-02-02" },
  ]);

  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([
    {
      id: 1,
      fromTeam: "Team Alpha",
      toTeam: "Team Gamma",
      date: "2025-01-26",
      reason: "Family commitment",
      status: 'pending',
      requestedBy: "John Smith"
    }
  ]);

  const updateTeam = (updatedTeam: Team) => {
    setTeams(teams.map(team => team.id === updatedTeam.id ? updatedTeam : team));
  };

  const addSwapRequest = (request: Omit<SwapRequest, 'id'>) => {
    const newRequest = { ...request, id: Date.now() };
    setSwapRequests([...swapRequests, newRequest]);
  };

  const updateSwapRequest = (id: number, status: 'approved' | 'rejected') => {
    setSwapRequests(swapRequests.map(req => 
      req.id === id ? { ...req, status } : req
    ));
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Worship Team Scheduler</h1>
        <p className="text-lg text-gray-600">Manage your 4 teams with 2-week rotations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {teams.map((team) => (
          <Card key={team.id} className={`transition-all duration-200 hover:shadow-lg ${team.isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <Badge variant={team.isActive ? "default" : "secondary"}>
                  {team.isActive ? "Active" : "Break"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Leader:</span> {team.leader}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Next Service:</span> {team.nextScheduled}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {swapRequests.filter(req => req.status === 'pending').length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-orange-600" />
              Pending Swap Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {swapRequests.filter(req => req.status === 'pending').map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-medium">{request.fromTeam} → {request.toTeam}</p>
                    <p className="text-sm text-gray-600">{request.date} - {request.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => updateSwapRequest(request.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => updateSwapRequest(request.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-lg shadow-sm">
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === 'teams' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('teams')}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Manage Teams
          </Button>
          <Button
            variant={activeTab === 'swaps' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('swaps')}
            className="flex items-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Swap Requests
          </Button>
          <Button
            variant={activeTab === 'calendar' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('calendar')}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Calendar
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'teams' && <TeamManagement teams={teams} onUpdateTeam={updateTeam} />}
        {activeTab === 'swaps' && (
          <SwapRequests 
            teams={teams} 
            swapRequests={swapRequests} 
            onAddSwapRequest={addSwapRequest}
            onUpdateSwapRequest={updateSwapRequest}
          />
        )}
        {activeTab === 'calendar' && <ScheduleCalendar teams={teams} />}
      </div>
    </div>
  );
};

export default Index;
