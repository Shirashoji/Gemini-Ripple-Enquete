import React, { useState, useEffect } from 'react';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');

  // Load the API key from storage when the component mounts
  useEffect(() => {
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
      if (result.geminiApiKey) {
        setApiKey(result.geminiApiKey);
      }
    });
  }, []);

  

  const handleSaveClick = () => {
    chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
      setStatus('APIキーを保存しました！');
      setTimeout(() => setStatus(''), 3000); // Hide message after 3 seconds
    });
  };

  return (
    <div style={{ width: '300px', padding: '10px', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '15px' }}>Gemini Reviewer</h2>
      
      <div>
        <label htmlFor="api-key" style={{ display: 'block', marginBottom: '5px' }}>Gemini API Key:</label>
        <input
          type="password"
          id="api-key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '10px' }}
        />
      </div>
      <button onClick={handleSaveClick} style={{ width: '100%', padding: '8px', cursor: 'pointer' }}>
        保存
      </button>
      {status && <div style={{ marginTop: '10px', color: 'green', textAlign: 'center' }}>{status}</div>}
    </div>
  );
}

export default App;