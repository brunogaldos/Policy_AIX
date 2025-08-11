import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

// services
import * as researchAPI from 'services/research-api';

// utils
import { logger } from 'utils/logs';

/**
 * Research Chatbot Component
 * Adapted from WebApp LiveResearchChatBot for Resource Watch
 * Provides a chat interface for live web research functionality
 */
const ResearchChatbot = ({
  isOpen,
  onClose,
  numberOfSelectQueries = 7,
  percentOfTopQueriesToSearch = 0.25,
  percentOfTopResultsToScan = 0.25,
  className = '',
}) => {
  // State management
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wsClientId, setWsClientId] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isConnectingRef = useRef(false);
  const streamingTimeoutRef = useRef(null);

  // Default info message
  const defaultInfoMessage = "I'm your helpful web research assistant";
  const textInputLabel = 'Please state your research question.';

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /**
   * Mark streaming as complete after timeout
   */
  const markStreamingComplete = useCallback(() => {
    setMessages((prev) => {
      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];
      
      if (lastMessage && lastMessage.isStreaming) {
        lastMessage.isStreaming = false;
        lastMessage.timestamp = new Date();
      }
      
      return newMessages;
    });
    setIsLoading(false);
  }, []);

  /**
   * Clear old messages to prevent payload size issues
   */
  const clearOldMessages = useCallback(() => {
    setMessages((prev) => {
      // Keep only the last 10 messages to prevent payload size issues
      const recentMessages = prev.slice(-10);
      logger.info('Cleared old messages, kept', recentMessages.length, 'recent messages');
      return recentMessages;
    });
  }, []);

  /**
   * Add message to chat log
   */
  const addMessage = useCallback(
    (sender, message, messageType = 'text') => {
      const newMessage = {
        id: Date.now() + Math.random(),
        sender,
        message,
        messageType,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);

      // Scroll to bottom after message is added
      setTimeout(scrollToBottom, 100);
    },
    [scrollToBottom],
  );

  /**
   * Update the last message (useful for progress updates)
   */
  const updateLastMessage = useCallback((message) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;

      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];

      if (lastMessage.sender === 'system') {
        lastMessage.message = message;
        lastMessage.timestamp = new Date();
      }

      return newMessages;
    });
  }, []);

  /**
   * Initialize WebSocket connection
   */
  const initializeWebSocket = useCallback(async () => {
    if (isConnectingRef.current || isConnected) {
      return;
    }

    isConnectingRef.current = true;
    setIsInitializing(true);
    setConnectionError(null);

    try {
      logger.info('Initializing WebSocket connection for research chatbot');

      // Establish WebSocket connection and get client ID
      const clientId = await researchAPI.establishWebSocket();
      setWsClientId(clientId);
      setIsConnected(true);

      logger.info('Research chatbot WebSocket connected with client ID:', clientId);
      addMessage('system', defaultInfoMessage);
    } catch (error) {
      logger.error('Failed to initialize WebSocket connection:', error);
      setConnectionError(error.message || 'Failed to connect to research service');
      addMessage('system', 'Failed to connect to research service. Please try again.');
    } finally {
      setIsInitializing(false);
      isConnectingRef.current = false;
    }
  }, [isConnected, addMessage, defaultInfoMessage]);

  /**
   * Handle WebSocket messages
   */
  const handleWebSocketMessage = useCallback(
    (message) => {
      console.log('🔍 DEBUG: Research chatbot received WebSocket message:', message);
      logger.info('Research chatbot received WebSocket message:', message);

      switch (message.type) {
        case 'agent_start':
          // Add a new progress message for each research step
          addMessage('system', `🔄 ${message.data?.message || message.message || 'Starting research...'}`);
          break;

        case 'agent_update':
          // Update the last system message with progress
          updateLastMessage(`🔄 ${message.data?.message || message.message || 'Research in progress...'}`);
          break;

        case 'agent_completed':
          // Mark the current step as completed
          updateLastMessage(`✅ ${message.data?.message || message.message || 'Research step completed'}`);
          break;

        case 'chat_response':
          // Handle streaming chat responses
          if (message.data?.content || message.content) {
            const content = message.data?.content || message.content;
            addMessage('assistant', content, 'research_result');
            setIsLoading(false);
          }
          break;

        case 'stream_response':
        case 'stream':
          // Handle streaming responses (partial content)
          console.log('🔍 DEBUG: Processing stream message:', message);
          
          // Extract content from various possible locations
          let content = null;
          if (message.data?.content || message.content) {
            content = message.data?.content || message.content;
          } else if (message.data?.message || message.message) {
            content = message.data?.message || message.message;
          } else if (message.data?.text || message.text) {
            content = message.data?.text || message.text;
          }
          
          if (content) {
            console.log('🔍 DEBUG: Content to append:', content);
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              
              if (lastMessage && lastMessage.sender === 'assistant' && lastMessage.messageType === 'research_result' && lastMessage.isStreaming) {
                // Append to existing streaming message
                lastMessage.message += content;
                lastMessage.timestamp = new Date();
              } else {
                // Create new streaming message
                const newMessage = {
                  id: Date.now() + Math.random(),
                  sender: 'assistant',
                  message: content,
                  messageType: 'research_result',
                  timestamp: new Date(),
                  isStreaming: true, // Mark as streaming
                };
                newMessages.push(newMessage);
              }
              
              return newMessages;
            });
            
            // Clear existing timeout and set new one
            if (streamingTimeoutRef.current) {
              clearTimeout(streamingTimeoutRef.current);
            }
            streamingTimeoutRef.current = setTimeout(markStreamingComplete, 2000); // 2 second timeout
            
            // Scroll to bottom after update
            setTimeout(scrollToBottom, 100);
          }
          break;

        case 'stream_end':
        case 'end':
        case 'complete':
        case 'finished':
          // End of streaming response
          console.log('🔍 DEBUG: Streaming ended:', message.type);
          
          // Clear streaming timeout
          if (streamingTimeoutRef.current) {
            clearTimeout(streamingTimeoutRef.current);
            streamingTimeoutRef.current = null;
          }
          
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage && lastMessage.isStreaming) {
              // Mark streaming as complete
              lastMessage.isStreaming = false;
              lastMessage.timestamp = new Date();
            }
            
            return newMessages;
          });
          setIsLoading(false);
          break;

        case 'error':
          addMessage('system', `❌ Error: ${message.data?.message || message.message || 'An error occurred'}`);
          setIsLoading(false);
          break;

        case 'cost_update':
          // Handle cost updates (optional - could be displayed in UI)
          logger.info('Research cost update:', message.data);
          break;

                default:
          // Handle other message types or generic responses
          console.log('🔍 DEBUG: Unhandled message type:', message.type, message);
          logger.info('Unhandled message type:', message.type, message);
          
          // Check if this is a streaming chunk with role and content structure
          if (message.role && message.content) {
            console.log('🔍 DEBUG: Processing role/content chunk:', message);
            
            // Always treat role/content chunks as streaming content
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              
              if (lastMessage && lastMessage.sender === 'assistant' && lastMessage.messageType === 'research_result' && lastMessage.isStreaming) {
                // Append to existing streaming message
                lastMessage.message += message.content;
                lastMessage.timestamp = new Date();
              } else {
                // Create new streaming message
                const newMessage = {
                  id: Date.now() + Math.random(),
                  sender: 'assistant',
                  message: message.content,
                  messageType: 'research_result',
                  timestamp: new Date(),
                  isStreaming: true,
                };
                newMessages.push(newMessage);
              }
              
              return newMessages;
            });
            
            // Clear existing timeout and set new one
            if (streamingTimeoutRef.current) {
              clearTimeout(streamingTimeoutRef.current);
            }
            streamingTimeoutRef.current = setTimeout(markStreamingComplete, 2000); // 2 second timeout
            
            // Scroll to bottom after update
            setTimeout(scrollToBottom, 100);
          } else {
            // Try to extract content from various possible locations
            let content = null;
            if (message.data?.content || message.content) {
              content = message.data?.content || message.content;
            } else if (message.data?.message || message.message) {
              content = message.data?.message || message.message;
            } else if (message.data?.text || message.text) {
              content = message.data?.text || message.text;
            }
            
            if (content) {
              // Check if this looks like a streaming response (single character or word)
              const isStreamingChunk = content.length <= 5 && !content.includes(' ');
              
              if (isStreamingChunk) {
                // Handle as streaming content
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  
                  if (lastMessage && lastMessage.sender === 'assistant' && lastMessage.messageType === 'research_result') {
                    // Append to existing streaming message
                    lastMessage.message += content;
                    lastMessage.timestamp = new Date();
                  } else {
                    // Create new streaming message
                    const newMessage = {
                      id: Date.now() + Math.random(),
                      sender: 'assistant',
                      message: content,
                      messageType: 'research_result',
                      timestamp: new Date(),
                      isStreaming: true,
                    };
                    newMessages.push(newMessage);
                  }
                  
                  return newMessages;
                });
                
                // Clear existing timeout and set new one
                if (streamingTimeoutRef.current) {
                  clearTimeout(streamingTimeoutRef.current);
                }
                streamingTimeoutRef.current = setTimeout(markStreamingComplete, 2000); // 2 second timeout
                
                // Scroll to bottom after update
                setTimeout(scrollToBottom, 100);
              } else {
                // Handle as complete message
                addMessage('assistant', content, 'research_result');
                setIsLoading(false);
              }
            } else if (message.message) {
              // Fallback for messages with just a message field
              addMessage('system', message.message);
            }
          }
          break;
      }
    },
    [addMessage, updateLastMessage, scrollToBottom],
  );

  /**
   * Handle connection status changes
   */
  const handleConnectionChange = useCallback(
    (status) => {
      logger.info('Research chatbot connection status changed:', status);

      if (status.type === 'connected') {
        setIsConnected(true);
        setConnectionError(null);
      } else if (status.type === 'disconnected') {
        setIsConnected(false);
        setWsClientId(null);
        addMessage('system', 'Connection lost. Attempting to reconnect...');
      }
    },
    [addMessage],
  );

  /**
   * Handle connection errors
   */
  const handleConnectionError = useCallback(
    (error) => {
      logger.error('Research chatbot connection error:', error);
      setConnectionError(error.message || 'Connection error');
      setIsConnected(false);
      setWsClientId(null);
      addMessage('system', `❌ Connection error: ${error.message || 'Unknown error'}`);
    },
    [addMessage],
  );

  /**
   * Send chat message
   */
  const sendChatMessage = useCallback(async () => {
    if (!inputMessage.trim() || !wsClientId || isLoading) {
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message to chat
    addMessage('user', userMessage);

    try {
      // Convert messages to simplified format for API
      // Filter out system messages and limit to recent messages to prevent payload size issues
      const relevantMessages = [...messages, { sender: 'user', message: userMessage }]
        .filter(msg => msg.sender === 'user' || msg.sender === 'assistant')
        .slice(-20); // Keep only last 20 messages to prevent payload size issues
      
      const simplifiedChatLog = relevantMessages.map(
        (msg) => ({
          sender: msg.sender,
          message: msg.message,
          timestamp: msg.timestamp,
        }),
      );

      // Check payload size and auto-clear if too large
      const payloadSize = JSON.stringify(simplifiedChatLog).length;
      
      if (payloadSize > 100000) { // 100KB limit
        logger.warn('Payload too large, clearing old messages automatically');
        clearOldMessages();
        // Recreate simplified chat log with fewer messages
        const recentMessages = [...messages, { sender: 'user', message: userMessage }]
          .filter(msg => msg.sender === 'user' || msg.sender === 'assistant')
          .slice(-10); // Keep only last 10 messages
        
        simplifiedChatLog.length = 0; // Clear array
        simplifiedChatLog.push(...recentMessages.map(msg => ({
          sender: msg.sender,
          message: msg.message,
          timestamp: msg.timestamp,
        })));
      }
      
      // Log final payload size for debugging
      const finalPayloadSize = JSON.stringify(simplifiedChatLog).length;
      logger.info('Sending research conversation request with parameters:', {
        numberOfSelectQueries,
        percentOfTopQueriesToSearch,
        percentOfTopResultsToScan,
        chatLogLength: simplifiedChatLog.length,
        payloadSizeBytes: finalPayloadSize,
        payloadSizeKB: Math.round(finalPayloadSize / 1024 * 100) / 100,
        wsClientId,
      });
      
      // Warn if payload is still getting large
      if (finalPayloadSize > 50000) { // 50KB limit
        logger.warn('Large payload detected, consider reducing chat history');
      }

      // Add initial research status message
      addMessage('system', '🔄 Initiating research pipeline...');

      // Send conversation request to research API
      await researchAPI.conversation(simplifiedChatLog, {
        numberOfSelectQueries,
        percentOfTopQueriesToSearch,
        percentOfTopResultsToScan,
      });

      logger.info('Research conversation request sent successfully');
    } catch (error) {
      logger.error('Error sending research conversation request:', error);
      addMessage('system', `❌ Failed to send message: ${error.message}`);
      setIsLoading(false);
    }
  }, [
    inputMessage,
    wsClientId,
    isLoading,
    messages,
    addMessage,
    numberOfSelectQueries,
    percentOfTopQueriesToSearch,
    percentOfTopResultsToScan,
  ]);

  /**
   * Handle key press in input
   */
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    },
    [sendChatMessage],
  );

  /**
   * Retry connection
   */
  const retryConnection = useCallback(() => {
    setConnectionError(null);
    initializeWebSocket();
  }, [initializeWebSocket]);

  // Effect: Initialize WebSocket when component opens
  useEffect(() => {
    if (isOpen && !isConnected && !isInitializing) {
      initializeWebSocket();
    }
  }, [isOpen, isConnected, isInitializing, initializeWebSocket]);

  // Effect: Set up WebSocket message handlers
  useEffect(() => {
    if (isOpen) {
      // Add message handlers
      researchAPI.onMessage('*', handleWebSocketMessage);
      researchAPI.onConnection(handleConnectionChange);
      researchAPI.onError(handleConnectionError);

      return () => {
        // Clean up handlers
        researchAPI.offMessage('*', handleWebSocketMessage);
        researchAPI.offConnection(handleConnectionChange);
        researchAPI.offError(handleConnectionError);
      };
    }
  }, [isOpen, handleWebSocketMessage, handleConnectionChange, handleConnectionError]);

  // Effect: Focus input when connected
  useEffect(() => {
    if (isConnected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isConnected]);

  // Effect: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isOpen) {
        // Don't close connection on unmount to maintain state
        // Connection will be managed by the service
      }
    };
  }, [isOpen]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div className={`research-chatbot-overlay ${className}`}>
      <div className="research-chatbot-container">
        {/* Header */}
        <div className="research-chatbot-header">
          <div className="research-chatbot-title">
            <span className="research-chatbot-icon">🔍</span>
            <h3>Research Assistant</h3>
          </div>
          <div className="research-chatbot-header-actions">
            {messages.length > 5 && (
              <button
                type="button"
                className="research-chatbot-clear"
                onClick={clearOldMessages}
                aria-label="Clear chat history"
                title="Clear old messages to reduce payload size"
              >
                🗑️ Clear
              </button>
            )}
            <button
              type="button"
              className="research-chatbot-close"
              onClick={onClose}
              aria-label="Close research assistant"
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="research-chatbot-messages">
          {messages.length === 0 && !isInitializing && (
            <div className="research-chatbot-welcome">
              <div className="research-chatbot-welcome-icon">🔍</div>
              <h4>Welcome to Research Assistant</h4>
              <p>Ask me anything and I'll search the web to find comprehensive answers for you.</p>
            </div>
          )}

          {isInitializing && (
            <div className="research-chatbot-message research-chatbot-message-system">
              <div className="research-chatbot-message-content">
                🔄 Connecting to research service...
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`research-chatbot-message research-chatbot-message-${msg.sender} ${
                msg.messageType === 'research_result' ? 'research-chatbot-message-research' : ''
              }`}
            >
              <div className="research-chatbot-message-content">
                {msg.messageType === 'research_result' ? (
                  <div className="research-chatbot-research-content">
                    {/* Format research results with markdown-like styling */}
                    {msg.message.split('\n').map((line, index) => {
                      // Handle markdown links
                      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                      const parts = [];
                      let lastIndex = 0;
                      let match;

                      while ((match = linkRegex.exec(line)) !== null) {
                        // Add text before the link
                        if (match.index > lastIndex) {
                          parts.push(line.substring(lastIndex, match.index));
                        }
                        // Add the link
                        parts.push(
                          <a
                            key={`link-${index}-${match.index}`}
                            href={match[2]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="research-chatbot-link"
                          >
                            {match[1]}
                          </a>
                        );
                        lastIndex = match.index + match[0].length;
                      }

                      // Add remaining text
                      if (lastIndex < line.length) {
                        parts.push(line.substring(lastIndex));
                      }

                      // If no links found, just use the line as is
                      if (parts.length === 0) {
                        parts.push(line);
                      }

                      return (
                        <div key={index} className="research-chatbot-line">
                          {parts.length > 0 ? parts : line}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  msg.message
                )}
                {msg.isStreaming && (
                  <span className="research-chatbot-streaming-indicator">▋</span>
                )}
              </div>
              <div className="research-chatbot-message-time">
                {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="research-chatbot-message research-chatbot-message-assistant">
              <div className="research-chatbot-message-content">
                <div className="research-chatbot-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="research-chatbot-input-container">
          {connectionError && (
            <div className="research-chatbot-error">
              <span>❌ {connectionError}</span>
              <button type="button" onClick={retryConnection} className="research-chatbot-retry">
                Retry
              </button>
            </div>
          )}

          <div className="research-chatbot-input-wrapper">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? textInputLabel : 'Connecting...'}
              disabled={!isConnected || isLoading || isInitializing}
              className="research-chatbot-input"
              rows="2"
              maxLength={1000}
            />
            <button
              onClick={sendChatMessage}
              disabled={!isConnected || isLoading || !inputMessage.trim() || isInitializing}
              className="research-chatbot-send"
              aria-label="Send message"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>

          <div className="research-chatbot-status">
            <span
              className={`research-chatbot-status-indicator ${
                isConnected ? 'connected' : 'disconnected'
              }`}
            >
              {isConnected ? '🟢' : '🔴'}
            </span>
            <span className="research-chatbot-status-text">
              {isInitializing ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .research-chatbot-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .research-chatbot-container {
          background: #40505A; // Dark teal-grey like Climate TRACE header
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          width: 100%;
          max-width: 600px;
          height: 80vh;
          max-height: 700px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #E0E0E0; // Light border like Climate TRACE
        }

        .research-chatbot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #E0E0E0; // Light border like Climate TRACE
          background: #40505A; // Dark teal-grey like Climate TRACE
        }

        .research-chatbot-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .research-chatbot-icon {
          font-size: 20px;
          color: #E0E0E0; // Light grey like Climate TRACE
        }

        .research-chatbot-title h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 300; // Light weight like Climate TRACE
          color: #E0E0E0; // Light grey like Climate TRACE
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          text-transform: uppercase; // Uppercase like Climate TRACE
          letter-spacing: 0.5px; // Letter spacing like Climate TRACE
        }

        .research-chatbot-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .research-chatbot-clear {
          background: rgba(224, 224, 224, 0.1); // Subtle background like Climate TRACE
          border: 1px solid #E0E0E0; // Light border like Climate TRACE
          font-size: 14px;
          cursor: pointer;
          color: #E0E0E0; // Light grey like Climate TRACE
          padding: 6px 12px;
          border-radius: 6px; // Slightly rounded like Climate TRACE
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
          text-transform: uppercase; // Uppercase like Climate TRACE
          letter-spacing: 0.3px; // Letter spacing like Climate TRACE
        }

       .research-chatbot-clear:hover {
          background: rgba(224, 224, 224, 0.2); // Subtle hover like Climate TRACE
          color: #E0E0E0;
          border-color: #E0E0E0;
        }


        .research-chatbot-close {
          background: rgba(224, 224, 224, 0.1); // Subtle background like Climate TRACE
          border: 1px solid #E0E0E0; // Light border like Climate TRACE
          font-size: 28px;
          cursor: pointer;
          color: #E0E0E0; // Light grey like Climate TRACE
          padding: 4px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px; // Slightly rounded like Climate TRACE
          transition: all 0.2s ease;
        }

        .research-chatbot-close:hover {
          background: rgba(224, 224, 224, 0.2); // Subtle hover like Climate TRACE
          color: #E0E0E0;
        }


        .research-chatbot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .research-chatbot-welcome {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .research-chatbot-welcome-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .research-chatbot-welcome h4 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }

        .research-chatbot-welcome p {
          margin: 0;
          font-size: 16px;
          line-height: 1.5;
        }

        .research-chatbot-message {
          display: flex;
          flex-direction: column;
          margin-bottom: 4px;
        }

        .research-chatbot-message-user {
          align-items: flex-end;
        }

        .research-chatbot-message-assistant,
        .research-chatbot-message-system {
          align-items: flex-start;
        }

        .research-chatbot-message-content {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 16px;
          word-wrap: break-word;
          line-height: 1.5;
          font-size: 14px;
        }

        .research-chatbot-message-user .research-chatbot-message-content {
          background: #3b82f6;
          color: white;
          border-radius: 16px 16px 4px 16px;
        }

        .research-chatbot-message-assistant .research-chatbot-message-content {
          background: #f3f4f6;
          color: #1f2937;
          border-radius: 16px 16px 16px 4px;
        }

        .research-chatbot-message-system .research-chatbot-message-content {
          background: #dbeafe;
          color: #1e40af;
          border-radius: 16px;
          font-style: italic;
          font-size: 13px;
        }

        .research-chatbot-message-time {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 4px;
          padding: 0 4px;
        }

        .research-chatbot-message-user .research-chatbot-message-time {
          text-align: right;
        }

        .research-chatbot-typing {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .research-chatbot-typing span {
          width: 6px;
          height: 6px;
          background: #9ca3af;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .research-chatbot-typing span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .research-chatbot-typing span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes typing {
          0%,
          80%,
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .research-chatbot-input-container {
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .research-chatbot-error {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fef2f2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .research-chatbot-retry {
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        }

        .research-chatbot-retry:hover {
          background: #b91c1c;
        }

        .research-chatbot-input-wrapper {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          margin-bottom: 12px;
        }

        .research-chatbot-input {
          flex: 1;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 12px 16px;
          font-family: inherit;
          font-size: 14px;
          resize: none;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .research-chatbot-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .research-chatbot-input:disabled {
          background: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .research-chatbot-send {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 16px;
          cursor: pointer;
          font-size: 16px;
          min-width: 52px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .research-chatbot-send:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .research-chatbot-send:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          transform: none;
        }

        .research-chatbot-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #6b7280;
        }

        .research-chatbot-status-indicator {
          font-size: 10px;
        }

        .research-chatbot-status-text {
          font-weight: 500;
        }

        .research-chatbot-status-indicator.connected + .research-chatbot-status-text {
          color: #059669;
        }

        .research-chatbot-status-indicator.disconnected + .research-chatbot-status-text {
          color: #dc2626;
        }

        /* Research result specific styling */
        .research-chatbot-message-research .research-chatbot-message-content {
          max-width: 95%;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px 16px 16px 4px;
        }

        .research-chatbot-research-content {
          line-height: 1.6;
        }

        .research-chatbot-line {
          margin-bottom: 8px;
        }

        .research-chatbot-line:last-child {
          margin-bottom: 0;
        }

        .research-chatbot-link {
          color: #3b82f6;
          text-decoration: underline;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .research-chatbot-link:hover {
          color: #1d4ed8;
          text-decoration: none;
        }

        .research-chatbot-link:visited {
          color: #7c3aed;
        }

        .research-chatbot-streaming-indicator {
          display: inline-block;
          width: 8px;
          height: 16px;
          background: #3b82f6;
          margin-left: 4px;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* Progress message styling */
        .research-chatbot-message-system .research-chatbot-message-content {
          background: #dbeafe;
          color: #1e40af;
          border-radius: 16px;
          font-style: italic;
          font-size: 13px;
          border-left: 4px solid #3b82f6;
          padding-left: 12px;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .research-chatbot-overlay {
            padding: 0;
          }

          .research-chatbot-container {
            width: 100%;
            height: 100vh;
            max-height: none;
            border-radius: 0;
          }

          .research-chatbot-header {
            padding: 16px 20px;
          }

          .research-chatbot-title h3 {
            font-size: 16px;
          }

          .research-chatbot-messages {
            padding: 16px 20px;
          }

          .research-chatbot-input-container {
            padding: 16px 20px;
          }

          .research-chatbot-welcome {
            padding: 20px;
          }

          .research-chatbot-welcome-icon {
            font-size: 36px;
          }

          .research-chatbot-welcome h4 {
            font-size: 18px;
          }

          .research-chatbot-welcome p {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

ResearchChatbot.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  numberOfSelectQueries: PropTypes.number,
  percentOfTopQueriesToSearch: PropTypes.number,
  percentOfTopResultsToScan: PropTypes.number,
  className: PropTypes.string,
};

export default ResearchChatbot;
