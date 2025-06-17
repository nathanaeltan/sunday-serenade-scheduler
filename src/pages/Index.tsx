
import { useState, useEffect } from "react";
import { Calendar, Users, Edit2, Save, X, ArrowRightLeft, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Team {
  id: number;
  leader: string;
  members: string[];
}

interface WeekData {
  date: string;
  teams: number[];
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
  const [showSwapForm, setShowSwapForm] = useState(false);
  const [swapForm, setSwapForm] = useState({
    fromTeam: "",
    toTeam: "",
    date: "",
    reason: "",
    requestedBy: ""
  });

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
      
      // Check for approved swaps for this date
      const dateString = sunday.toISOString().split('T')[0];
      const approvedSwap = swapRequests.find(swap => 
        swap.date === dateString && swap.status === 'approved'
      );
      
      let scheduledTeams;
      if (approvedSwap) {
        // Apply the swap
        const cycle = Math.floor(i / 2) % 2;
        const originalTeams = cycle === 0 ? [1, 2] : [3, 4];
        const fromTeam = teams.find(t => t.leader === approvedSwap.fromTeam);
        const toTeam = teams.find(t => t.leader === approvedSwap.toTeam);
        
        if (fromTeam && toTeam) {
          scheduledTeams = originalTeams.map(id => 
            id === fromTeam.id ? toTeam.id : 
            id === toTeam.id ? fromTeam.id : id
          );
        } else {
          scheduledTeams = originalTeams;
        }
      } else {
        // Normal rotation: 2 weeks on, 2 weeks off
        const cycle = Math.floor(i / 2) % 2;
        scheduledTeams = cycle === 0 ? [1, 2] : [3, 4];
      }
      
      sundays.push({
        date: dateString,
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

  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (swapForm.fromTeam && swapForm.toTeam && swapForm.date && swapForm.requestedBy) {
      const newSwap: SwapRequest = {
        id: Date.now(),
        ...swapForm,
        status: 'pending'
      };
      setSwapRequests([...swapRequests, newSwap]);
      setSwapForm({
        fromTeam: "",
        toTeam: "",
        date: "",
        reason: "",
        requestedBy: ""
      });
      setShowSwapForm(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Worship Team Schedule</h1>
          <p className="text-lg text-gray-600">Sunday service rotation - 2 weeks on, 2 weeks off</p>
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
                                {team.leader}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="space-y-2">
                            {scheduledTeams.map((team) => (
                              <div key={team.id} className="text-sm">
                                <span className="font-medium">{team.leader}:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {team.members.map((member, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {member}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
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
              <Button onClick={() => setShowSwapForm(!showSwapForm)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Swap Request
              </Button>
            </div>

            {showSwapForm && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5" />
                    Request Team Swap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSwapSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fromTeam">From Team</Label>
                        <Select value={swapForm.fromTeam} onValueChange={(value) => setSwapForm({...swapForm, fromTeam: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team to swap from" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.leader}>
                                {team.leader}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="toTeam">To Team</Label>
                        <Select value={swapForm.toTeam} onValueChange={(value) => setSwapForm({...swapForm, toTeam: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team to swap with" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.filter(team => team.leader !== swapForm.fromTeam).map((team) => (
                              <SelectItem key={team.id} value={team.leader}>
                                {team.leader}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Service Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={swapForm.date}
                          onChange={(e) => setSwapForm({...swapForm, date: e.target.value})}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="requestedBy">Requested By</Label>
                        <Input
                          id="requestedBy"
                          value={swapForm.requestedBy}
                          onChange={(e) => setSwapForm({...swapForm, requestedBy: e.target.value})}
                          placeholder="Your name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="reason">Reason (Optional)</Label>
                      <Textarea
                        id="reason"
                        value={swapForm.reason}
                        onChange={(e) => setSwapForm({...swapForm, reason: e.target.value})}
                        placeholder="Brief explanation for the swap request..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit">Submit Request</Button>
                      <Button type="button" variant="outline" onClick={() => setShowSwapForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {swapRequests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <ArrowRightLeft className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No swap requests yet</p>
                  </CardContent>
                </Card>
              ) : (
                swapRequests.map((request) => (
                  <Card key={request.id} className={`transition-all duration-200 hover:shadow-lg ${getStatusColor(request.status)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(request.status)}
                            <h4 className="font-semibold text-lg">
                              {request.fromTeam} → {request.toTeam}
                            </h4>
                            <Badge variant="outline" className="capitalize">
                              {request.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">Date:</span> {formatDate(request.date)}</p>
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
                ))
              )}
            </div>
          </div>
        )}

        {/* Rotation Info */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-blue-900 mb-2">Rotation Pattern</h3>
              <p className="text-blue-700 text-sm">
                Teams serve for 2 consecutive weeks, then take a 2-week break. 
                Approved swaps will automatically update the Sunday schedule.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
