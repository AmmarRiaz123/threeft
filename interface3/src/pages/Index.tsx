import { useState } from "react";
import TokenVerification from "@/components/TokenVerification";
import PartySelection from "@/components/PartySelection";
import PartyOverview from "@/components/PartyOverview";
import CandidateSelection from "@/components/CandidateSelection";
import VoteConfirmation from "@/components/VoteConfirmation";
import FeedbackScreen from "@/components/FeedbackScreen";

type VotingStep = 'token' | 'parties' | 'party-overview' | 'mna-selection' | 'mpa-selection' | 'confirmation' | 'feedback';

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

const Index = () => {
  const [currentStep, setCurrentStep] = useState<VotingStep>('token');
  const [token, setToken] = useState("");
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [selectedMNACandidate, setSelectedMNACandidate] = useState<Candidate | null>(null);
  const [selectedMPACandidate, setSelectedMPACandidate] = useState<Candidate | null>(null);
  const [mnaParty, setMnaParty] = useState<Party | null>(null);
  const [mpaParty, setMpaParty] = useState<Party | null>(null);

  const handleTokenVerification = (verifiedToken: string) => {
    setToken(verifiedToken);
    setCurrentStep('parties');
  };

  const handlePartySelect = (party: Party) => {
    setSelectedParty(party);
    setCurrentStep('party-overview');
  };

  const handlePartySelectForCandidate = (party: Party, candidateType: 'MNA' | 'MPA') => {
    setSelectedParty(party);
    if (candidateType === 'MNA') {
      setMnaParty(party);
      setCurrentStep('mna-selection');
    } else {
      setMpaParty(party);
      setCurrentStep('mpa-selection');
    }
  };

  const handleCandidateTypeSelect = (type: 'MNA' | 'MPA') => {
    if (type === 'MNA') {
      setMnaParty(selectedParty);
      setCurrentStep('mna-selection');
    } else {
      setMpaParty(selectedParty);
      setCurrentStep('mpa-selection');
    }
  };

  const handleMNACandidateSelect = (candidate: Candidate) => {
    setSelectedMNACandidate(candidate);
    // Check if user needs to select MPA - if not, go to confirmation
    if (selectedMPACandidate) {
      setCurrentStep('confirmation');
    } else {
      setCurrentStep('parties');
    }
  };

  const handleMPACandidateSelect = (candidate: Candidate) => {
    setSelectedMPACandidate(candidate);
    // Check if user needs to select MNA - if not, go to confirmation
    if (selectedMNACandidate) {
      setCurrentStep('confirmation');
    } else {
      setCurrentStep('parties');
    }
  };

  const handleBackToPartyOverview = () => {
    setCurrentStep('party-overview');
  };

  const handleBackToMNASelection = () => {
    setCurrentStep('mna-selection');
  };

  const handleBackToParties = () => {
    setSelectedParty(null);
    setCurrentStep('parties');
  };

  const handleEndSession = () => {
    // Reset all state
    setCurrentStep('token');
    setToken("");
    setSelectedParty(null);
    setSelectedMNACandidate(null);
    setSelectedMPACandidate(null);
    setMnaParty(null);
    setMpaParty(null);
  };

  const handleGoHome = () => {
    setCurrentStep('parties');
  };

  const handleProceedToConfirmation = () => {
    setCurrentStep('confirmation');
  };

  const handleShowFeedback = () => {
    setCurrentStep('feedback');
  };

  const handleFeedbackComplete = () => {
    handleEndSession();
  };

  const handleFeedbackCancel = () => {
    setCurrentStep('confirmation');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'token':
        return <TokenVerification onVerificationSuccess={handleTokenVerification} />;
      
      case 'parties':
        return <PartySelection 
          onPartySelect={handlePartySelect} 
          onPartySelectForCandidate={handlePartySelectForCandidate}
          selectedMNACandidate={selectedMNACandidate}
          selectedMPACandidate={selectedMPACandidate}
          onProceedToConfirmation={handleProceedToConfirmation}
        />;
      
      case 'party-overview':
        return selectedParty ? (
          <PartyOverview 
            party={selectedParty}
            onBack={handleBackToParties}
            onSelectCandidateType={handleCandidateTypeSelect}
          />
        ) : null;
      
      case 'mna-selection':
        return mnaParty ? (
          <CandidateSelection
            partyId={mnaParty.id}
            candidateType="MNA"
            onBack={handleBackToParties}
            onCandidateSelect={handleMNACandidateSelect}
            onBackToParties={handleBackToParties}
          />
        ) : null;
      
      case 'mpa-selection':
        return mpaParty ? (
          <CandidateSelection
            partyId={mpaParty.id}
            candidateType="MPA"
            onBack={handleBackToParties}
            onCandidateSelect={handleMPACandidateSelect}
            onBackToParties={handleBackToParties}
          />
        ) : null;
      
      case 'confirmation':
        return (
          <VoteConfirmation
            token={token}
            mnaCandidate={selectedMNACandidate ? {
              id: selectedMNACandidate.id,
              name: selectedMNACandidate.name,
              constituency: selectedMNACandidate.constituency
            } : undefined}
            mpaCandidate={selectedMPACandidate ? {
              id: selectedMPACandidate.id,
              name: selectedMPACandidate.name,
              constituency: selectedMPACandidate.constituency
            } : undefined}
            onEndSession={handleEndSession}
            onGoHome={handleGoHome}
            onShowFeedback={handleShowFeedback}
          />
        );
      
      case 'feedback':
        return (
          <FeedbackScreen
            token={token}
            onComplete={handleFeedbackComplete}
            onCancel={handleFeedbackCancel}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div key={currentStep} className="animate-fade-in">
      {renderStep()}
    </div>
  );
};

export default Index;
