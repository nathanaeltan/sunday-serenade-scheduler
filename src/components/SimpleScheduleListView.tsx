import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

interface SimpleScheduleListViewProps {
  sundays: { date: string; teamId: number; isChristmas?: boolean; isEaster?: boolean; isGoodFriday?: boolean }[];
  getTeamById: (id: number) => { leader: string; members: string[] } | undefined;
  onShowSongs: (date: string) => void;
}

const SimpleScheduleListView: React.FC<SimpleScheduleListViewProps> = ({ 
  sundays, 
  getTeamById, 
  onShowSongs 
}) => {
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatDateForSort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Schedule Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 font-bold text-gray-800 border border-gray-300 bg-gray-200">Date</th>
                <th className="text-left p-3 font-bold text-gray-800 border border-gray-300 bg-gray-200">Assigned</th>
                <th className="text-left p-3 font-bold text-gray-800 border border-gray-300 bg-gray-200">Team Members</th>
                <th className="text-center p-3 font-bold text-gray-800 border border-gray-300 bg-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sundays.map((sunday, index) => {
                const team = getTeamById(sunday.teamId);
                const isCurrentWeek = index < 2;
                const isChristmas = sunday.isChristmas;
                const isEaster = sunday.isEaster;
                const isGoodFriday = sunday.isGoodFriday;
                const isSpecialDate = isChristmas || isEaster || isGoodFriday;
                
                return (
                  <tr 
                    key={sunday.date}
                    className={`hover:bg-gray-50 ${
                      isCurrentWeek ? 'bg-green-50' : ''
                    } ${isSpecialDate ? 'bg-red-50' : ''}`}
                  >
                    <td className="p-3 border border-gray-300">
                      <div className="font-medium text-gray-900">
                        {formatDateForDisplay(sunday.date)}
                      </div>
                      {isChristmas && (
                        <div className="text-xs text-red-600 font-medium mt-1">
                          Christmas
                        </div>
                      )}
                      {isEaster && (
                        <div className="text-xs text-red-600 font-medium mt-1">
                          Easter
                        </div>
                      )}
                      {isGoodFriday && (
                        <div className="text-xs text-red-600 font-medium mt-1">
                          Good Friday
                        </div>
                      )}
                      {isCurrentWeek && !isSpecialDate && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          Current Rotation
                        </div>
                      )}
                    </td>
                    <td className="p-3 border border-gray-300">
                      <div className="font-semibold text-red-600">
                        {team?.leader || 'Unassigned'}
                      </div>
                    </td>
                    <td className="p-3 border border-gray-300">
                      <div className="flex flex-wrap gap-1">
                        {team?.members.map((member, memberIndex) => (
                          <span 
                            key={memberIndex} 
                            className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded"
                          >
                            {member}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center border border-gray-300">
                      <button
                        onClick={() => onShowSongs(sunday.date)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors border border-blue-300"
                      >
                        Songs
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {sundays.map((sunday, index) => {
            const team = getTeamById(sunday.teamId);
            const isCurrentWeek = index < 2;
            const isChristmas = sunday.isChristmas;
            const isEaster = sunday.isEaster;
            const isGoodFriday = sunday.isGoodFriday;
            const isSpecialDate = isChristmas || isEaster || isGoodFriday;
            
            return (
              <div 
                key={sunday.date}
                className={`p-4 border rounded-lg ${
                  isCurrentWeek ? 'bg-green-50 border-green-200' : ''
                } ${isSpecialDate ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-lg">
                      {formatDateForDisplay(sunday.date)}
                    </div>
                    {isChristmas && (
                      <div className="text-xs text-red-600 font-medium mt-1">
                        Christmas
                      </div>
                    )}
                    {isEaster && (
                      <div className="text-xs text-red-600 font-medium mt-1">
                        Easter
                      </div>
                    )}
                    {isGoodFriday && (
                      <div className="text-xs text-red-600 font-medium mt-1">
                        Good Friday
                      </div>
                    )}
                    {isCurrentWeek && !isSpecialDate && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        Current Rotation
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onShowSongs(sunday.date)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors border border-blue-300 flex-shrink-0"
                  >
                    Songs
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Team Leader</div>
                    <div className="font-semibold text-red-600 text-lg">
                      {team?.leader || 'Unassigned'}
                    </div>
                  </div>
                  
                  {team?.members && team.members.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-2">Team Members</div>
                      <div className="flex flex-wrap gap-1">
                        {team.members.map((member, memberIndex) => (
                          <span 
                            key={memberIndex} 
                            className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded"
                          >
                            {member}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div>
              <div className="text-lg sm:text-2xl font-bold text-blue-900">{sundays.length}</div>
              <div className="text-xs sm:text-sm text-blue-700">Total Sundays</div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-green-900">
                {sundays.filter(s => s.isChristmas || s.isEaster || s.isGoodFriday).length}
              </div>
              <div className="text-xs sm:text-sm text-green-700">Special Dates</div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-purple-900">
                {new Set(sundays.map(s => s.teamId)).size}
              </div>
              <div className="text-xs sm:text-sm text-purple-700">Teams Active</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleScheduleListView;
