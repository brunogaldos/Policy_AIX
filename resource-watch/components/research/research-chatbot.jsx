import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

// services
import * as researchAPI from 'services/research-api';
import { fetchDatasets } from 'services/dataset';

// utils
import { logger } from 'utils/logs';
import Icon from 'components/ui/icon';

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
  
  // Dataset-related state
  const [activeDatasets, setActiveDatasets] = useState([]);
  const [datasetContext, setDatasetContext] = useState([]);
  const [showDatasetDropdown, setShowDatasetDropdown] = useState(false);
  const [filteredDatasets, setFilteredDatasets] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [allDatasets, setAllDatasets] = useState([]);
  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState(0);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isConnectingRef = useRef(false);
  const streamingTimeoutRef = useRef(null);

  // Default info message
  const defaultInfoMessage = "I'm your helpful web research assistant. You can mention datasets with @datasetName (e.g., @climate, @population).";
  const textInputLabel = 'Please state your research question.';

  // Fetch all datasets when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchAllDatasets();
    }
  }, [isOpen]);

  const fetchAllDatasets = async () => {
    try {
      logger.info('Fetching datasets for @ autocomplete...');
      const datasets = await fetchDatasets({ 
        'page[size]': 100,
        includes: 'layer,metadata'
      });
      logger.info('Fetched datasets:', datasets?.length || 0);
      setAllDatasets(datasets || []);
    } catch (error) {
      logger.error('Error fetching datasets:', error);
    }
  };

  // Function to get dataset display name
  const getDatasetDisplayName = (dataset) => {
    return dataset.metadata?.[0]?.info?.name || dataset.name || dataset.slug;
  };

  // Function to get dataset search terms
  const getDatasetSearchTerms = (dataset) => {
    const displayName = getDatasetDisplayName(dataset);
    const metadataName = dataset.metadata?.[0]?.info?.name || '';
    const metadataDescription = dataset.metadata?.[0]?.info?.description || '';
    return `${displayName} ${metadataName} ${metadataDescription} ${dataset.slug}`.toLowerCase();
  };

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

      // Only process messages that are meant for user display
      switch (message.type) {
        case 'chat_response':
          // Handle complete chat responses
          if (message.data?.content || message.content) {
            const content = message.data?.content || message.content;
            addMessage('assistant', content, 'research_result');
            setIsLoading(false);
          }
          break;

        case 'stream_response':
        case 'stream':
          // Handle streaming responses (only actual research content)
          const content = message.data?.content || message.content || message.data?.message || message.message;
          
          if (content && typeof content === 'string') {
            console.log('🔍 DEBUG: Processing stream content:', content);
            
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
            streamingTimeoutRef.current = setTimeout(markStreamingComplete, 2000);
            
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

        default:
          // Handle role/content chunks (OpenAI streaming format)
          if (message.role && message.content && typeof message.content === 'string') {
            console.log('🔍 DEBUG: Processing role/content chunk:', message);
            
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
            streamingTimeoutRef.current = setTimeout(markStreamingComplete, 2000);
            
            // Scroll to bottom after update
            setTimeout(scrollToBottom, 100);
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
   * Handle dataset mention
   */
  const handleDatasetMention = useCallback(async (datasetName) => {
    // Find dataset in the already fetched list
    const dataset = allDatasets.find(ds => 
      ds.slug === datasetName || 
      ds.name === datasetName ||
      getDatasetDisplayName(ds).toLowerCase().includes(datasetName.toLowerCase())
    );
    
    if (!dataset) {
      logger.warn(`Dataset "${datasetName}" not found`);
      return;
    }

    // Check if dataset is already active
    if (!activeDatasets.find(ds => ds.id === dataset.id)) {
      const datasetWithActive = { ...dataset, active: true };
      setActiveDatasets(prev => [...prev, datasetWithActive]);
      
      // Add dataset context
      const contextMessage = `Dataset "${getDatasetDisplayName(dataset)}" has been added to the conversation context. This dataset contains information about ${getDatasetDisplayName(dataset).toLowerCase()}.`;
      setDatasetContext(prev => [...prev, contextMessage]);
      
      // Add system message to inform user
      addMessage('system', `📊 Dataset "${getDatasetDisplayName(dataset)}" has been added to the conversation and map.`);
      
      logger.info(`Dataset "${getDatasetDisplayName(dataset)}" added to context and map`);
    }
  }, [allDatasets, activeDatasets, getDatasetDisplayName, addMessage]);

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

    // Process @datasetName mentions before sending the message
    const datasetMentions = userMessage.match(/@(\w+)/g);
    if (datasetMentions) {
      for (const mention of datasetMentions) {
        const datasetName = mention.substring(1); // Remove @ symbol
        await handleDatasetMention(datasetName);
      }
    }

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
    handleDatasetMention,
  ]);

  /**
   * Handle input changes and show dataset autocomplete
   */
  const handleInputChange = useCallback(
    (e) => {
      const value = e.target.value;
      setInputMessage(value);
      
      // Check if we're typing after an @ symbol
      const lastAtSymbol = value.lastIndexOf('@');
      
      if (lastAtSymbol !== -1) {
        const afterAt = value.substring(lastAtSymbol + 1);
        const beforeAt = value.substring(0, lastAtSymbol);
        
        // Check if there's a space after @ (meaning we're not in a dataset name)
        const hasSpaceAfterAt = /\s/.test(afterAt);
        
        if (!hasSpaceAfterAt) {
          // Filter datasets based on what's typed after @
          const filtered = allDatasets.filter(dataset => {
            const searchTerms = getDatasetSearchTerms(dataset);
            return searchTerms.includes(afterAt.toLowerCase());
          }).slice(0, 10); // Limit to 10 results
          
          setFilteredDatasets(filtered);
          setShowDatasetDropdown(filtered.length > 0);
          setCursorPosition(lastAtSymbol);
          setSelectedDatasetIndex(0);
        } else {
          setShowDatasetDropdown(false);
        }
      } else {
        setShowDatasetDropdown(false);
      }
    },
    [allDatasets, getDatasetSearchTerms],
  );

  /**
   * Select a dataset from dropdown
   */
  const selectDataset = useCallback((dataset) => {
    const beforeAt = inputMessage.substring(0, cursorPosition);
    const afterAt = inputMessage.substring(cursorPosition + 1);
    const spaceAfterAt = afterAt.indexOf(' ');
    const afterDataset = spaceAfterAt !== -1 ? afterAt.substring(spaceAfterAt) : '';
    
    const datasetName = dataset.slug || dataset.name;
    const newValue = beforeAt + '@' + datasetName + afterDataset;
    setInputMessage(newValue);
    setShowDatasetDropdown(false);
    
    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = beforeAt.length + datasetName.length + 1; // +1 for @
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [inputMessage, cursorPosition]);

  /**
   * Handle key press in input
   */
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (showDatasetDropdown && filteredDatasets.length > 0) {
          // Select the currently highlighted dataset
          selectDataset(filteredDatasets[selectedDatasetIndex]);
        } else {
          sendChatMessage();
        }
      } else if (e.key === 'Escape') {
        setShowDatasetDropdown(false);
      } else if (e.key === 'ArrowDown' && showDatasetDropdown) {
        e.preventDefault();
        setSelectedDatasetIndex(prev => 
          prev < filteredDatasets.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp' && showDatasetDropdown) {
        e.preventDefault();
        setSelectedDatasetIndex(prev => 
          prev > 0 ? prev - 1 : filteredDatasets.length - 1
        );
      }
    },
    [sendChatMessage, showDatasetDropdown, filteredDatasets, selectedDatasetIndex, selectDataset],
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
    <div className={`research-chatbot-dropdown ${className}`}>
      <div className="research-chatbot-container">
        {/* Floating Actions */}
        <div className="research-chatbot-header-actions" style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
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
        </div>

        {/* Messages */}
        <div className="research-chatbot-messages">
          {messages.length === 0 && !isInitializing && (
            <div className="research-chatbot-welcome">
              <div className="research-chatbot-welcome-icon">•</div>
              <h4>Welcome to AI Assistant</h4>
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

        {/* Active Datasets */}
        {activeDatasets.length > 0 && (
          <div className="research-chatbot-datasets" style={{
            padding: '16px',
            borderTop: '1px solid #E0E0E0',
            background: '#f8f9fa',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#FFFFFF'
            }}>
              🗺️ Active Datasets ({activeDatasets.length})
            </h4>
            {activeDatasets.map(dataset => (
              <div
                key={dataset.id}
                style={{
                  margin: '8px 0',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Icon name="icon-dataset" className="-small" style={{ color: '#007bff' }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '13px',
                    color: '#FFFFFF'
                  }}>
                    {getDatasetDisplayName(dataset)}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#FFFFFF',
                    marginTop: '2px'
                  }}>
                    ID: {dataset.id} | Layer: {dataset.layer?.[0]?.id || 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
            <div style={{ position: 'relative', flex: 1 }}>
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={isConnected ? textInputLabel : 'Connecting...'}
                disabled={!isConnected || isLoading || isInitializing}
                className="research-chatbot-input"
                rows="2"
                maxLength={1000}
              />
              
              {/* Dataset autocomplete dropdown */}
              {showDatasetDropdown && (
                <div className="dataset-dropdown">
                  <div style={{ 
                    padding: '8px 12px', 
                    fontSize: '11px', 
                    fontWeight: '600',
                    color: '#333', 
                    borderBottom: '1px solid #eee',
                    background: '#f8f9fa'
                  }}>
                    📊 Available datasets ({filteredDatasets.length})
                  </div>
                  {filteredDatasets.map((dataset, index) => (
                    <div
                      key={dataset.id}
                      className={classnames('dataset-option', { '-active': selectedDatasetIndex === index })}
                      onClick={() => selectDataset(dataset)}
                      onMouseEnter={() => setSelectedDatasetIndex(index)}
                    >
                      <Icon name="icon-dataset" className="-small" style={{ color: '#007bff', fontSize: '12px' }} />
                      <div style={{ flex: 1 }}>
                        <div className="dataset-name">
                          @{dataset.slug || dataset.name}
                        </div>
                        <div className="dataset-description">
                          {getDatasetDisplayName(dataset)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={sendChatMessage}
              disabled={!isConnected || isLoading || !inputMessage.trim() || isInitializing}
              className="research-chatbot-send"
              aria-label="Send message"
            >
              {isLoading ? '•' : '→'}
            </button>
          </div>

          <div className="research-chatbot-status">
            <span
              className={`research-chatbot-status-indicator ${
                isConnected ? 'connected' : 'disconnected'
              }`}
            >
              {isConnected ? '⚪' : '🔴'}
            </span>
            <span className="research-chatbot-status-text">
              {isInitializing ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

// ... existing code ...

      <style jsx>{`
        .research-chatbot-dropdown {
          position: fixed;
          top: 75px; /* Start directly under the header */
          right: 8px; /* Small margin from right edge */
          z-index: 9999;
          width: 400px;
          max-width: calc(100vw - 16px); /* Account for 8px margin on each side */
        }

        .research-chatbot-container {
          background: #242628; // Main content area background color
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          width: 100%;
          height: 700px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #E0E0E0; // Light border like Climate TRACE
          position: relative; // For absolute positioning of floating actions
        }



        .research-chatbot-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .research-chatbot-clear {
          background: rgba(255, 255, 255, 0.1); // Subtle background like header
          border: 1px solid #FFFFFF; // White border like header
          font-size: 14px;
          cursor: pointer;
          color: #FFFFFF; // Pure white like header
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
          background: rgba(255, 255, 255, 0.2); // Subtle hover like header
          color: #FFFFFF;
          border-color: #FFFFFF;
        }

        .research-chatbot-close {
          background: rgba(255, 255, 255, 0.1); // Subtle background like header
          border: 1px solid #FFFFFF; // White border like header
          font-size: 28px;
          cursor: pointer;
          color: #FFFFFF; // Pure white like header
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
          background: rgba(255, 255, 255, 0.2); // Subtle hover like header
          color: #FFFFFF;
        }

        .research-chatbot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #242628; // Main content area background color
        }

        .research-chatbot-welcome {
          text-align: center;
          padding: 40px 20px;
          color: #FFFFFF; // Pure white like header
        }

        .research-chatbot-welcome-icon {
          font-size: 48px;
          margin-bottom: 16px;
          color: #FFFFFF; // Pure white like header
        }

        .research-chatbot-welcome h4 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 300; // Light weight like Climate TRACE
          color: #FFFFFF; // Pure white like header
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          text-transform: uppercase; // Uppercase like Climate TRACE
          letter-spacing: 0.5px; // Letter spacing like Climate TRACE
        }

        .research-chatbot-welcome p {
          margin: 0;
          font-size: 16px;
          line-height: 1.5;
          color: #FFFFFF; // Pure white like header
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
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
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
        }

        .research-chatbot-message-user .research-chatbot-message-content {
          background: rgba(255, 255, 255, 0.2); // Subtle background like header
          color: #FFFFFF; // Pure white like header
          border: 1px solid #FFFFFF; // White border like header
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
        }

        .research-chatbot-message-assistant .research-chatbot-message-content {
          background: rgba(255, 255, 255, 0.1); // Subtle background like header
          color: #FFFFFF; // Pure white like header
          border: 1px solid #FFFFFF; // White border like header
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
        }

        .research-chatbot-message-system .research-chatbot-message-content {
          background: rgba(255, 255, 255, 0.1); // Subtle background like header
          color: #FFFFFF; // Pure white like header
          border-radius: 16px;
          font-style: italic;
          font-size: 13px;
          border-left: 4px solid #FFFFFF; // White border like header
          padding-left: 12px;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
        }

        .research-chatbot-message-error .research-chatbot-message-content {
          background: rgba(239, 68, 68, 0.1); // Error background
          color: #FFFFFF; // Pure white like header
          border: 1px solid #ef4444;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
        }

        .research-chatbot-input-container {
          padding: 20px 24px;
          border-top: 1px solid #FFFFFF; // White border like header
          background: #242628; // Main content area background color
        }

        .research-chatbot-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(239, 68, 68, 0.1);
          color: #FFFFFF; // Pure white like header
          padding: 8px 12px;
          border-radius: 6px; // Slightly rounded like Climate TRACE
          margin-bottom: 12px;
          border: 1px solid #ef4444;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
        }

        .research-chatbot-retry {
          background: rgba(255, 255, 255, 0.1); // Subtle background like header
          border: 1px solid #FFFFFF; // White border like header
          color: #FFFFFF; // Pure white like header
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
          text-transform: uppercase; // Uppercase like Climate TRACE
          letter-spacing: 0.3px; // Letter spacing like Climate TRACE
        }

        .research-chatbot-input-wrapper {
          display: flex;
          gap: 6px; // Reduced gap to bring input closer to button
          align-items: flex-end; // Aligns both elements to the same bottom baseline
          width: 100%; // Ensure full width usage
        }

        .research-chatbot-input {
          width: 100%; // Ensure full width
          min-height: 120px; // Much larger height for better usability
          padding: 20px 24px; // Increased padding for better spacing
          border: 1px solid #FFFFFF; // White border like header
          border-radius: 6px; // Slightly rounded like Climate TRACE
          background: rgba(255, 255, 255, 0.08); // Slightly darker background for better contrast
          color: #FFFFFF; // Pure white like header
          font-size: 12px; // Smaller font size to match dropdown
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
          resize: none;
          outline: none;
          transition: all 0.2s ease;
          line-height: 1.4; // Better line height for readability
          box-sizing: border-box; // Include padding in width calculation
        }

        .research-chatbot-input:focus {
          border-color: #FFFFFF; // White border like header
          background: rgba(255, 255, 255, 0.15); // Slightly more visible on focus
        }

        .research-chatbot-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .research-chatbot-input::placeholder {
          color: rgba(255, 255, 255, 0.6); // Subtle placeholder color
        }

        /* Dataset dropdown styling */
        .dataset-dropdown {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          max-height: 200px;
          overflow-y: auto;
          margin-bottom: 8px;
        }

        .dataset-option {
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px; // Smaller font size
          transition: background-color 0.2s ease;
        }

        .dataset-option:last-child {
          border-bottom: none;
        }

        .dataset-option:hover,
        .dataset-option.-active {
          background-color: #f8f9fa;
        }

        .dataset-option .dataset-name {
          font-weight: 600;
          font-size: 12px; // Smaller font size
          color: #333;
        }

        .dataset-option .dataset-description {
          font-size: 11px; // Smaller font size
          color: #666;
          margin-top: 2px;
        }

        .research-chatbot-send {
          background: transparent; // Minimalistic transparent background
          border: 1px solid #FFFFFF; // White border like header
          color: #FFFFFF; // Pure white like header
          padding: 8px 12px; // Smaller padding for less dominant appearance
          border-radius: 4px; // Smaller radius for minimalistic look
          cursor: pointer;
          font-size: 16px; // Smaller font size
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 40px; // Smaller width
          height: 40px; // Smaller height to be less dominant
          font-weight: 300; // Light weight for minimalistic look
          align-self: flex-end; // Ensure it aligns to bottom
        }

        .research-chatbot-send:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1); // Subtle hover like header
          border-color: #FFFFFF;
        }

        .research-chatbot-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .research-chatbot-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          font-size: 12px;
          color: #FFFFFF; // Pure white like header
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
        }

        .research-chatbot-status-indicator {
          font-size: 12px;
        }

        .research-chatbot-status-text {
          text-transform: uppercase; // Uppercase like Climate TRACE
          letter-spacing: 0.3px; // Letter spacing like Climate TRACE
        }

        .research-chatbot-message-time {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6); // Subtle time color
          margin-top: 4px;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
          text-transform: uppercase; // Uppercase like Climate TRACE
          letter-spacing: 0.3px; // Letter spacing like Climate TRACE
        }

        .research-chatbot-typing {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .research-chatbot-typing span {
          width: 6px;
          height: 6px;
          background: #FFFFFF; // Pure white like header
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
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .research-chatbot-research-content {
          line-height: 1.6;
          color: #FFFFFF; // Pure white like header
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
        }

        .research-chatbot-line {
          margin-bottom: 8px;
        }

        .research-chatbot-line:last-child {
          margin-bottom: 0;
        }

        .research-chatbot-link {
          color: #FFFFFF; // Pure white like header
          text-decoration: underline;
          font-weight: 400; // Slightly bolder for links
          transition: color 0.2s ease;
        }

        .research-chatbot-link:hover {
          color: #FFFFFF; // Pure white like header
          text-decoration: none;
        }

        .research-chatbot-link:visited {
          color: rgba(224, 224, 224, 0.8); // Slightly dimmer for visited links
        }

        .research-chatbot-streaming-indicator {
          display: inline-block;
          width: 8px;
          height: 16px;
          background: #E0E0E0; // Light grey like Climate TRACE
          margin-left: 4px;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* Progress message styling */
        .research-chatbot-message-system .research-chatbot-message-content {
          background: rgba(224, 224, 224, 0.1); // Subtle background like Climate TRACE
          color: #FFFFFF; // Pure white
          border-radius: 16px;
          font-style: italic;
          font-size: 13px;
          border-left: 4px solid #E0E0E0; // Light border like Climate TRACE
          padding-left: 12px;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .research-chatbot-dropdown {
            top: 10px;
            right: 10px;
            width: calc(100vw - 20px);
          }

          .research-chatbot-container {
            width: 100%;
            height: 600px;
            max-height: 80vh;
            border-radius: 8px;
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

// ... existing code ...
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
