import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, Building } from "lucide-react";

interface Party {
  id: string;
  name: string;
  symbol_url: string | null;
  description: string | null;
  chairperson_url: string | null;
  vicechairperson_url: string | null;
  video_url: string | null;
}

interface MediaAsset {
  id: string;
  type: string;
  url: string;
}

interface PartyOverviewProps {
  party: Party;
  onBack: () => void;
  onSelectCandidateType: (type: 'MNA' | 'MPA') => void;
}

const PartyOverview = ({ party, onBack, onSelectCandidateType }: PartyOverviewProps) => {
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);

  useEffect(() => {
    fetchMediaAssets();
  }, [party.id]);

  const fetchMediaAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('id, type, url')
        .eq('party_id', party.id);

      if (error) throw error;
      setMediaAssets(data || []);
    } catch (error) {
      console.error('Error fetching media assets:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground text-center">{party.name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section - Description & Achievements */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4">Party Vision & Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {party.description || "No description available."}
                </p>
              </CardContent>
            </Card>

            {/* Media Assets */}
            {mediaAssets.length > 0 && (
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4">Media Gallery</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {mediaAssets.map((asset) => (
                      <div key={asset.id} className="aspect-video bg-muted rounded-lg overflow-hidden">
                        {asset.type === 'video' ? (
                          <video src={asset.url} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={asset.url} alt="Party media" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center Section - Chairperson & Candidate Buttons */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                {party.chairperson_url && (
                  <div className="mb-8">
                    <img
                      src={party.chairperson_url}
                      alt="Chairperson"
                      className="w-40 h-40 mx-auto rounded-full object-cover border-4 border-primary"
                    />
                    <p className="mt-4 text-lg font-semibold text-card-foreground">Chairperson</p>
                  </div>
                )}

                {/* Candidate Selection Buttons */}
                <div className="space-y-4">
                  <Button
                    onClick={() => onSelectCandidateType('MNA')}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="lg"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    View MNA Candidates
                  </Button>
                  
                  <Button
                    onClick={() => onSelectCandidateType('MPA')}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    size="lg"
                  >
                    <Building className="w-5 h-5 mr-2" />
                    View MPA Candidates
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Section - Party Symbol & Video */}
          <div className="space-y-6">
            {party.symbol_url && (
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4">Party Symbol</h3>
                  <img
                    src={party.symbol_url}
                    alt={`${party.name} symbol`}
                    className="w-32 h-32 mx-auto object-contain"
                  />
                </CardContent>
              </Card>
            )}

            {party.video_url && (
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4">Party Video</h3>
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <video
                      src={party.video_url}
                      controls
                      className="w-full h-full object-cover"
                      poster={party.symbol_url || undefined}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </CardContent>
              </Card>
            )}

            {party.vicechairperson_url && (
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold text-card-foreground mb-4">Vice Chairperson</h3>
                  <img
                    src={party.vicechairperson_url}
                    alt="Vice Chairperson"
                    className="w-24 h-24 mx-auto rounded-full object-cover border-2 border-accent"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Back Button at Bottom */}
        <div className="mt-12 text-center">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-border hover:bg-secondary"
            size="lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Parties
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PartyOverview;