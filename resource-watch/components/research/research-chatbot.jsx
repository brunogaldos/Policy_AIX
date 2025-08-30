import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useDispatch } from 'react-redux';

// services
import * as researchAPI from 'services/research-api';
import { fetchDatasets } from 'services/dataset';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"
// utils
import { logger } from 'utils/logs';
import Icon from 'components/ui/icon';

// actions
import { toggleMapLayerGroup, resetMapLayerGroupsInteraction } from 'layout/explore/actions';

import Spinner from 'components/ui/Spinner';

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
  const [spinnerActive, setSpinnerActive] = useState(false); // Track spinner state for intermediate messages
  
  // Dataset-related state
  const [activeDatasets, setActiveDatasets] = useState([]);
  const [datasetContext, setDatasetContext] = useState([]);
  const [showDatasetDropdown, setShowDatasetDropdown] = useState(false);
  const [filteredDatasets, setFilteredDatasets] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [allDatasets, setAllDatasets] = useState([]);
  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState(0);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  
  // Document upload state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // Track delete/backspace presses to require multiple taps before removing tokens
  const lastKeyRef = useRef(null);
  const tokenDeleteCountsRef = useRef({});

  // Redux
  const dispatch = useDispatch();

  // File input ref
  const fileInputRef = useRef(null);

  // Function to remove a dataset from selection - Enhanced to integrate with dataset widget functionality
  const removeDataset = useCallback(async (selectedItem) => {
    const datasetToRemove = selectedItem.dataset;
    
    setSelectedDatasets(prev => prev.filter(item => item.dataset.id !== datasetToRemove.id));
    
    // Also remove from active datasets
    setActiveDatasets(prev => prev.filter(dataset => dataset.id !== datasetToRemove.id));
    
    // Also remove from input message
    const shortName = selectedItem.shortName;
    const newValue = inputMessage.replace(new RegExp(`@${shortName}\\s*`, 'g'), '');
    setInputMessage(newValue);
    
    // Deactivate the map for this dataset using the same functionality as the dataset widget
    if (datasetToRemove.layer && datasetToRemove.layer.length > 0) {
      // Use the same actions as the explore datasets widget
      dispatch(toggleMapLayerGroup({ dataset: datasetToRemove, toggle: false }));
      dispatch(resetMapLayerGroupsInteraction());
      
      // Remove the layer from active layers (same as DatasetListItem component)
      const defaultLayer = datasetToRemove.layer.find(l => l.default) || datasetToRemove.layer[0];
      if (defaultLayer) {
        // Import the action dynamically to avoid circular dependencies
        const { setMapLayerGroupActive } = await import('layout/explore/actions');
        dispatch(setMapLayerGroupActive({ dataset: { id: datasetToRemove.id }, active: null }));
      }
      
      logger.info('Map deactivated for dataset:', getDatasetDisplayName(datasetToRemove));
    }
  }, [inputMessage, dispatch]);

  // Function to remove an uploaded file
  const removeUploadedFile = useCallback((fileToRemove) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileToRemove.id));
    logger.info('Removed uploaded file:', fileToRemove.name);
  }, []);

  // Function to handle file upload
  const handleFileUpload = useCallback((event) => {
    const files = Array.from(event.target.files);
    
    if (files.length > 0) {
      const newFiles = files.map(file => ({
        id: Date.now() + Math.random(),
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadTime: new Date()
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      // Log uploaded files
      newFiles.forEach(file => {
        logger.info('File uploaded:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  // Function to trigger file input
  const triggerFileUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isConnectingRef = useRef(false);
  const streamingTimeoutRef = useRef(null);

  // Default info message
  const defaultInfoMessage = "I'm your helpful AI assistant. You can mention datasets with @datasetName (e.g., @climate, @population).";
  const textInputLabel = defaultInfoMessage;

  // Fetch all datasets when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchAllDatasets();
    }
  }, [isOpen]);

  const fetchAllDatasets = async () => {
    try {
      logger.info('Fetching datasets from API for @ autocomplete...');
      
      // Fetch a reasonable number of datasets for autocomplete
      const response = await fetchDatasets({ 
        'page[size]': 365, // Fetch 400 datasets for autocomplete
        //published: true,
        status: 'saved',
        includes: 'layer,metadata'
      });
      
      logger.info('Total datasets loaded:', response?.length || 0);
      
      // Debug: Log first few datasets to see their structure
      if (response && response.length > 0) {
        logger.info('Sample dataset structure:', {
          id: response[0].id,
          name: response[0].name,
          metadata: response[0].metadata,
          metadataLength: response[0].metadata?.length,
          firstMetadata: response[0].metadata?.[0],
          displayName: getDatasetDisplayName(response[0])
        });
        
        // Log a few more datasets to see patterns
        for (let i = 1; i < Math.min(5, response.length); i++) {
          logger.info(`Dataset ${i}:`, {
            name: response[i].name,
            displayName: getDatasetDisplayName(response[i])
          });
        }
      }
      
      if (response && Array.isArray(response)) {
        setAllDatasets(response);
      } else {
        logger.warn('Invalid response format, setting empty array');
        setAllDatasets([]);
      }
    } catch (error) {
      logger.error('Error fetching datasets from API:', error);
      setAllDatasets([]);
    }
  };

  // Function to get dataset display name (metadata name only)
  const getDatasetDisplayName = (dataset) => {
    // Try multiple metadata access patterns
    if (dataset.metadata && dataset.metadata.length > 0 && dataset.metadata[0]?.info?.name) {
      return dataset.metadata[0].info.name;
    }
    // Try direct metadata access (some datasets might have metadata at top level)
    if (dataset.metadata?.info?.name) {
      return dataset.metadata.info.name;
    }
    // Fallback to dataset name (but clean it up)
    const cleanName = dataset.name || '';
    // Remove common prefixes like "bio.017", "soc.068", etc.
    return cleanName.replace(/^[a-z]+\.[0-9]+\.?[a-z]*\s*/, '');
  };

  // Function to get dataset search terms (metadata name only)
  const getDatasetSearchTerms = (dataset) => {
    const displayName = getDatasetDisplayName(dataset);
    return displayName.toLowerCase();
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
      console.log('🔍 DEBUG: addMessage called with:', { sender, message, messageType });
      const newMessage = {
        id: Date.now() + Math.random(),
        sender,
        message,
        messageType,
        timestamp: new Date(),
      };

      console.log('🔍 DEBUG: New message object:', newMessage);
      setMessages((prev) => {
        const newMessages = [...prev, newMessage];
        console.log('🔍 DEBUG: Updated messages array length:', newMessages.length);
        return newMessages;
      });

      // Scroll to bottom after message is added
      setTimeout(scrollToBottom, 100);
    },
    [scrollToBottom],
  );

  /**
   * Update the last message (useful for progress updates)
   */
  const updateLastMessage = useCallback((message) => {
    console.log('🔍 DEBUG: updateLastMessage called with:', message);
    setMessages((prev) => {
      console.log('🔍 DEBUG: Current messages array:', prev);
      if (prev.length === 0) {
        console.log('🔍 DEBUG: No messages to update');
        return prev;
      }

      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];
      console.log('🔍 DEBUG: Last message:', lastMessage);

      if (lastMessage.sender === 'system') {
        console.log('🔍 DEBUG: Updating system message from:', lastMessage.message, 'to:', message);
        lastMessage.message = message;
        lastMessage.timestamp = new Date();
      } else {
        console.log('🔍 DEBUG: Last message is not system type, sender:', lastMessage.sender);
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
    } catch (error) {
      logger.error('Failed to initialize WebSocket connection:', error);
      setConnectionError(error.message || 'Failed to connect to research service');
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
      console.log('🔍 DEBUG: WebSocket message received in component:', message);
      logger.info('Research chatbot received WebSocket message:', message);

      // Only process messages that are meant for user display
      switch (message.type) {
        case 'agentStart':
        case 'agent_start':
          // Handle agent start messages (research phase beginning)
          console.log('🔍 DEBUG: Processing agentStart message:', message);
          if (message.data?.name) {
            console.log('🔍 DEBUG: Adding agent start message:', message.data.name);
            addMessage('system', message.data.name, 'intermediate');
            setIsLoading(true);
          }
          break;

        case 'agentUpdate':
        case 'agent_update':
          // Handle agent update messages (progress updates)
          console.log('🔍 DEBUG: Processing agentUpdate message:', message);
          if (message.message) {
            console.log('🔍 DEBUG: Updating last message with:', message.message);
            updateLastMessage(message.message);
          }
          break;

        case 'agentCompleted':
        case 'agent_completed':
          // Handle agent completed messages (research phase completed)
          console.log('🔍 DEBUG: Processing agentCompleted message:', message);
          if (message.data?.name) {
            console.log('🔍 DEBUG: Updating last message with:', message.data.name);
            // Mark the last intermediate message as completed
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              
              if (lastMessage && lastMessage.messageType === 'intermediate') {
                lastMessage.message = message.data.name;
                lastMessage.messageType = 'completed';
                lastMessage.timestamp = new Date();
              }
              
              return newMessages;
            });
            
            if (message.data.lastAgent === true) {
              setIsLoading(false);
            }
          }
          break;

        case 'chat_response':
        case 'chatResponse':
          // Handle complete chat responses
          if (message.data?.content || message.content) {
            const content = message.data?.content || message.content;
            addMessage('assistant', content, 'research_result');
            setIsLoading(false);
          }
          break;

        case 'stream_response':
        case 'streamResponse':
        case 'stream':
          // Handle streaming responses (only actual research content)
          const content = message.data?.content || message.content || message.data?.message || message.message;
          
          if (content && typeof content === 'string') {
            
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
        case 'streamEnd':
        case 'end':
        case 'complete':
        case 'finished':
          // End of streaming response
          
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

        case 'memoryIdCreated':
          // Handle memory ID creation (backend setup)
          console.log('🔍 DEBUG: Memory ID created:', message.data);
          break;

        case 'liveLlmCosts':
          // Handle cost updates (optional display)
          if (message.data > 0) {
            console.log('🔍 DEBUG: Cost update:', message.data);
          }
          break;

        case 'cost_update':
          // Handle cost updates (transformed format)
          if (message.data > 0) {
            console.log('🔍 DEBUG: Cost update:', message.data);
          }
          break;



        default:
          // Handle role/content chunks (OpenAI streaming format)
          if (message.role && message.content && typeof message.content === 'string') {
            
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
      setIsConnected(status.type === 'connected');
      
      if (status.type === 'connected') {
        setConnectionError(null);
        setIsInitializing(false);
      } else if (status.type === 'disconnected') {
        setConnectionError('WebSocket connection lost');
        setIsInitializing(false);
      }
    },
    [],
  );

  /**
   * Handle spinner state changes
   */
  const handleSpinnerChange = useCallback(
    (active) => {
      console.log('🔍 DEBUG: Spinner state changed:', active);
      setSpinnerActive(active);
    },
    [],
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
   * Handle dataset mention - Enhanced to integrate with dataset widget functionality
   */
  const handleDatasetMention = useCallback(async (datasetName) => {
    // Find dataset using the same search logic as the dropdown (includes metadata names)
    const dataset = allDatasets.find(ds => {
      const searchTerms = getDatasetSearchTerms(ds);
      return searchTerms.includes(datasetName.toLowerCase());
    });
    
    if (!dataset) {
      logger.warn(`Dataset "${datasetName}" not found`);
      addMessage('system', `❌ Dataset "${datasetName}" not found. Try typing @ followed by a dataset name to see available options.`);
      return;
    }

    // Check if dataset is already active
    if (!activeDatasets.find(ds => ds.id === dataset.id)) {
      const datasetWithActive = { ...dataset, active: true };
      setActiveDatasets(prev => [...prev, datasetWithActive]);
      
      // Add dataset context
      const contextMessage = `Dataset "${getDatasetDisplayName(dataset)}" has been added to the conversation context. This dataset contains information about ${getDatasetDisplayName(dataset).toLowerCase()}.`;
      setDatasetContext(prev => [...prev, contextMessage]);
      
      // Activate the map for this dataset using the exact same functionality as the "Add to map" button
      if (dataset.layer && dataset.layer.length > 0) {
        // Use the exact same actions as the explore datasets widget "Add to map" button
        dispatch(toggleMapLayerGroup({ dataset, toggle: true }));
        dispatch(resetMapLayerGroupsInteraction());
        
        logger.info('Map activated for dataset:', getDatasetDisplayName(dataset));
      }
      
      // Dataset is added silently without showing a message to the user
      
      logger.info(`Dataset "${getDatasetDisplayName(dataset)}" added to context and map using widget integration`);
    } else {
      // Dataset is already active, no message shown
    }
  }, [allDatasets, activeDatasets, getDatasetDisplayName, addMessage, dispatch]);

  /**
   * Send chat message
   */
  const sendChatMessage = useCallback(async () => {
    if (!inputMessage.trim() || !wsClientId || isLoading) {
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setSelectedDatasets([]); // Clear selected datasets
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



      // Send conversation request to research API
      await researchAPI.conversation(simplifiedChatLog, {
        numberOfSelectQueries,
        percentOfTopQueriesToSearch,
        percentOfTopResultsToScan,
      });

      logger.info('Research conversation request sent successfully');
    } catch (error) {
      logger.error('Error sending research conversation request:', error);
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
      
      // Detect manual token deletions in the input and deactivate corresponding map layers
      // As soon as any character of a token label is deleted (token text no longer matches), deactivate
      if (selectedDatasets.length > 0) {
        const removedItems = selectedDatasets.filter((item) => {
          const label = `@${item.shortName}`;
          return !value.includes(label);
        });
        if (removedItems.length > 0) {
          setSelectedDatasets((prev) => prev.filter((item) => value.includes(`@${item.shortName}`)));
          setActiveDatasets((prev) => prev.filter((d) => !removedItems.some((ri) => ri.dataset.id === d.id)));
          removedItems.forEach((ri) => {
            if (ri.dataset?.layer && ri.dataset.layer.length > 0) {
              dispatch(toggleMapLayerGroup({ dataset: ri.dataset, toggle: false }));
              dispatch(resetMapLayerGroupsInteraction());
            }
          });
        }
      }
      
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
          }).slice(0, 365); // Limit to 400 results for better coverage
          
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
    [allDatasets, getDatasetSearchTerms, selectedDatasets, dispatch],
  );

  /**
   * Select a dataset from dropdown - Enhanced to integrate with dataset widget functionality
   */
  const selectDataset = useCallback(async (dataset) => {
    const beforeAt = inputMessage.substring(0, cursorPosition);
    const afterAt = inputMessage.substring(cursorPosition + 1);
    const spaceAfterAt = afterAt.indexOf(' ');
    const afterDataset = spaceAfterAt !== -1 ? afterAt.substring(spaceAfterAt) : '';
    
    // Use the metadata name as the identifier
    const datasetName = getDatasetDisplayName(dataset);
    const tokenLabel = datasetName; // no longer shorten; show full friendly name
    const newValue = beforeAt + '@' + tokenLabel + afterDataset;
    setInputMessage(newValue);
    
    // Add to selected datasets for visual indication (store full dataset object)
    setSelectedDatasets(prev => [...prev, { dataset, shortName: tokenLabel }]);
    
    // Activate the map for this dataset using the same functionality as the dataset widget
    if (dataset.layer && dataset.layer.length > 0) {
      // Use the same actions as the explore datasets widget
      dispatch(toggleMapLayerGroup({ dataset, toggle: true }));
      dispatch(resetMapLayerGroupsInteraction());
      
      // Set the default layer as active (same as DatasetListItem component)
      const defaultLayer = dataset.layer.find(l => l.default) || dataset.layer[0];
      if (defaultLayer) {
        // Import the action dynamically to avoid circular dependencies
        const { setMapLayerGroupActive } = await import('layout/explore/actions');
        dispatch(setMapLayerGroupActive({ dataset: { id: dataset.id }, active: defaultLayer.id }));
      }
      
      logger.info('Map activated for dataset:', getDatasetDisplayName(dataset));
    }
    
    setShowDatasetDropdown(false);
    
    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = beforeAt.length + tokenLabel.length + 1; // +1 for @
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [inputMessage, cursorPosition, dispatch]);

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

  // Effect: Add test message when component loads
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 DEBUG: Component opened, adding test message');
      addMessage('system', '🔍 Test message - component is working');
    }
  }, [isOpen, addMessage]);

  // Effect: Set up WebSocket message handlers
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 DEBUG: Setting up WebSocket message handlers');
      // Add message handlers
      researchAPI.onMessage('*', handleWebSocketMessage);
      researchAPI.onConnection(handleConnectionChange);
      researchAPI.onError(handleConnectionError);
      researchAPI.onSpinnerChange(handleSpinnerChange); // Register spinner change handler

      // Test if the message handler is working
      console.log('🔍 DEBUG: Testing message handler registration');
      setTimeout(() => {
        console.log('🔍 DEBUG: Sending test message to handler');
        handleWebSocketMessage({
          type: 'test',
          data: { name: 'Test message' },
          message: 'This is a test'
        });
      }, 1000);

      return () => {
        // Clean up handlers
        researchAPI.offMessage('*', handleWebSocketMessage);
        researchAPI.offConnection(handleConnectionChange);
        researchAPI.offError(handleConnectionError);
        researchAPI.offSpinnerChange(handleSpinnerChange); // Clean up spinner handler
      };
    }
  }, [isOpen, handleWebSocketMessage, handleConnectionChange, handleConnectionError, handleSpinnerChange]);

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

        </div>

        {/* Messages */}
        <div className="research-chatbot-messages">


          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`research-chatbot-message research-chatbot-message-${msg.sender} ${
                msg.messageType === 'research_result' ? 'research-chatbot-message-research' : ''
              } ${
                msg.messageType === 'intermediate' || msg.messageType === 'completed' ? 'research-chatbot-message-intermediate' : ''
              }`}
            >
              <div className="research-chatbot-message-content">
                {/* Show spinner for active intermediate messages, checkmark for completed ones */}
                {msg.messageType === 'intermediate' ? (
                  <div className="research-chatbot-message-with-spinner">
                    {spinnerActive ? (
                      <svg className="progress-ring" width="12" height="12">
                        <circle
                          className="progress-ring__circle"
                          stroke="blue"
                          strokeWidth="2"
                          fill="transparent"
                          r="4"
                          cx="6"
                          cy="6"
                        />
                      </svg>
                    ) : (
                      <span className="done-icon">✓</span>
                    )}
                    <span className="research-chatbot-spinner-text-inline">
                      {msg.message}
                    </span>
                  </div>
                ) : msg.messageType === 'completed' ? (
                  <div className="research-chatbot-message-with-spinner">
                    <span className="done-icon">✓</span>
                    <span className="research-chatbot-spinner-text-inline">
                      {msg.message}
                    </span>
                  </div>
                ) : msg.messageType === 'research_result' ? (
                  <div className="research-chatbot-research-content">
                                
                    <ReactMarkdown remarkPlugins={[remarkGfm]}> 
                      {msg.message}
                    </ReactMarkdown>

                    {/* Format research results with markdown-like styling 
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
                    })} */}
                  </div>
                ) : (
                  msg.message
                )}
                {msg.isStreaming && (
                  <span className="research-chatbot-streaming-indicator">▋</span>
                )}
              </div>
              
              {/* Only show timestamp for non-intermediate messages */}
              {msg.messageType !== 'intermediate' && msg.messageType !== 'completed' && (
                <div className="research-chatbot-message-time">
                  {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
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

        {/* Input Section */}
        <div className="research-chatbot-input-container">
          {connectionError && (
            <div className="research-chatbot-error">
              <span>❌ {connectionError}</span>
              <button type="button" onClick={retryConnection} className="research-chatbot-retry">
                Retry
              </button>
            </div>
          )}

          {(selectedDatasets.length > 0 || uploadedFiles.length > 0) && (
            <div className="research-chatbot-tokens-container">
              <div className="research-chatbot-tokens-list">
                {/* Dataset tokens */}
                {selectedDatasets.map((selectedItem, index) => {
                  // Use the display name for tokens
                  const shortName = selectedItem.shortName;
                  return (
                    <span key={`dataset-${index}`} className="research-chatbot-token research-chatbot-token-dataset">
                      @{shortName}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeDataset(selectedItem);
                        }}
                        className="research-chatbot-token-remove"
                        title={`Remove ${getDatasetDisplayName(selectedItem.dataset)}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                
                {/* File tokens */}
                {uploadedFiles.map((file) => {
                  // Extract filename without extension for token display
                  const fileName = file.name.replace(/\.[^/.]+$/, '');
                  return (
                    <span key={`file-${file.id}`} className="research-chatbot-token research-chatbot-token-file">
                      @{fileName}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeUploadedFile(file);
                        }}
                        className="research-chatbot-token-remove"
                        title={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="research-chatbot-input-wrapper">
            <div className="research-chatbot-input-row">
              <div className="research-chatbot-input-area">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  onKeyDown={undefined}
                  placeholder={isConnected ? textInputLabel : 'Connecting...'}
                  disabled={!isConnected || isLoading || isInitializing}
                  className="research-chatbot-input"
                  style={{ 
                    minHeight: '140px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}
                />

                {/* Dataset autocomplete dropdown */}
                {showDatasetDropdown && filteredDatasets.length > 0 && (
                  <div className="dataset-dropdown">
                    <div style={{ 
                      padding: '8px 12px', 
                      fontSize: '11px', 
                      fontWeight: '600',
                      color: '#333', 
                      borderBottom: '1px solid #eee',
                      background: '#f8f9fa'
                    }}>
                      Available datasets ({filteredDatasets.length})
                    </div>
                    {filteredDatasets.map((dataset, index) => {
                      return (
                        <div
                          key={dataset.id}
                          className={classnames('dataset-option', { '-active': selectedDatasetIndex === index })}
                          onClick={() => selectDataset(dataset)}
                          onMouseEnter={() => setSelectedDatasetIndex(index)}
                        >
                          <div style={{ flex: 1 }}>
                            <div className="dataset-name">
                              {getDatasetDisplayName(dataset)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="research-chatbot-actions">
                <button
                  onClick={triggerFileUpload}
                  disabled={!isConnected || isLoading || isInitializing}
                  className="research-chatbot-action-button research-chatbot-action-button-upload"
                  aria-label="Upload documents"
                >
                  {isLoading ? '•' : '•'}
                </button>
                <button
                  onClick={sendChatMessage}
                  disabled={!isConnected || isLoading || !inputMessage.trim() || isInitializing}
                  className="research-chatbot-action-button research-chatbot-action-button-send"
                  aria-label="Send message"
                >
                  {isLoading ? '•' : '→'}
                </button>
              </div>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <style jsx>{`
        .research-chatbot-dropdown {
          position: fixed;
          top: 55px; /* Start directly under the header */
          right: 8px; /* Small margin from right edge */
          z-index: 9999;
          width: calc(400px + 30px); /* Extend 30px further to the left (35px - 5px) */
          max-width: calc(100vw - 16px); /* Account for 8px margin on each side */
        }

        .research-chatbot-container {
          background: rgba(30, 30, 30, 0.85);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          width: 100%;
          height: calc(100vh - 75px); /* Stretch panel close to bottom */
          max-height: calc(100vh - 75px); /* Ensure it reaches near bottom */
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
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: rgba(30, 30, 30, 0.85);
          backdrop-filter: blur(8px);
        }



        .research-chatbot-message {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .research-chatbot-message-user {
          align-items: flex-end;
        }

        .research-chatbot-message-assistant,
        .research-chatbot-message-system {
          align-items: flex-start;
        }

        .research-chatbot-message-content {
          max-width: 100%;
          width: 100%;
          padding: 16px 20px;
          border-radius: 8px;
          font-size: 16px; /* Larger message text */
          line-height: 1.6;
          word-wrap: break-word;
          box-sizing: border-box;
        }

        .research-chatbot-message-user .research-chatbot-message-content {
          background: rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 400;
        }

        .research-chatbot-message-assistant .research-chatbot-message-content {
          background: rgba(255, 255, 255, 0.08);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 400;
        }

        .research-chatbot-message-system .research-chatbot-message-content {
          background: rgba(255, 255, 255, 0.08);
          color: #FFFFFF;
          border-radius: 8px;
          font-style: italic;
          font-size: 13px;
          border-left: 4px solid rgba(255, 255, 255, 0.3);
          padding-left: 16px;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 400;
        }

        .research-chatbot-message-error .research-chatbot-message-content {
          background: rgba(239, 68, 68, 0.1); // Error background
          color: #FFFFFF; // Pure white like header
          border: 1px solid #ef4444;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
        }

        .research-chatbot-input-container {
          padding: 16px 24px 12px 24px; /* Reduced padding to minimize margins */
          border-top: 1px solid #FFFFFF; // White border like header
          background: rgba(30, 30, 30, 0.85);
          backdrop-filter: blur(8px);
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
          display: block;
        }

        .research-chatbot-input-row {
          display: flex;
          align-items: stretch;
          gap: 8px;
        }

        .research-chatbot-input-area {
          position: relative;
          flex: 1;
        }

        .research-chatbot-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-left: 4px;
        }

        /* Small action buttons (24x24) */
        .research-chatbot-action-button {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #FFFFFF;
          padding: 0;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          width: 24px;
          height: 24px;
          font-size: 12px;
          font-weight: 300;
        }

        .research-chatbot-action-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          border-color: #FFFFFF;
        }

        .research-chatbot-action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .research-chatbot-input {
          width: 100%; // Ensure full width
          min-height: 180px; // Taller input area
          padding: 16px 20px; // Reduced padding to minimize margins
          border: 1px solid #FFFFFF; // White border like header
          border-radius: 6px; // Slightly rounded like Climate TRACE
          background: rgba(255, 255, 255, 0.08); // Slightly darker background for better contrast
          color: #FFFFFF; // Pure white like header
          font-size: 16px; // Larger font size for readability
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-weight: 300; // Light weight like Climate TRACE
          outline: none;
          transition: all 0.2s ease;
          line-height: 1.4; // Better line height for readability
          box-sizing: border-box; // Include padding in width calculation
          word-wrap: break-word;
          white-space: pre-wrap;
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
          color: #444; // Softer gray
        }

        .dataset-option .dataset-description {
          font-size: 11px; // Smaller font size
          color: #666;
          margin-top: 2px;
        }

        .research-chatbot-send {
          background: rgba(255, 255, 255, 0.1); // Subtle background for better visibility inside input
          border: 1px solid rgba(255, 255, 255, 0.3); // Subtle border
          color: #FFFFFF; // Pure white like header
          padding: 6px 8px; // Smaller padding for better fit inside input
          border-radius: 4px; // Smaller radius for subtle appearance
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px; // Smaller size to fit nicely inside input
          height: 32px; // Smaller size to fit nicely inside input
          font-size: 16px; // Appropriate font size for the arrow
          font-weight: 300; // Light weight for minimalistic look
        }

        .research-chatbot-send:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1); // Subtle hover like header
          border-color: #FFFFFF;
        }

        .research-chatbot-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Redesigned token display styling */
        .research-chatbot-tokens-container {
          padding: 8px 24px 12px 24px;
          background: rgba(30, 30, 30, 0.85);
          backdrop-filter: blur(8px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .research-chatbot-tokens-list {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 4px;
          max-height: 120px;
          overflow-y: auto;
          padding-right: 8px;
          align-items: flex-start;
        }

        .research-chatbot-token {
          display: inline-flex;
          align-items: center;
          padding: 5px 10px; /* Bigger token */
          background: rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
          border-radius: 3px;
          font-size: 9px; /* Larger token text */
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: default;
          gap: 3px;
          width: fit-content;
          white-space: nowrap;
          overflow: hidden;
        }

        .research-chatbot-token-remove {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 7px;
          padding: 0;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .research-chatbot-token-remove:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
        }

        /* File token styling - match existing gray token style */
        .research-chatbot-token-file {
          background: rgba(255, 255, 255, 0.1) !important; /* Same as dataset tokens */
          border-color: rgba(255, 255, 255, 0.2) !important;
        }

        .research-chatbot-token-file:hover {
          background: rgba(255, 255, 255, 0.15) !important;
        }

        /* Dataset token styling */
        .research-chatbot-token-dataset {
          background: rgba(255, 255, 255, 0.1); /* Original styling for datasets */
          border-color: rgba(255, 255, 255, 0.2);
        }

        /* Inline upload button styling - same size as send button */
        .research-chatbot-upload-button-inline {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #FFFFFF;
          padding: 6px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height:32px;
          font-size: 12px;
          font-weight: 300;
        }

        .research-chatbot-upload-button-inline:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          border-color: #FFFFFF;
        }

        .research-chatbot-upload-button-inline:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .research-chatbot-upload-icon-inline {
          width: 16px;
          height: 16px;
          fill: currentColor;
        }

        /* Custom scrollbar for tokens list */
        .research-chatbot-tokens-list::-webkit-scrollbar {
          width: 4px;
        }

        .research-chatbot-tokens-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }

        .research-chatbot-tokens-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }

        .research-chatbot-tokens-list::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
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
