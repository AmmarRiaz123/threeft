import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StarRating from "@/components/ui/star-rating";

interface FeedbackScreenProps {
  token: string;
  onComplete: () => void;
  onCancel: () => void;
}

const FeedbackScreen = ({ token, onComplete, onCancel }: FeedbackScreenProps) => {
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!feedback.trim() && !rating) {
      toast({
        title: "Feedback Required",
        description: "Please provide either a rating or written feedback before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Generate a unique session ID based on token and timestamp
      const sessionId = `${token.slice(0, 8)}-${Date.now()}`;
      
      const { error } = await supabase
        .from('feedbackinterface3')
        .insert({
          feedback_text: feedback.trim(),
          session_id: sessionId,
          rating: rating
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your valuable feedback!",
      });

      // Auto-complete after showing success message
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Thank You!
              </h2>
              <p className="text-muted-foreground">
                Your feedback has been submitted successfully.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-center justify-center">
            <MessageSquare className="w-6 h-6 text-primary" />
            <span className="text-2xl text-foreground">Share Your Feedback</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Your feedback helps us improve the voting experience for everyone. 
              This feedback is completely anonymous.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Rate your experience
              </label>
              <div className="flex flex-col items-center space-y-2">
                <StarRating
                  value={rating}
                  onChange={setRating}
                  size={32}
                />
                <p className="text-xs text-muted-foreground">
                  {rating ? `You rated: ${rating} star${rating > 1 ? 's' : ''}` : 'Click to rate'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="feedback" className="text-sm font-medium text-foreground">
                Additional comments (optional)
              </label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your thoughts about the voting process, user interface, or any suggestions for improvement..."
                className="min-h-32 bg-input border-border resize-none"
                maxLength={500}
              />
              <div className="text-right text-xs text-muted-foreground">
                {feedback.length}/500 characters
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 border-border hover:bg-secondary"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Feedback
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!feedback.trim() && !rating)}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackScreen;