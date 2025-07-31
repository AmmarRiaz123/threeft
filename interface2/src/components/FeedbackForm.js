import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const FeedbackForm = ({ token, onSubmit }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

 const handleSubmit = async () => {
  if (!text.trim()) return alert('Please enter feedback.');

  setLoading(true);
  const { data, error } = await supabase
    .from('feedback')
    .insert([{ text: text, token: token }]);

  if (error) {
    console.error('Supabase error:', error); // 👈 log actual error in console
    alert('Error submitting feedback.');
  } else {
    console.log('Inserted:', data);
    onSubmit();
  }

  setLoading(false);
};


  return (
    <div className="screen">
      <h2>Feedback Form</h2>
      <p>Token: {token}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter your feedback..."
      />
      <br />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  );
};

export default FeedbackForm;
