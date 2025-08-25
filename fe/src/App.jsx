import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BASE_URL = 'http://localhost:5000';

function App() {
  const [longUrl, setLongUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [urlHistory, setUrlHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem('urlHistory');
    if (savedHistory) {
      setUrlHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('urlHistory', JSON.stringify(urlHistory));
  }, [urlHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShortUrl('');
    setLoading(true);
    setCopied(false);
    setShowAnalytics(false);

    try {
      const response = await axios.post(`${BASE_URL}/api/shorten`, {
        originalUrl: longUrl,
      });
      
      if (response.data.success) {
        const newShortUrl = response.data.data.shortUrl;
        setShortUrl(newShortUrl);
        
        // Add to history
        const newEntry = {
          id: Date.now(),
          originalUrl: longUrl,
          shortUrl: newShortUrl,
          shortCode: response.data.data.shortCode,
          createdAt: new Date().toISOString(),
          clicks: response.data.data.clicks
        };
        
        setUrlHistory(prev => [newEntry, ...prev.slice(0, 9)]); // Keep only last 10
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to shorten URL. Please check the format.';
      setError(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const fetchAnalytics = async (shortCode) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/analytics/${shortCode}`);
      if (response.data.success) {
        setAnalytics(response.data.data);
        setShowAnalytics(true);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const clearHistory = () => {
    setUrlHistory([]);
    localStorage.removeItem('urlHistory');
  };

  return (
    <div className="app">
      <div className="background-gradient"></div>
      <div className="container">
        <header className="header">
          <div className="logo">
            <span className="logo-icon">🔗</span>
            <h1 className="logo-text">LinkSnap</h1>
          </div>
          <p className="subtitle">Transform long URLs into snappy links ✨</p>
        </header>

        <main className="main">
          <form onSubmit={handleSubmit} className="url-form">
            <div className="input-container">
              <input
                type="url"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                placeholder="Paste your long URL here..."
                className="url-input"
                required
                disabled={loading}
              />
              <button 
                type="submit" 
                className={`submit-btn ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <div className="spinner"></div>
                ) : (
                  <span>✨ Snap it!</span>
                )}
              </button>
            </div>
          </form>

          {shortUrl && (
            <div className="result-card">
              <div className="result-header">
                <span className="success-icon">🎉</span>
                <h3>Your snappy link is ready!</h3>
              </div>
              <div className="url-display">
                <input 
                  type="text" 
                  value={shortUrl} 
                  readOnly 
                  className="short-url-input"
                />
                <button 
                  onClick={() => copyToClipboard(shortUrl)}
                  className={`copy-btn ${copied ? 'copied' : ''}`}
                >
                  {copied ? '✅' : '📋'}
                </button>
              </div>
              <div className="result-actions">
                <a 
                  href={shortUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="test-link"
                >
                  🚀 Test Link
                </a>
                <button 
                  onClick={() => fetchAnalytics(shortUrl.split('/').pop())}
                  className="analytics-btn"
                >
                  📊 Analytics
                </button>
              </div>
            </div>
          )}

          {showAnalytics && analytics && (
            <div className="analytics-card">
              <h3>📈 Link Analytics</h3>
              <div className="analytics-grid">
                <div className="stat">
                  <span className="stat-value">{analytics.clicks}</span>
                  <span className="stat-label">Clicks</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{new Date(analytics.createdAt).toLocaleDateString()}</span>
                  <span className="stat-label">Created</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{analytics.lastAccessed ? new Date(analytics.lastAccessed).toLocaleDateString() : 'Never'}</span>
                  <span className="stat-label">Last Accessed</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-card">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {urlHistory.length > 0 && (
            <div className="history-section">
              <div className="history-header">
                <h3>🕒 Recent Links</h3>
                <button onClick={clearHistory} className="clear-btn">
                  🗑️ Clear
                </button>
              </div>
              <div className="history-list">
                {urlHistory.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-content">
                      <div className="original-url">{item.originalUrl}</div>
                      <div className="short-url">{item.shortUrl}</div>
                    </div>
                    <div className="history-actions">
                      <button 
                        onClick={() => copyToClipboard(item.shortUrl)}
                        className="mini-copy-btn"
                      >
                        📋
                      </button>
                      <button 
                        onClick={() => fetchAnalytics(item.shortCode)}
                        className="mini-analytics-btn"
                      >
                        📊
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}


export default App;