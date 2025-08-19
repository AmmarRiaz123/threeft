import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, User, Users, Building } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Party {
  id: string;
  name: string;
  symbol_url: string | null;
  description: string | null;
  chairperson_url: string | null;
  vicechairperson_url: string | null;
  video_url: string | null;
}

interface Candidate {
  id: string;
  name: string;
  constituency: string;
  image_url: string | null;
  profile: string | null;
  type: 'MNA' | 'MPA';
}

interface PartySelectionProps {
  onPartySelect: (party: Party) => void;
  onPartySelectForCandidate?: (party: Party, candidateType: 'MNA' | 'MPA') => void;
  selectedMNACandidate?: Candidate | null;
  selectedMPACandidate?: Candidate | null;
  onProceedToConfirmation?: () => void;
}

const PartySelection = ({ onPartySelect, onPartySelectForCandidate, selectedMNACandidate, selectedMPACandidate, onProceedToConfirmation }: PartySelectionProps) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [partyCandidates, setPartyCandidates] = useState<Record<string, Candidate[]>>({});

  const showCandidateSelection = selectedMNACandidate || selectedMPACandidate;

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('id, name, symbol_url, description, chairperson_url, vicechairperson_url, video_url');

      if (error) throw error;
      
      // Randomize the order of parties
      const randomizedParties = (data || []).sort(() => Math.random() - 0.5);
      setParties(randomizedParties);
    } catch (error) {
      console.error('Error fetching parties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartyCandidates = async (partyId: string) => {
    if (partyCandidates[partyId]) return; // Already fetched
    
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name, image_url, type, constituency, profile')
        .eq('party_id', partyId);

      if (error) throw error;
      setPartyCandidates(prev => ({
        ...prev,
        [partyId]: (data || []) as Candidate[]
      }));
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 animate-fade-in">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-80 mx-auto mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div 
                key={i} 
                className="p-6 space-y-4 bg-card rounded-lg border border-border animate-scale-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <Skeleton className="w-20 h-20 mx-auto rounded-lg" />
                <div className="flex justify-center space-x-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <Skeleton className="w-12 h-12 rounded-full" />
                </div>
                <Skeleton className="h-6 w-32 mx-auto" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header with current selections */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              {showCandidateSelection ? 'Select Party for Remaining Candidate' : 'Select a Political Party'}
            </h1>
            
            {showCandidateSelection && (
              <div className="bg-card border border-border rounded-lg p-4 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-card-foreground mb-3">Current Selections:</h3>
                <div className="flex justify-center gap-6">
                  {selectedMNACandidate ? (
                    <div className="text-center">
                      <Badge variant="default" className="mb-2">MNA Selected ✓</Badge>
                      <p className="text-sm font-medium">{selectedMNACandidate.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedMNACandidate.constituency}</p>
                    </div>
                  ) : (
                    <div className="text-center opacity-50">
                      <Badge variant="outline" className="mb-2">MNA Pending</Badge>
                      <p className="text-sm">Not selected yet</p>
                    </div>
                  )}
                  
                  {selectedMPACandidate ? (
                    <div className="text-center">
                      <Badge variant="default" className="mb-2">MPA Selected ✓</Badge>
                      <p className="text-sm font-medium">{selectedMPACandidate.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedMPACandidate.constituency}</p>
                    </div>
                  ) : (
                    <div className="text-center opacity-50">
                      <Badge variant="outline" className="mb-2">MPA Pending</Badge>
                      <p className="text-sm">Not selected yet</p>
                    </div>
                  )}
                </div>
                
                {/* Proceed to Confirmation Button */}
                {selectedMNACandidate && selectedMPACandidate && onProceedToConfirmation && (
                  <div className="mt-4">
                    <Button
                      onClick={onProceedToConfirmation}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      size="lg"
                    >
                      Proceed to Confirmation ✓
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parties.map((party) => (
              <Tooltip key={party.id}>
                <TooltipTrigger asChild>
                  <Card 
                    className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 bg-card border-border group animate-scale-in"
                    onMouseEnter={() => fetchPartyCandidates(party.id)}
                    style={{ animationDelay: `${parties.indexOf(party) * 0.1}s` }}
                  >
                    <CardContent className="p-6 text-center space-y-4">
                      {party.symbol_url && (
                        <img
                          src={party.symbol_url}
                          alt={`${party.name} symbol`}
                          className="w-20 h-20 mx-auto object-contain rounded-lg transition-transform duration-300 group-hover:scale-110"
                        />
                      )}
                      
                      {/* Leadership Section */}
                      <div className="flex justify-center space-x-4">
                        {party.chairperson_url && (
                          <div className="text-center">
                            <img
                              src={party.chairperson_url}
                              alt="Chairperson"
                              className="w-12 h-12 rounded-full object-cover border-2 border-primary mx-auto"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Chairperson</p>
                          </div>
                        )}
                        {party.vicechairperson_url && (
                          <div className="text-center">
                            <img
                              src={party.vicechairperson_url}
                              alt="Vice Chairperson"
                              className="w-12 h-12 rounded-full object-cover border-2 border-accent mx-auto"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Vice Chair</p>
                          </div>
                        )}
                      </div>

                      <h3 className="text-xl font-semibold text-card-foreground">
                        {party.name}
                      </h3>
                      {party.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {party.description}
                        </p>
                      )}

                      {/* Action Buttons */}
                      {showCandidateSelection ? (
                        <div className="space-y-2">
                          {!selectedMNACandidate && onPartySelectForCandidate && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPartySelectForCandidate(party, 'MNA');
                              }}
                              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 hover:scale-105"
                              size="sm"
                            >
                              <Users className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                              Select MNA from this party
                            </Button>
                          )}
                          {!selectedMPACandidate && onPartySelectForCandidate && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPartySelectForCandidate(party, 'MPA');
                              }}
                              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-200 hover:scale-105"
                              size="sm"
                            >
                              <Building className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                              Select MPA from this party
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPartySelect(party);
                          }}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 hover:scale-105"
                        >
                          View Party Details
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="w-96 p-0 bg-popover border border-border overflow-hidden">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg text-popover-foreground">{party.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {partyCandidates[party.id]?.length || 0} Candidates
                      </Badge>
                    </div>
                    
                    {partyCandidates[party.id] ? (
                      <div className="space-y-4">
                        {/* Group candidates by type */}
                        {['MNA', 'MPA'].map(type => {
                          const candidatesOfType = partyCandidates[party.id].filter(c => c.type === type);
                          if (candidatesOfType.length === 0) return null;
                          
                          return (
                            <div key={type} className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs font-medium">
                                  {type} Candidates
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  ({candidatesOfType.length})
                                </span>
                              </div>
                              
                              <div className="grid gap-3 max-h-48 overflow-y-auto">
                                {candidatesOfType.map((candidate) => (
                                  <div key={candidate.id} className="flex gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/80 transition-colors">
                                    <div className="flex-shrink-0">
                                      {candidate.image_url ? (
                                        <img
                                          src={candidate.image_url}
                                          alt={candidate.name}
                                          className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                                          <User className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 space-y-1">
                                      <h5 className="font-medium text-sm text-popover-foreground truncate">
                                        {candidate.name}
                                      </h5>
                                      
                                      {candidate.constituency && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <MapPin className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{candidate.constituency}</span>
                                        </div>
                                      )}
                                      
                                      {candidate.profile && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                          {candidate.profile}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-4 w-8" />
                          </div>
                          <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="flex gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                                <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                                <div className="flex-1 space-y-1">
                                  <Skeleton className="h-4 w-24" />
                                  <Skeleton className="h-3 w-32" />
                                  <Skeleton className="h-3 w-full" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PartySelection;