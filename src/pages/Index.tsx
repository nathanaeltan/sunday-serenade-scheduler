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
  AlertTriangle,
  Info,
  X as CloseIcon
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
  type SwapRequest,
  getSongSchedule,
  getUniqueSongs
} from "@/lib/firebaseService";
import UniqueSongsManager from "@/components/UniqueSongsManager";
import Fuse from 'fuse.js';
import CalendarScheduleView from '@/components/CalendarScheduleView';
import SimpleScheduleListView from '@/components/SimpleScheduleListView';

interface WeekData {
  date: string;
  teamId: number;
  isChristmas?: boolean;
  isEaster?: boolean;
}

// Utility: Advanced Title Case
function toTitleCase(str) {
  const minorWords = [
    "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "so", "the", "to", "up", "yet"
  ];
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i, arr) => {
      if (
        minorWords.includes(word) &&
        i !== 0 &&
        i !== arr.length - 1
      ) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// Helper to get song by slug or fuzzy match
function getSongBySlugOrFuzzy(slug, uniqueSongs) {
  if (uniqueSongs[slug]) return uniqueSongs[slug];

  // Ensure allSongs is typed as array of objects with a title property
  const allSongs = Object.values(uniqueSongs) as { title: string; link1?: string; link2?: string }[];
  const fuse = new Fuse(allSongs, {
    keys: ['title'],
    threshold: 0.5, // Looser match
    includeScore: true,
  });
  const guessTitle = slug.replace(/-/g, ' ');
  let result = fuse.search(guessTitle);
  if (result.length > 0) {
    return result[0].item;
  }
  // Fallback: substring match
  const fallback = allSongs.find(song =>
    guessTitle.toLowerCase().includes(song.title.toLowerCase()) ||
    song.title.toLowerCase().includes(guessTitle.toLowerCase())
  );
  if (fallback) return fallback;
  return null;
}

// Helper to format a Date as YYYY-MM-DD in local time
function toLocalDateString(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const Index = () => {
  // Default teams array
  const defaultTeams: Team[] = [
    { id: 1, leader: "Annamae", members: ["Xinyu", "Ryan"] },
    { id: 2, leader: "Callum", members: ["Vivian", "Chris", "Hazel"] },
    { id: 3, leader: "Nat", members: ["Mel", "Soph", "Samuel"] },
    { id: 4, leader: "Tabitha", members: ["Victoria", "Kenji"] },
  ];

  // State management
  const [teams, setTeams] = useState<Team[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [manualOverrides, setManualOverrides] = useState<{[date: string]: number}>({});
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'schedule' | 'swaps' | 'uniqueSongs' | 'wrapped'>('schedule');
  const [isManualMode, setIsManualMode] = useState(true);
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

  const [songSchedule, setSongSchedule] = useState({});
  const [uniqueSongs, setUniqueSongs] = useState({});
  const [showSongsModal, setShowSongsModal] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [scheduleView, setScheduleView] = useState<'list' | 'calendar' | 'simple'>('simple');
  const [showInfoBanner, setShowInfoBanner] = useState(() => {
    return localStorage.getItem('worship-scheduler-banner-dismissed') !== 'true';
  });

  const songLabels = {
    opening_song: 'Opening Song',
    song_2: 'Song 2',
    pre_sermon: 'Pre-sermon',
    response: 'Response',
    kids_song: 'Kids Song',
  };

  // ===== DATA LOADING & FIREBASE EFFECTS =====
  
  // Load data from Firebase on component mount
  useEffect(() => {
    const loadDataFromFirebase = async () => {
      try {
        const data = await getAllData();
        console.log(data, "DATA")
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

  useEffect(() => {
    async function fetchSongsData() {
      setSongSchedule(await getSongSchedule());
      setUniqueSongs(await getUniqueSongs());
    }
    fetchSongsData();
  }, []);

  // ===== SCHEDULE GENERATION =====
  
  // Generate all Sundays until the end of 2026, and include special dates like Easter and Christmas
  const generateSundays = (): WeekData[] => {
    const sundays: WeekData[] = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const nextSunday = new Date(today);

    // Find next Sunday
    const daysUntilSunday = 7 - today.getDay();
    nextSunday.setDate(today.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));

    const numTeams = teams.length;
    let i = 0;
    let current = new Date(nextSunday);

    // Guard against swapRequests not being an array
    const safeSwapRequests = Array.isArray(swapRequests) ? swapRequests : [];
    const validSwapRequests = safeSwapRequests.filter(
      swap => swap && typeof swap === 'object' && 'fromDate' in swap && 'toDate' in swap && 'status' in swap
    );

    // Generate Sundays for current year and 2026
    while (current.getFullYear() <= 2026) {
      const dateString = toLocalDateString(current);
      // Check for manual override first
      if (manualOverrides[dateString]) {
        sundays.push({
          date: dateString,
          teamId: manualOverrides[dateString],
        });
      } else {
        // Check for approved swaps for this date
        const approvedSwap = validSwapRequests.find(swap =>
          (swap.fromDate === dateString || swap.toDate === dateString) && swap.status === 'approved'
        );
        let scheduledTeamId;
        if (approvedSwap) {
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
          teamId: scheduledTeamId,
        });
      }
      // Next Sunday
      current.setDate(current.getDate() + 7);
      i++;
    }

    // Add special dates for both years
    const specialDates = [
      // 2025 special dates
      { year: 2025, month: 11, day: 25, type: 'christmas' }, // Christmas 2025
      // 2026 special dates
      { year: 2026, month: 2, day: 31, type: 'easter' }, // Easter 2026 (March 31)
      { year: 2026, month: 11, day: 25, type: 'christmas' }, // Christmas 2026
    ];

    specialDates.forEach(({ year, month, day, type }) => {
      const specialDate = new Date(year, month, day);
      const specialDateString = toLocalDateString(specialDate);
      const alreadyIncluded = sundays.some(s => s.date === specialDateString);
      
      if (!alreadyIncluded) {
        // Check for manual override for special date
        const teamId = manualOverrides[specialDateString]
          ? manualOverrides[specialDateString]
          : teams[Math.floor(i / 2) % numTeams]?.id || 1;
        
        const specialDateEntry: WeekData = {
          date: specialDateString,
          teamId,
        };
        
        if (type === 'christmas') {
          specialDateEntry.isChristmas = true;
        } else if (type === 'easter') {
          specialDateEntry.isEaster = true;
        }
        
        sundays.push(specialDateEntry);
        i++;
      } else {
        // Mark the existing Sunday as special date
        sundays.forEach(s => {
          if (s.date === specialDateString) {
            if (type === 'christmas') {
              s.isChristmas = true;
            } else if (type === 'easter') {
              s.isEaster = true;
            }
            // Also update teamId if there is a manual override for the special date
            if (manualOverrides[specialDateString]) {
              s.teamId = manualOverrides[specialDateString];
            }
          }
        });
      }
    });

    // Sort by date ascending
    sundays.sort((a, b) => a.date.localeCompare(b.date));
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

  const handleShowSongs = (date) => {
    setSelectedDate(date);
    setSelectedSongs(songSchedule[date] || null);
    setShowSongsModal(true);
  };

  let songList = null;
  if (selectedSongs) {
    songList = ['opening_song', 'song_2', 'pre_sermon', 'response', 'kids_song'].map((key) => {
      const slug = selectedSongs[key];
      if (!slug) return null;
      const song = getSongBySlugOrFuzzy(slug, uniqueSongs);
      return (
        <div key={key} className="border-b pb-4 mb-4 last:border-b-0 last:mb-0 last:pb-0">
          <div className="text-xs font-medium text-gray-500 mb-2">{songLabels[key]}</div>
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-gray-900">{toTitleCase(song?.title || slug.replace(/-/g, ' '))}</div>
                {song?.artist && (
                  <div className="text-sm text-gray-600 mt-0.5">{song.artist}</div>
                )}
              </div>
              {song && song.spotify && (
                <a 
                  href={song.spotify} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-green-600 hover:text-green-700 flex items-center gap-1.5 text-sm font-medium"
                >
                  <svg width="16" height="16" viewBox="0 0 168 168" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="84" cy="84" r="84" fill="#1ED760"/>
                    <path d="M122.1 116.2c-2.1 3.4-6.5 4.5-9.9 2.4-27.1-16.6-61.3-20.4-101.7-11.2-3.9.9-7.8-1.5-8.7-5.4-.9-3.9 1.5-7.8 5.4-8.7 43.2-9.7 80.1-5.6 110.1 12.2 3.4 2.1 4.5 6.5 2.4 9.9zm13.9-25.6c-2.6 4.2-8.1 5.6-12.3 3-31.1-19-78.5-24.6-115.2-13.5-4.7 1.4-9.7-1.2-11.1-5.9-1.4-4.7 1.2-9.7 5.9-11.1 41.7-12.2 93.2-6.1 128.2 15.1 4.2 2.6 5.6 8.1 3 12.4zm14.1-28.1c-36.2-21.5-96.2-23.5-130.2-12.9-5.3 1.6-10.9-1.3-12.5-6.6-1.6-5.3 1.3-10.9 6.6-12.5 37.2-11.3 102.6-9.1 143.2 14.1 5 3 6.6 9.5 3.6 14.5-3 5-9.5 6.6-14.5 3.6z" fill="#fff"/>
                  </svg>
                  Spotify
                </a>
              )}
            </div>
            {song && (song.link1 || song.link2 || song.lyrics) && (
              <div className="flex gap-3 mt-1">
                {song.link1 && (
                  <a 
                    href={song.link1} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Chords
                  </a>
                )}
                {song.link2 && (
                  <a 
                    href={song.link2} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Link 2
                  </a>
                )}
                {song.lyrics && (
                  <a 
                    href={song.lyrics} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Lyrics
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      );
    });
  }

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

        {/* Info Banner */}
        {showInfoBanner && (
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-2">✨ New Features Added!</h3>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>• <strong>View List:</strong> Clean table view similar to Excel for quick overview</p>
                        <p>• <strong>Edit List:</strong> Edit view to assign teams</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowInfoBanner(false);
                      localStorage.setItem('worship-scheduler-banner-dismissed', 'true');
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 flex-shrink-0"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
            {/* <Button
              variant={activeTab === 'swaps' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('swaps')}
              className="flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Swap Requests
            </Button> */}
            <Button
              variant={activeTab === 'uniqueSongs' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('uniqueSongs')}
              className="flex items-center gap-2"
            >
              🎵
              Songs
            </Button>

          </div>
        </div>

        {/* Manual Mode Toggle - only show on schedule tab */}
        {/* {activeTab === 'schedule' && (
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
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )} */}

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

        {/* Songs Modal */}
        {showSongsModal && (
          <Dialog open={showSongsModal} onOpenChange={setShowSongsModal}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Songs for {selectedDate ? formatDate(selectedDate) : ''}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedSongs ? (
                  <>
                    {songList}
                  </>
                ) : (
                  <div className="text-gray-500">No songs scheduled for this week.</div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSongsModal(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Conditional rendering for tabs */}
        {activeTab === 'schedule' && (
          <>
            <div className="flex flex-col sm:flex-row justify-end mb-4 gap-2">
              <Button
                variant={scheduleView === 'simple' ? 'default' : 'outline'}
                onClick={() => setScheduleView('simple')}
                className="text-sm sm:text-base"
              >
                View List
              </Button>
              <Button
                variant={scheduleView === 'list' ? 'default' : 'outline'}
                onClick={() => setScheduleView('list')}
                className="text-sm sm:text-base"
              >
                Edit List
              </Button>
              {/* <Button
                variant={scheduleView === 'calendar' ? 'default' : 'outline'}
                onClick={() => setScheduleView('calendar')}
                className="text-sm sm:text-base"
              >
                Calendar View
              </Button> */}
            </div>
            {scheduleView === 'simple' ? (
              <SimpleScheduleListView
                sundays={sundays}
                getTeamById={getTeamById}
                onShowSongs={handleShowSongs}
              />
            ) : scheduleView === 'list' ? (
              <>
                {/* Band Leaders & Members Section (collapsible) */}
                <Accordion type="multiple" defaultValue={[]} className="w-full mb-8">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>
                      <CardHeader className="flex-row items-center gap-2">
                        <Users className="w-5 h-5" />
                        <CardTitle className="text-lg font-semibold">Bands</CardTitle>
                      </CardHeader>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                                    <h3 className="font-semibold my-0 py-0 leading-none flex-grow">{team.leader}</h3>
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
                      {/* {isManualMode && (
                        <span className="text-sm font-normal text-green-600 ml-2">
                          (Click any Sunday to manually assign team)
                        </span>
                      )} */}
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
                                  {/* {isManualMode && !isManualOverride && <span className="text-green-600 font-medium"> • Click to Assign</span>} */}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={isCurrentWeek ? "default" : "secondary"}
                                  className="px-3 py-1"
                                >
                                  {scheduledTeam?.leader}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="ml-2"
                                  onClick={e => { e.stopPropagation(); handleShowSongs(sunday.date); }}
                                >
                                  Songs
                                </Button>
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
            ) : (
              <CalendarScheduleView
                sundays={sundays}
                getTeamById={getTeamById}
                onShowSongs={handleShowSongs}
              />
            )}
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

        {activeTab === 'uniqueSongs' && (
          <UniqueSongsManager />
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
