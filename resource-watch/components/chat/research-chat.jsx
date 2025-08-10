import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const ResearchChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wsClientId, setWsClientId] = useState(null);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !wsRef.current) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen]);

  const connectWebSocket = () => {
    const wsUrl = 'ws://localhost:5029/ws';
    console.log('Connecting to WebSocket:', wsUrl);
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      addMessage('system', 'Connected to research assistant. Ask me anything!');
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        if (message.clientId) {
          setWsClientId(message.clientId);
          console.log('WebSocket client ID set:', message.clientId);
        } else if (message.type === 'agentStart') {
          addMessage('system', `🔄 ${message.message}`);
        } else if (message.type === 'agentUpdate') {
          // Update the last system message with progress
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0 && newMessages[newMessages.length - 1].type === 'system') {
              newMessages[newMessages.length - 1].text = `🔄 ${message.message}`;
            }
            return newMessages;
          });
        } else if (message.type === 'agentCompleted') {
          // Update the last system message to show completion
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0 && newMessages[newMessages.length - 1].type === 'system') {
              newMessages[newMessages.length - 1].text = `✅ ${message.message}`;
            }
            return newMessages;
          });
        } else if (message.type === 'streamResponse') {
          // Handle streaming response - append to existing message or create new one
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage && lastMessage.type === 'assistant' && lastMessage.isStreaming) {
              // Append to existing streaming message
              lastMessage.text += message.content;
            } else {
              // Create new streaming message
              newMessages.push({
                type: 'assistant',
                text: message.content,
                id: Date.now(),
                isStreaming: true
              });
            }
            return newMessages;
          });
        } else if (message.type === 'streamEnd') {
          // Mark streaming as complete
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.isStreaming) {
              lastMessage.isStreaming = false;
            }
            return newMessages;
          });
          setIsLoading(false);
        } else if (message.type === 'chatMessage') {
          addMessage('assistant', message.content);
          setIsLoading(false);
        } else if (message.type === 'error') {
          addMessage('error', `Error: ${message.message}`);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    wsRef.current.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
      setWsClientId(null);
      addMessage('system', 'Connection lost. Trying to reconnect...');
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (isOpen) {
          connectWebSocket();
        }
      }, 3000);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage('error', 'Connection error. Please try again.');
    };
  };

  const addMessage = (type, text, isStreaming = false) => {
    setMessages(prev => [...prev, { type, text, id: Date.now(), isStreaming }]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !wsClientId || isLoading) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    addMessage('user', message);
    setIsLoading(true);
    
    try {
      const payload = {
        type: 'chatMessage',
        content: message,
        clientId: wsClientId
      };
      
      wsRef.current.send(JSON.stringify(payload));
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('error', 'Failed to send message. Please try again.');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="research-chat-overlay">
      <div className="research-chat-container">
        <div className="research-chat-header">
          <h3>🔍 Research Assistant</h3>
          <button 
            type="button" 
            className="research-chat-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="research-chat-messages">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`research-chat-message research-chat-message-${msg.type}`}
            >
              <div className="research-chat-message-content">
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="research-chat-message research-chat-message-system">
              <div className="research-chat-message-content">
                🤔 Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="research-chat-input-container">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Ask me anything about the data..." : "Connecting..."}
            disabled={!isConnected || isLoading}
            className="research-chat-input"
            rows="3"
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || isLoading || !inputMessage.trim()}
            className="research-chat-send"
          >
            Send
          </button>
        </div>
        
        <div className="research-chat-status">
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>
      
      <style jsx>{`
        .research-chat-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .research-chat-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          width: 90%;
          max-width: 500px;
          height: 80%;
          max-height: 600px;
          display: flex;
          flex-direction: column;
        }
        
        .research-chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
          background: #f8f9fa;
          border-radius: 8px 8px 0 0;
        }
        
        .research-chat-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        
        .research-chat-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        
        .research-chat-close:hover {
          background: #e0e0e0;
        }
        
        .research-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .research-chat-message {
          display: flex;
          margin-bottom: 8px;
        }
        
        .research-chat-message-user {
          justify-content: flex-end;
        }
        
        .research-chat-message-assistant,
        .research-chat-message-system,
        .research-chat-message-error {
          justify-content: flex-start;
        }
        
        .research-chat-message-content {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 18px;
          word-wrap: break-word;
          line-height: 1.4;
        }
        
        .research-chat-message-user .research-chat-message-content {
          background: #007bff;
          color: white;
          border-radius: 18px 18px 4px 18px;
        }
        
        .research-chat-message-assistant .research-chat-message-content {
          background: #f1f3f4;
          color: #333;
          border-radius: 18px 18px 18px 4px;
        }
        
        .research-chat-message-system .research-chat-message-content {
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 18px;
          font-style: italic;
        }
        
        .research-chat-message-error .research-chat-message-content {
          background: #ffebee;
          color: #c62828;
          border-radius: 18px;
        }
        
        .research-chat-input-container {
          padding: 16px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        
        .research-chat-input {
          flex: 1;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 12px;
          font-family: inherit;
          font-size: 14px;
          resize: none;
          outline: none;
        }
        
        .research-chat-input:focus {
          border-color: #007bff;
        }
        
        .research-chat-input:disabled {
          background: #f5f5f5;
          color: #999;
        }
        
        .research-chat-send {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          min-width: 80px;
        }
        
        .research-chat-send:hover:not(:disabled) {
          background: #0056b3;
        }
        
        .research-chat-send:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .research-chat-status {
          padding: 8px 16px;
          font-size: 12px;
          color: #666;
          text-align: center;
          border-top: 1px solid #e0e0e0;
        }
      `}</style>
    </div>
  );
};

ResearchChat.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ResearchChat;

