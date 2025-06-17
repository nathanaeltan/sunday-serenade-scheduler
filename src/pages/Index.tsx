import { useState, useEffect } from "react";
import { 
  Calendar, 
  Users, 
  Edit2, 
  Save, 
  X, 
  ArrowRightLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  saveTeams, 
  saveSwapRequests, 
  saveManualOverrides, 
  updateSwapRequestStatus,
  subscribeToTeams, 
  subscribeToSwapRequests, 
  subscribeToManualOverrides,
  getAllData,
  type Team,
  type SwapRequest
} from "@/lib/firebaseService";

interface WeekData {
  date: string;
  teamId: number;
}

const Index = () => {
  // Default teams array
  const defaultTeams: Team[] = [
    { id: 1, leader: "John Smith", members: ["Sarah Johnson", "Mike Wilson"] },
    { id: 2, leader: "Emily Davis", members: ["Tom Brown", "Lisa Garcia"] },
    { id: 3, leader: "David Miller", members: ["Anna Taylor", "Chris Lee"] },
    { id: 4, leader: "Maria Rodriguez", members: ["James White", "Rachel Green"] },
  ];

  // State management
  const [teams, setTeams] = useState<Team[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [manualOverrides, setManualOverrides] = useState<{[date: string]: number}>({});
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'schedule' | 'swaps'>('schedule');
  const [isManualMode, setIsManualMode] = useState(false);
  const [selectedSwapFrom, setSelectedSwapFrom] = useState<{teamId: number, date: string} | null>(null);
  const [showTeamSelector, setShowTeamSelector] = useState<{date: string, teamId: number} | null>(null);
  
  // Team editing state
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ leader: "", members: "" });

  // Confirmation dialog states
  const [showManualConfirmation, setShowManualConfirmation] = useState<{
    date: string;
    currentTeamId: number;
    newTeamId: number;
  } | null>(null);
  const [showSwapConfirmation, setShowSwapConfirmation] = useState<{
    fromTeamId: number;
    toTeamId: number;
    fromDate: string;
    toDate: string;
  } | null>(null);

  // ===== DATA LOADING & FIREBASE EFFECTS =====
  
  // Load data from Firebase on component mount
  useEffect(() => {
    const loadDataFromFirebase = async () => {
      try {
        const data = await getAllData();
        setTeams(data.teams && data.teams.length > 0 ? data.teams : defaultTeams);
        setSwapRequests(data.swapRequests);
        setManualOverrides(data.manualOverrides);
        setIsFirebaseConnected(true);
      } catch (error) {
        console.error('Error loading data from Firebase:', error);
        setIsFirebaseConnected(false);
        // Fallback to localStorage if Firebase fails
        const savedTeams = localStorage.getItem('worship-teams');
        const savedSwaps = localStorage.getItem('swap-requests');
        const savedManualOverrides = localStorage.getItem('manual-overrides');
        
        if (savedTeams) {
          const parsedTeams = JSON.parse(savedTeams);
          setTeams(parsedTeams && parsedTeams.length > 0 ? parsedTeams : defaultTeams);
        } else {
          setTeams(defaultTeams);
        }
        if (savedSwaps) {
          setSwapRequests(JSON.parse(savedSwaps));
        }
        if (savedManualOverrides) {
          setManualOverrides(JSON.parse(savedManualOverrides));
        }
      } finally {
        setDataLoaded(true);
      }
    };
    loadDataFromFirebase();
  }, []);

  // Set up real-time Firebase listeners
  useEffect(() => {
    const unsubscribeTeams = subscribeToTeams((newTeams) => {
      setTeams(newTeams);
    });

    const unsubscribeSwapRequests = subscribeToSwapRequests((newSwapRequests) => {
      setSwapRequests(newSwapRequests);
    });

    const unsubscribeManualOverrides = subscribeToManualOverrides((newManualOverrides) => {
      setManualOverrides(newManualOverrides);
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeTeams();
      unsubscribeSwapRequests();
      unsubscribeManualOverrides();
    };
  }, []);

  // Save data to Firebase when it changes
  useEffect(() => {
    if (!dataLoaded) return;
    if (!teams || teams.length === 0) return;
    saveTeams(teams);
  }, [teams, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    if (!swapRequests) return;
    saveSwapRequests(swapRequests);
  }, [swapRequests, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    if (!manualOverrides) return;
    saveManualOverrides(manualOverrides);
  }, [manualOverrides, dataLoaded]);

  // ===== SCHEDULE GENERATION =====
  
  // Generate next 12 Sundays with dynamic rotation
  const generateSundays = (): WeekData[] => {
    const sundays: WeekData[] = [];
    const today = new Date();
    const nextSunday = new Date(today);
    
    // Find next Sunday
    const daysUntilSunday = 7 - today.getDay();
    nextSunday.setDate(today.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));
    
    const numTeams = teams.length;
    
    for (let i = 0; i < 12; i++) {
      const sunday = new Date(nextSunday);
      sunday.setDate(nextSunday.getDate() + (i * 7));
      const dateString = sunday.toISOString().split('T')[0];
      
      // Check for manual override first
      if (manualOverrides[dateString]) {
        sundays.push({
          date: dateString,
          teamId: manualOverrides[dateString]
        });
        continue;
      }
      
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

  // ===== UTILITY FUNCTIONS =====
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTeamById = (id: number) => teams.find(team => team.id === id);

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

  // ===== TEAM MANAGEMENT FUNCTIONS =====
  
  const startEditing = (team: Team) => {
    setEditingTeam(team.id);
    setEditForm({ leader: team.leader, members: team.members.join(', ') });
  };

  const saveChanges = async (teamId: number) => {
    const updatedTeams = teams.map(team => 
      team.id === teamId 
        ? { 
            ...team, 
            leader: editForm.leader, 
            members: editForm.members.split(',').map(m => m.trim()).filter(m => m) 
          }
        : team
    );
    setTeams(updatedTeams);
    setEditingTeam(null);
  };

  const cancelEditing = () => {
    setEditingTeam(null);
    setEditForm({ leader: "", members: "" });
  };

  // ===== SWAP REQUEST FUNCTIONS =====
  
  const handleSwapSelect = async (teamId: number, date: string) => {
    if (selectedSwapFrom && selectedSwapFrom.teamId === teamId && selectedSwapFrom.date === date) {
      // Deselect if clicking the same date
      setSelectedSwapFrom(null);
    } else if (selectedSwapFrom) {
      // Show confirmation dialog before completing the swap
      setShowSwapConfirmation({
        fromTeamId: selectedSwapFrom.teamId,
        toTeamId: teamId,
        fromDate: selectedSwapFrom.date,
        toDate: date
      });
    } else {
      // Select the first date for swapping
      setSelectedSwapFrom({ teamId, date });
    }
  };

  const confirmSwapRequest = () => {
    if (!showSwapConfirmation) return;
    
    const newSwap: SwapRequest = {
      id: Date.now(),
      fromTeamId: showSwapConfirmation.fromTeamId,
      toTeamId: showSwapConfirmation.toTeamId,
      fromDate: showSwapConfirmation.fromDate,
      toDate: showSwapConfirmation.toDate,
      status: 'pending'
    };
    
    setSwapRequests([...swapRequests, newSwap]);
    setSelectedSwapFrom(null);
    setShowSwapConfirmation(null);
  };

  const updateSwapStatus = async (id: number, status: 'approved' | 'rejected') => {
    await updateSwapRequestStatus(id, status);
  };

  const isDateInSwapSelection = (teamId: number, date: string) => {
    return selectedSwapFrom?.teamId === teamId && selectedSwapFrom?.date === date;
  };

  const canSwapWith = (teamId: number, date: string) => {
    if (!selectedSwapFrom) return false;
    // Can swap with different teams only, and not the same date
    return selectedSwapFrom.teamId !== teamId && selectedSwapFrom.date !== date;
  };

  // ===== MANUAL OVERRIDE FUNCTIONS =====
  
  const handleToggleManualMode = () => {
    setIsManualMode(!isManualMode);
    setSelectedSwapFrom(null);
    setShowTeamSelector(null);
  };

  const handleDateClick = (teamId: number, date: string) => {
    if (isManualMode) {
      setShowTeamSelector({ date, teamId });
    } else {
      handleSwapSelect(teamId, date);
    }
  };

  const handleManualTeamSelect = (newTeamId: number) => {
    if (showTeamSelector) {
      const currentTeamId = showTeamSelector.teamId;
      
      // Show confirmation dialog
      setShowManualConfirmation({
        date: showTeamSelector.date,
        currentTeamId,
        newTeamId
      });
      
      // Close the team selector dialog
      setShowTeamSelector(null);
    }
  };

  const confirmManualAssignment = () => {
    if (!showManualConfirmation) return;
    
    const newManualOverrides = {
      ...manualOverrides,
      [showManualConfirmation.date]: showManualConfirmation.newTeamId
    };
    setManualOverrides(newManualOverrides);
    setShowManualConfirmation(null);
  };

  const clearManualOverride = (date: string) => {
    const newOverrides = { ...manualOverrides };
    delete newOverrides[date];
    setManualOverrides(newOverrides);
  };

  const clearAllManualOverrides = () => {
    setManualOverrides({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Worship Team Schedule</h1>
          <p className="text-lg text-gray-600">Sunday service rotation - Each team serves 2 weeks, then rotates</p>
          {isFirebaseConnected && (
            <div className="mt-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                🔄 Real-time sync enabled
              </Badge>
            </div>
          )}
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

        {/* Manual Mode Toggle */}
        <div className="flex justify-center mb-6">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Schedule Mode</h3>
                  <p className="text-sm text-gray-600">
                    {isManualMode ? 'Manual Override' : 'Auto Rotation + Swaps'}
                  </p>
                </div>
                <Button
                  variant={isManualMode ? 'default' : 'outline'}
                  onClick={handleToggleManualMode}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  {isManualMode ? 'Manual Mode' : 'Auto Mode'}
                </Button>
              </div>
              {isManualMode && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Click on any Sunday to manually assign a team. This overrides the automatic rotation.
                  </p>
                  {Object.keys(manualOverrides).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllManualOverrides}
                      className="mt-2"
                    >
                      Clear All Manual Assignments
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Team Selector Dialog */}
        <Dialog open={!!showTeamSelector} onOpenChange={() => setShowTeamSelector(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                Assign Team to {showTeamSelector ? formatDate(showTeamSelector.date) : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                Select which team should serve on this Sunday:
              </p>
              
              <div className="space-y-2">
                {teams.map((team) => (
                  <Button
                    key={team.id}
                    variant={showTeamSelector?.teamId === team.id ? "default" : "outline"}
                    onClick={() => handleManualTeamSelect(team.id)}
                    className="w-full justify-start h-auto p-3"
                  >
                    <div className="text-left">
                      <div className="font-semibold">{team.leader}</div>
                      <div className="text-xs text-gray-600">
                        {team.members.join(', ')}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowTeamSelector(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                {showTeamSelector && manualOverrides[showTeamSelector.date] && (
                  <Button 
                    variant="outline" 
                    onClick={() => clearManualOverride(showTeamSelector.date)}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    Clear Assignment
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manual Assignment Confirmation Dialog */}
        <Dialog open={!!showManualConfirmation} onOpenChange={() => setShowManualConfirmation(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Confirm Manual Assignment
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to manually assign a different team to this Sunday?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Date:</strong> {showManualConfirmation ? formatDate(showManualConfirmation.date) : ''}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Current Team:</strong> {showManualConfirmation ? getTeamById(showManualConfirmation.currentTeamId)?.leader : ''}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>New Team:</strong> {showManualConfirmation ? getTeamById(showManualConfirmation.newTeamId)?.leader : ''}
                </p>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will override the automatic rotation schedule for this Sunday.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowManualConfirmation(null)}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmManualAssignment}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Confirm Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Swap Request Confirmation Dialog */}
        <Dialog open={!!showSwapConfirmation} onOpenChange={() => setShowSwapConfirmation(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                Confirm Swap Request
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to request this swap between teams?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {showSwapConfirmation ? getTeamById(showSwapConfirmation.fromTeamId)?.leader : ''}
                    </p>
                    <p className="text-xs text-blue-700">
                      {showSwapConfirmation ? formatDate(showSwapConfirmation.fromDate) : ''}
                    </p>
                  </div>
                  <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {showSwapConfirmation ? getTeamById(showSwapConfirmation.toTeamId)?.leader : ''}
                    </p>
                    <p className="text-xs text-blue-700">
                      {showSwapConfirmation ? formatDate(showSwapConfirmation.toDate) : ''}
                    </p>
                  </div>
                </div>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will create a pending swap request that needs to be approved.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowSwapConfirmation(null)}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmSwapRequest}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Request Swap
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Conditional rendering for tabs */}
        {activeTab === 'schedule' && (
          <>
            {/* Band Leaders & Members Section (collapsible) */}
            <Accordion type="multiple" defaultValue={[]} className="w-full mb-8">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <CardHeader className="flex-row items-center gap-2">
                    <Users className="w-5 h-5" />
                    <CardTitle className="text-lg font-semibold">Band Leaders & Members</CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <Card>
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>

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
                      Click on another Sunday to complete the swap request.
                    </p>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedSwapFrom(null);
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
                  {isManualMode && (
                    <span className="text-sm font-normal text-green-600 ml-2">
                      (Click any Sunday to manually assign team)
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
                    const isManualOverride = manualOverrides[sunday.date];
                    
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
                        onClick={() => handleDateClick(sunday.teamId, sunday.date)}
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
                              {isManualMode && !isManualOverride && <span className="text-green-600 font-medium"> • Click to Assign</span>}
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
            <h3 className="text-xl font-semibold text-gray-900">Swap Requests</h3>
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800 border-b pb-2">Active Requests</h4>
              {swapRequests.filter(request => request.status === 'pending').length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No pending swap requests</p>
                    <p className="text-sm text-gray-500 mt-2">Use the visual calendar to request swaps</p>
                  </CardContent>
                </Card>
              ) : (
                swapRequests
                  .filter(request => request.status === 'pending')
                  .map((request) => {
                    const fromTeam = getTeamById(request.fromTeamId);
                    const toTeam = getTeamById(request.toTeamId); 
                    return (
                      <Card key={request.id} className={`transition-all duration-200 hover:shadow-lg ${getStatusColor(request.status)}`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-4">
                                {getStatusIcon(request.status)}
                                <h4 className="font-semibold text-lg">Swap Request</h4>
                                <Badge variant="outline" className="capitalize">
                                  {request.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* From Column */}
                                <div className="space-y-3">
                                  <h5 className="font-medium text-gray-700 border-b pb-1">From</h5>
                                  <div className="space-y-2">
                                    <div>
                                      <span className="text-sm font-medium text-gray-600">Team:</span>
                                      <p className="font-semibold">{fromTeam?.leader}</p>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-gray-600">Date:</span>
                                      <p className="font-semibold">{formatDate(request.fromDate)}</p>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-gray-600">Members:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {fromTeam?.members.map((member, index) => (
                                          <Badge key={index} variant="outline" className="text-xs">
                                            {member}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {/* To Column */}
                                <div className="space-y-3">
                                  <h5 className="font-medium text-gray-700 border-b pb-1">To</h5>
                                  <div className="space-y-2">
                                    <div>
                                      <span className="text-sm font-medium text-gray-600">Team:</span>
                                      <p className="font-semibold">{toTeam?.leader}</p>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-gray-600">Date:</span>
                                      <p className="font-semibold">{formatDate(request.toDate)}</p>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-gray-600">Members:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {toTeam?.members.map((member, index) => (
                                          <Badge key={index} variant="outline" className="text-xs">
                                            {member}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
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
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>

            {/* History Section */}
            <Accordion type="single" collapsible defaultValue="">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <h4 className="text-lg font-medium text-gray-800 border-b pb-2 w-full text-left">History</h4>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {swapRequests
                      .filter(request => request.status !== 'pending')
                      .length === 0 ? (
                      <Card>
                        <CardContent className="text-center py-8">
                          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">No completed swap requests in history</p>
                        </CardContent>
                      </Card>
                    ) : (
                      swapRequests
                        .filter(request => request.status !== 'pending')
                        .map((request) => {
                          const fromTeam = getTeamById(request.fromTeamId);
                          const toTeam = getTeamById(request.toTeamId); 
                          return (
                            <Card key={request.id} className={`transition-all duration-200 hover:shadow-lg ${getStatusColor(request.status)}`}>
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                      {getStatusIcon(request.status)}
                                      <h4 className="font-semibold text-lg">Swap Request</h4>
                                      <Badge variant="outline" className="capitalize">
                                        {request.status}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {/* From Column */}
                                      <div className="space-y-3">
                                        <h5 className="font-medium text-gray-700 border-b pb-1">From</h5>
                                        <div className="space-y-2">
                                          <div>
                                            <span className="text-sm font-medium text-gray-600">Team:</span>
                                            <p className="font-semibold">{fromTeam?.leader}</p>
                                          </div>
                                          <div>
                                            <span className="text-sm font-medium text-gray-600">Date:</span>
                                            <p className="font-semibold">{formatDate(request.fromDate)}</p>
                                          </div>
                                          <div>
                                            <span className="text-sm font-medium text-gray-600">Members:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {fromTeam?.members.map((member, index) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                  {member}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      {/* To Column */}
                                      <div className="space-y-3">
                                        <h5 className="font-medium text-gray-700 border-b pb-1">To</h5>
                                        <div className="space-y-2">
                                          <div>
                                            <span className="text-sm font-medium text-gray-600">Team:</span>
                                            <p className="font-semibold">{toTeam?.leader}</p>
                                          </div>
                                          <div>
                                            <span className="text-sm font-medium text-gray-600">Date:</span>
                                            <p className="font-semibold">{formatDate(request.toDate)}</p>
                                          </div>
                                          <div>
                                            <span className="text-sm font-medium text-gray-600">Members:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {toTeam?.members.map((member, index) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                  {member}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* No requests at all */}
            {swapRequests.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <ArrowRightLeft className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No swap requests yet</p>
                  <p className="text-sm text-gray-500 mt-2">Use the visual calendar to request swaps</p>
                </CardContent>
              </Card>
            )}
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
