
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit2, Save, X } from "lucide-react";

interface Team {
  id: number;
  name: string;
  leader: string;
  isActive: boolean;
  nextScheduled: string;
}

interface TeamManagementProps {
  teams: Team[];
  onUpdateTeam: (team: Team) => void;
}

const TeamManagement = ({ teams, onUpdateTeam }: TeamManagementProps) => {
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", leader: "" });

  const startEditing = (team: Team) => {
    setEditingTeam(team.id);
    setEditForm({ name: team.name, leader: team.leader });
  };

  const saveChanges = (team: Team) => {
    onUpdateTeam({
      ...team,
      name: editForm.name,
      leader: editForm.leader
    });
    setEditingTeam(null);
  };

  const cancelEditing = () => {
    setEditingTeam(null);
    setEditForm({ name: "", leader: "" });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Manage Teams</h2>
        <p className="text-gray-600">Update team names and leader information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team) => (
          <Card key={team.id} className="transition-all duration-200 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {editingTeam === team.id ? (
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="font-semibold text-lg"
                    />
                  ) : (
                    <CardTitle className="text-xl">{team.name}</CardTitle>
                  )}
                  <Badge variant={team.isActive ? "default" : "secondary"}>
                    {team.isActive ? "Active" : "Break"}
                  </Badge>
                </div>
                
                {editingTeam === team.id ? (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => saveChanges(team)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={cancelEditing}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => startEditing(team)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor={`leader-${team.id}`} className="text-sm font-medium text-gray-700">
                  Team Leader
                </Label>
                {editingTeam === team.id ? (
                  <Input
                    id={`leader-${team.id}`}
                    value={editForm.leader}
                    onChange={(e) => setEditForm({ ...editForm, leader: e.target.value })}
                    className="mt-1"
                    placeholder="Enter leader name"
                  />
                ) : (
                  <p className="mt-1 text-lg font-medium text-gray-900">{team.leader}</p>
                )}
              </div>
              
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Status:</span> {team.isActive ? "Currently serving" : "On break"}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Next Service:</span> {team.nextScheduled}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Schedule Information</CardTitle>
          <CardDescription className="text-blue-700">
            Teams rotate every 2 weeks. Active teams serve for 2 consecutive Sundays, then take a 2-week break.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default TeamManagement;
