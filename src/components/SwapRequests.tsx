
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Plus, CheckCircle, XCircle, Clock } from "lucide-react";

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

interface SwapRequestsProps {
  teams: Team[];
  swapRequests: SwapRequest[];
  onAddSwapRequest: (request: Omit<SwapRequest, 'id'>) => void;
  onUpdateSwapRequest: (id: number, status: 'approved' | 'rejected') => void;
}

const SwapRequests = ({ teams, swapRequests, onAddSwapRequest, onUpdateSwapRequest }: SwapRequestsProps) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fromTeam: "",
    toTeam: "",
    date: "",
    reason: "",
    requestedBy: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fromTeam && formData.toTeam && formData.date && formData.requestedBy) {
      onAddSwapRequest({
        ...formData,
        status: 'pending'
      });
      setFormData({
        fromTeam: "",
        toTeam: "",
        date: "",
        reason: "",
        requestedBy: ""
      });
      setShowForm(false);
    }
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
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Swap Requests</h2>
        <p className="text-gray-600">Request and manage team schedule swaps</p>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900">All Requests</h3>
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Swap Request
        </Button>
      </div>

      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Request Team Swap
            </CardTitle>
            <CardDescription>
              Submit a request to swap service dates between teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromTeam">From Team</Label>
                  <Select value={formData.fromTeam} onValueChange={(value) => setFormData({...formData, fromTeam: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team to swap from" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.name}>
                          {team.name} ({team.leader})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="toTeam">To Team</Label>
                  <Select value={formData.toTeam} onValueChange={(value) => setFormData({...formData, toTeam: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team to swap with" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.filter(team => team.name !== formData.fromTeam).map((team) => (
                        <SelectItem key={team.id} value={team.name}>
                          {team.name} ({team.leader})
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
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="requestedBy">Requested By</Label>
                  <Input
                    id="requestedBy"
                    value={formData.requestedBy}
                    onChange={(e) => setFormData({...formData, requestedBy: e.target.value})}
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Brief explanation for the swap request..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Submit Request</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
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
                      <p><span className="font-medium">Date:</span> {request.date}</p>
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
                        onClick={() => onUpdateSwapRequest(request.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateSwapRequest(request.id, 'rejected')}
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
  );
};

export default SwapRequests;
