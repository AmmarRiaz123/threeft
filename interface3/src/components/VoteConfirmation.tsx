import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Hash, Shield, Home, X, AlertCircle, MessageSquare } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoteConfirmationProps {
  token: string;
  mnaCandidate?: { id: string; name: string; constituency: string };
  mpaCandidate?: { id: string; name: string; constituency: string };
  onEndSession: () => void;
  onGoHome: () => void;
  onShowFeedback: () => void;
}

const VoteConfirmation = ({ 
  token, 
  mnaCandidate, 
  mpaCandidate, 
  onEndSession, 
  onGoHome,
  onShowFeedback 
}: VoteConfirmationProps) => {
  const [voteHash, setVoteHash] = useState("");
  const [showFeedbackOption, setShowFeedbackOption] = useState(false);
  const [isVoteSubmitted, setIsVoteSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isVoteSubmitted) {
      // Show feedback option after 2 seconds only after vote is submitted
      setTimeout(() => setShowFeedbackOption(true), 2000);
    }
  }, [isVoteSubmitted]);

  const generateVoteHash = async () => {
    const hashInput = `${token}:${mnaCandidate?.id || 'none'}:${mpaCandidate?.id || 'none'}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(hashInput);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    setVoteHash(hashHex.substring(0, 16) + "...");
    return hashHex;
  };

  const handleConfirmVote = async () => {
    if (isSubmitting || isVoteSubmitted) return;
    
    setIsSubmitting(true);
    
    try {
      // Generate full hash
      const fullHash = await generateVoteHash();
      
      // Store vote in database
      const { error } = await supabase
        .from('votes')
        .insert({
          token: token,
          mna_candidate_id: mnaCandidate?.id || null,
          mpa_candidate_id: mpaCandidate?.id || null,
          vote_hash: fullHash,
          status: 'completed'
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Vote Already Submitted",
            description: "This token has already been used for voting.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        setIsSubmitting(false);
        return;
      }

      // Vote submitted successfully
      setIsVoteSubmitted(true);
      setIsSubmitting(false);
      
      toast({
        title: "Vote Submitted Successfully",
        description: "Your vote has been securely recorded.",
        variant: "default"
      });
      
    } catch (err) {
      console.error('Error submitting vote:', err);
      toast({
        title: "Error Submitting Vote",
        description: "Please try again or contact support.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  // Show success screen after vote is submitted
  if (isVoteSubmitted) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-2xl animate-bounce-in">
            <CardContent className="p-8 text-center space-y-6">
              {/* Success Icon */}
              <div className="flex justify-center">
                <CheckCircle className="w-20 h-20 text-green-500 animate-bounce-in" />
              </div>

              {/* Success Message */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">
                  🎉 Your vote has been securely recorded
                </h1>
                <p className="text-muted-foreground">
                  Thank you for participating in the democratic process
                </p>
              </div>

              {/* Vote Summary */}
              <div className="bg-muted rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Vote Summary</h3>
                
                {mnaCandidate && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">MNA Candidate:</span>
                    <span className="font-medium text-foreground">
                      {mnaCandidate.name} ({mnaCandidate.constituency})
                    </span>
                  </div>
                )}
                
                {mpaCandidate && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">MPA Candidate:</span>
                    <span className="font-medium text-foreground">
                      {mpaCandidate.name} ({mpaCandidate.constituency})
                    </span>
                  </div>
                )}
              </div>

              {/* Vote Hash */}
              {voteHash && (
                <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <Hash className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-card-foreground">Vote Hash</h3>
                  </div>
                  
                  <div className="bg-muted rounded p-3">
                    <code className="text-sm font-mono text-foreground break-all">
                      {voteHash}
                    </code>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span>Your vote is encrypted. Keep this hash for reference.</span>
                  </div>
                </div>
              )}

              {/* Main Actions - End session with optional feedback */}
              <div className="flex space-x-4">
                <Button
                  onClick={() => setShowEndSessionDialog(true)}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  End Session
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
        
        {/* End Session Dialog with Optional Feedback */}
        <Dialog open={showEndSessionDialog} onOpenChange={setShowEndSessionDialog}>
          <DialogContent className="sm:max-w-md animate-scale-in">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span>End Session</span>
              </DialogTitle>
              <DialogDescription>
                Thank you for voting! Would you like to provide anonymous feedback to help us improve the voting experience?
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="sm:flex-col sm:space-y-2 sm:space-x-0">
              <Button
                onClick={() => {
                  setShowEndSessionDialog(false);
                  onShowFeedback();
                }}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Provide Feedback
              </Button>
              <Button
                onClick={() => {
                  setShowEndSessionDialog(false);
                  onEndSession();
                }}
                variant="outline"
                className="w-full"
              >
                End Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show confirmation dialog before voting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-2xl animate-scale-in">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              Confirm Your Vote
            </h1>
            <p className="text-muted-foreground">
              Please review your selections before submitting your vote
            </p>
          </div>

          {/* Vote Summary */}
          <div className="bg-muted rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Your Selections</h3>
            
            {mnaCandidate && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">MNA Candidate:</span>
                <span className="font-medium text-foreground">
                  {mnaCandidate.name} ({mnaCandidate.constituency})
                </span>
              </div>
            )}
            
            {mpaCandidate && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">MPA Candidate:</span>
                <span className="font-medium text-foreground">
                  {mpaCandidate.name} ({mpaCandidate.constituency})
                </span>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Important: Once you submit your vote, it cannot be changed or undone.
                </p>
                <p className="text-yellow-600 dark:text-yellow-300 mt-1">
                  Please make sure your selections are correct before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <Button
              onClick={onGoHome}
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
            >
              Go Back & Change
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Vote"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Vote Submission</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you absolutely sure you want to submit your vote? This action cannot be undone, 
                    and you will not be able to vote again with this token.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmVote} disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Yes, Submit Vote"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoteConfirmation;