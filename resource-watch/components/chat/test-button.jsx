import React from 'react';

const TestButton = () => {
  return (
    <button
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        background: 'green',
        color: 'white',
        border: 'none',
        borderRadius: '50px',
        padding: '12px 20px',
        cursor: 'pointer',
        zIndex: 1000,
      }}
      onClick={() => alert('Test button works!')}
    >
      🧪 Test Button
    </button>
  );
};

export default TestButton;
