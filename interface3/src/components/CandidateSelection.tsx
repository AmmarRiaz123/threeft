import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Vote, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Candidate {
  id: string;
  name: string;
  constituency: string;
  image_url: string | null;
  profile: string | null;
  type: 'MNA' | 'MPA';
}

interface CandidateSelectionProps {
  partyId: string;
  candidateType: 'MNA' | 'MPA';
  onBack: () => void;
  onCandidateSelect: (candidate: Candidate) => void;
  onBackToParties?: () => void;
}

const CandidateSelection = ({ partyId, candidateType, onBack, onCandidateSelect, onBackToParties }: CandidateSelectionProps) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, [partyId, candidateType]);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name, constituency, image_url, profile, type')
        .eq('party_id', partyId)
        .eq('type', candidateType)
        .order('constituency');

      if (error) throw error;
      setCandidates((data || []) as Candidate[]);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowConfirmDialog(true);
  };

  const handleConfirmVote = () => {
    if (selectedCandidate) {
      onCandidateSelect(selectedCandidate);
      setShowConfirmDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 animate-fade-in">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div 
                key={i} 
                className="p-6 space-y-4 bg-card rounded-lg border border-border animate-scale-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <Skeleton className="w-24 h-24 mx-auto rounded-full" />
                <div className="text-center space-y-2">
                  <Skeleton className="h-6 w-32 mx-auto" />
                  <Skeleton className="h-5 w-24 mx-auto" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

    return (
    <div className="min-h-screen bg-background p-4 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Select {candidateType} Candidate
          </h1>
          <Button
            onClick={onBack}
            variant="outline"
            className="border-border hover:bg-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <Card 
              key={candidate.id}
              className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 bg-card border-border group animate-scale-in"
              onClick={() => handleCandidateClick(candidate)}
              style={{ animationDelay: `${candidates.indexOf(candidate) * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  {candidate.image_url ? (
                    <img
                      src={candidate.image_url}
                      alt={candidate.name}
                      className="w-24 h-24 mx-auto rounded-full object-cover border-2 border-primary transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center border-2 border-primary transition-transform duration-300 group-hover:scale-110">
                      <User className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-xl font-semibold text-card-foreground mb-1">
                      {candidate.name}
                    </h3>
                    <p className="text-primary font-medium">
                      {candidate.constituency}
                    </p>
                  </div>

                  {candidate.profile && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {candidate.profile}
                    </p>
                  )}

                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 hover:scale-105"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCandidateClick(candidate);
                    }}
                  >
                    <Vote className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                    Vote
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {candidates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No {candidateType} candidates available for this party.
            </p>
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="bg-card border-border animate-scale-in">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Confirm Your Vote</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Please confirm your candidate selection before proceeding.
              </DialogDescription>
            </DialogHeader>
            
            {selectedCandidate && (
              <div className="space-y-4">
                <div className="text-center">
                  {selectedCandidate.image_url ? (
                    <img
                      src={selectedCandidate.image_url}
                      alt={selectedCandidate.name}
                      className="w-20 h-20 mx-auto rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <User className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-card-foreground">
                    Are you sure you want to cast your vote for:
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {selectedCandidate.name}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedCandidate.constituency} ({selectedCandidate.type})
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirmDialog(false)}
                      className="flex-1 border-border hover:bg-secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmVote}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Confirm Vote
                    </Button>
                  </div>
                  
                  {candidateType === 'MPA' && onBackToParties && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm text-muted-foreground text-center mb-3">
                        Want to select MPA from a different party?
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowConfirmDialog(false);
                          onBackToParties();
                        }}
                        className="w-full border-border hover:bg-secondary"
                      >
                        Back to Parties
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CandidateSelection;