import React from 'react';
import PropTypes from 'prop-types';

const ChatButton = ({ onClick }) => {
  return (
    <button
      type="button"
      className="chat-button"
      onClick={onClick}
      title="Ask Research Assistant"
    >
      <span className="chat-button-icon">🔍</span>
      <span className="chat-button-text">Research</span>
      
      <style jsx>{`
        .chat-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 50px;
          padding: 12px 20px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          z-index: 1000;
          transition: all 0.2s ease;
        }
        
        .chat-button:hover {
          background: #0056b3;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 123, 255, 0.4);
        }
        
        .chat-button:active {
          transform: translateY(0);
        }
        
        .chat-button-icon {
          font-size: 16px;
        }
        
        .chat-button-text {
          white-space: nowrap;
        }
        
        @media (max-width: 768px) {
          .chat-button {
            bottom: 15px;
            right: 15px;
            padding: 10px 16px;
          }
          
          .chat-button-text {
            display: none;
          }
        }
      `}</style>
    </button>
  );
};

ChatButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default ChatButton;

