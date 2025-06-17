import { useState, useEffect } from "react";
import { Calendar, Users, Edit2, Save, X, ArrowRightLeft, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Team {
  id: number;
  leader: string;
  members: string[];
}

interface WeekData {
  date: string;
  teamId: number;
}

interface SwapRequest {
  id: number;
  fromTeamId: number;
  toTeamId: number;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
}

const Index = () => {
  const [teams, setTeams] = useState<Team[]>([
    { id: 1, leader: "John Smith", members: ["Sarah Johnson", "Mike Wilson"] },
    { id: 2, leader: "Emily Davis", members: ["Tom Brown", "Lisa Garcia"] },
    { id: 3, leader: "David Miller", members: ["Anna Taylor", "Chris Lee"] },
    { id: 4, leader: "Maria Rodriguez", members: ["James White", "Rachel Green"] },
  ]);

  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ leader: "", members: "" });
  const [activeTab, setActiveTab] = useState<'schedule' | 'swaps'>('schedule');
  const [selectedSwapFrom, setSelectedSwapFrom] = useState<{teamId: number, date: string} | null>(null);
  const [swapReason, setSwapReason] = useState("");
  const [requestedBy, setRequestedBy] = useState("");

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedTeams = localStorage.getItem('worship-teams');
    const savedSwaps = localStorage.getItem('swap-requests');
    if (savedTeams) {
      setTeams(JSON.parse(savedTeams));
    }
    if (savedSwaps) {
      setSwapRequests(JSON.parse(savedSwaps));
    }
  }, []);

  // Save data to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('worship-teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('swap-requests', JSON.stringify(swapRequests));
  }, [swapRequests]);

  // Generate next 12 Sundays with dynamic rotation
  const generateSundays = (): WeekData[] => {
    const sundays: WeekData[] = [];
    const today = new Date();
    const nextSunday = new Date(today);
    
    // Find next Sunday
    const daysUntilSunday = 7 - today.getDay();
    nextSunday.setDate(today.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));
    
    const numTeams = teams.length;
    const weeksPerCycle = numTeams * 2; // Each team gets 2 weeks on, then rotates
    
    for (let i = 0; i < 12; i++) {
      const sunday = new Date(nextSunday);
      sunday.setDate(nextSunday.getDate() + (i * 7));
      const dateString = sunday.toISOString().split('T')[0];
      
      // Check for approved swaps for this date
      const approvedSwap = swapRequests.find(swap => 
        (swap.fromDate === dateString || swap.toDate === dateString) && swap.status === 'approved'
      );
      
      let scheduledTeamId;
      if (approvedSwap) {
        // Apply the swap
        if (approvedSwap.fromDate === dateString) {
          scheduledTeamId = approvedSwap.toTeamId;
        } else {
          scheduledTeamId = approvedSwap.fromTeamId;
        }
      } else {
        // Normal rotation: each team gets 2 consecutive weeks
        const teamIndex = Math.floor(i / 2) % numTeams;
        scheduledTeamId = teams[teamIndex]?.id || 1;
      }
      
      sundays.push({
        date: dateString,
        teamId: scheduledTeamId
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
    setEditForm({ leader: team.leader, members: team.members.join(', ') });
  };

  const saveChanges = (teamId: number) => {
    setTeams(teams.map(team => 
      team.id === teamId 
        ? { 
            ...team, 
            leader: editForm.leader, 
            members: editForm.members.split(',').map(m => m.trim()).filter(m => m) 
          }
        : team
    ));
    setEditingTeam(null);
  };

  const cancelEditing = () => {
    setEditingTeam(null);
    setEditForm({ leader: "", members: "" });
  };

  const handleSwapSelect = (teamId: number, date: string) => {
    console.log('Swap select clicked:', { teamId, date, selectedSwapFrom, requestedBy });
    
    if (selectedSwapFrom && selectedSwapFrom.teamId === teamId && selectedSwapFrom.date === date) {
      // Deselect if clicking the same date
      console.log('Deselecting same date');
      setSelectedSwapFrom(null);
    } else if (selectedSwapFrom) {
      // Complete the swap if a different date is selected and name is provided
      console.log('Attempting to complete swap');
      if (!requestedBy.trim()) {
        alert('Please enter your name before completing the swap request.');
        return;
      }
      
      const newSwap: SwapRequest = {
        id: Date.now(),
        fromTeamId: selectedSwapFrom.teamId,
        toTeamId: teamId,
        fromDate: selectedSwapFrom.date,
        toDate: date,
        reason: swapReason,
        status: 'pending',
        requestedBy: requestedBy
      };
      
      console.log('Creating new swap:', newSwap);
      setSwapRequests([...swapRequests, newSwap]);
      setSelectedSwapFrom(null);
      setSwapReason("");
      setRequestedBy("");
    } else {
      // Select the first date for swapping
      console.log('Selecting first date for swap');
      setSelectedSwapFrom({ teamId, date });
    }
  };

  const updateSwapStatus = (id: number, status: 'approved' | 'rejected') => {
    setSwapRequests(swapRequests.map(swap => 
      swap.id === id ? { ...swap, status } : swap
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const getTeamById = (id: number) => teams.find(team => team.id === id);

  const isDateInSwapSelection = (teamId: number, date: string) => {
    return selectedSwapFrom?.teamId === teamId && selectedSwapFrom?.date === date;
  };

  const canSwapWith = (teamId: number, date: string) => {
    if (!selectedSwapFrom) return false;
    // Can swap with different teams only, and not the same date
    return selectedSwapFrom.teamId !== teamId && selectedSwapFrom.date !== date;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Worship Team Schedule</h1>
          <p className="text-lg text-gray-600">Sunday service rotation - Each team serves 2 weeks, then rotates</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white rounded-lg p-1 shadow-sm">
            <Button
              variant={activeTab === 'schedule' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('schedule')}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </Button>
            <Button
              variant={activeTab === 'swaps' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('swaps')}
              className="flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Swap Requests
            </Button>
          </div>
        </div>

        {activeTab === 'schedule' && (
          <>
            {/* Team Management Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Band Leaders & Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((team) => (
                    <div key={team.id} className="p-4 border rounded-lg bg-white">
                      <div className="flex items-center justify-between mb-2">
                        {editingTeam === team.id ? (
                          <Input
                            value={editForm.leader}
                            onChange={(e) => setEditForm({ ...editForm, leader: e.target.value })}
                            className="font-semibold"
                          />
                        ) : (
                          <h3 className="font-semibold">{team.leader}</h3>
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
                        <Label className="text-xs text-gray-600">Members</Label>
                        {editingTeam === team.id ? (
                          <Textarea
                            value={editForm.members}
                            onChange={(e) => setEditForm({ ...editForm, members: e.target.value })}
                            placeholder="Enter member names separated by commas"
                            className="mt-1"
                            rows={2}
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {team.members.map((member, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {member}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Visual Swap Interface */}
            {selectedSwapFrom && (
              <Card className="mb-8 border-blue-300 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <ArrowRightLeft className="w-5 h-5" />
                    Select Sunday to Swap With
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-blue-800">
                      Selected: <strong>{getTeamById(selectedSwapFrom.teamId)?.leader}</strong> on{' '}
                      <strong>{formatDate(selectedSwapFrom.date)}</strong>
                    </p>
                    <p className="text-sm text-blue-700">
                      Click on another Sunday to complete the swap request. Make sure to enter your name below first!
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="requestedBy">Your Name *</Label>
                        <Input
                          id="requestedBy"
                          value={requestedBy}
                          onChange={(e) => setRequestedBy(e.target.value)}
                          placeholder="Enter your name"
                          required
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reason">Reason (Optional)</Label>
                        <Input
                          id="reason"
                          value={swapReason}
                          onChange={(e) => setSwapReason(e.target.value)}
                          placeholder="Brief reason for swap"
                          className="bg-white"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedSwapFrom(null);
                        setSwapReason("");
                        setRequestedBy("");
                      }}
                      className="mt-2"
                    >
                      Cancel Swap
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Calendar Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Sunday Schedule
                  {selectedSwapFrom && (
                    <span className="text-sm font-normal text-blue-600 ml-2">
                      (Click a different Sunday to swap with)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sundays.map((sunday, index) => {
                    const scheduledTeam = getTeamById(sunday.teamId);
                    const isCurrentWeek = index < 2;
                    const isSelected = isDateInSwapSelection(sunday.teamId, sunday.date);
                    const canSwap = canSwapWith(sunday.teamId, sunday.date);
                    
                    return (
                      <div 
                        key={sunday.date}
                        className={`p-4 border rounded-lg transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-100' 
                            : canSwap
                            ? 'border-green-300 bg-green-50 hover:bg-green-100'
                            : isCurrentWeek 
                            ? 'border-green-300 bg-green-50' 
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => handleSwapSelect(sunday.teamId, sunday.date)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {formatDate(sunday.date)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Week {index + 1} • {isCurrentWeek ? 'Current Rotation' : 'Upcoming'}
                              {isSelected && <span className="text-blue-600 font-medium"> • Selected for Swap</span>}
                              {canSwap && <span className="text-green-600 font-medium"> • Click to Swap</span>}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={isCurrentWeek ? "default" : "secondary"}
                              className="px-3 py-1"
                            >
                              {scheduledTeam?.leader}
                            </Badge>
                          </div>
                        </div>

                        {scheduledTeam && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-sm">
                              <span className="font-medium">{scheduledTeam.leader}:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {scheduledTeam.members.map((member, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {member}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'swaps' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Swap Requests</h3>
            </div>

            <div className="space-y-4">
              {swapRequests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <ArrowRightLeft className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No swap requests yet</p>
                    <p className="text-sm text-gray-500 mt-2">Use the visual calendar to request swaps</p>
                  </CardContent>
                </Card>
              ) : (
                swapRequests.map((request) => {
                  const fromTeam = getTeamById(request.fromTeamId);
                  const toTeam = getTeamById(request.toTeamId);
                  
                  return (
                    <Card key={request.id} className={`transition-all duration-200 hover:shadow-lg ${getStatusColor(request.status)}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusIcon(request.status)}
                              <h4 className="font-semibold text-lg">
                                {fromTeam?.leader} ↔ {toTeam?.leader}
                              </h4>
                              <Badge variant="outline" className="capitalize">
                                {request.status}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">From:</span> {formatDate(request.fromDate)}</p>
                              <p><span className="font-medium">To:</span> {formatDate(request.toDate)}</p>
                              <p><span className="font-medium">Requested by:</span> {request.requestedBy}</p>
                              {request.reason && (
                                <p><span className="font-medium">Reason:</span> {request.reason}</p>
                              )}
                            </div>
                          </div>

                          {request.status === 'pending' && (
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => updateSwapStatus(request.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateSwapStatus(request.id, 'rejected')}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Rotation Info */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-blue-900 mb-2">Dynamic Rotation Pattern</h3>
              <p className="text-blue-700 text-sm">
                Each team serves for 2 consecutive weeks, then rotates to the next team. 
                With {teams.length} teams, each team gets {Math.floor(100 / teams.length)}% of the Sundays.
                Click on Sundays in the schedule to request swaps visually.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
