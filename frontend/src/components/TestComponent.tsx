import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div style={{ 
      background: '#1a1a1a', 
      color: '#4af626', 
      padding: '20px',
      fontFamily: 'monospace',
      minHeight: '100vh'
    }}>
      <h1>🌾 HARVEST HOPE TEST 🌾</h1>
      <p>If you can see this, React is working!</p>
      <button onClick={() => alert('Button works!')}>
        Test Button
      </button>
    </div>
  );
};

export default TestComponent;