import React, { useState } from 'react';
import TokenEntry from '../components/TokenEntry';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co'; // apna project URL
const supabaseKey = 'YOUR_ANON_KEY'; // apni anon key
const supabase = createClient(supabaseUrl, supabaseKey);

const KioskFlow = ({ onSubmit }) => {
  const [step, setStep] = useState(0);

  const nextStep = () => setStep(step + 1);

  const verifyToken = async (token) => {
    try {
      const { data, error } = await supabase
        .from('registered_voters')
        .select('id')
        .eq('token', token)
        .maybeSingle();

      if (error) {
        console.error('Supabase error:', error);
        return false;
      }
      return !!data; // agar data hai to true, warna false
    } catch (err) {
      console.error('Unexpected error:', err);
      return false;
    }
  };

  const handleValidToken = (token) => {
    onSubmit(token);
    nextStep();
  };

  return (
    <div>
      {step === 0 && (
        <TokenEntry verifyToken={verifyToken} onSubmit={handleValidToken} />
      )}
      {/* baki steps yahan add karen */}
    </div>
  );
};

export default KioskFlow;
