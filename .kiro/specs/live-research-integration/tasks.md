# Implementation Plan

- [x] 1. Set up basic backend WebApi connection
  - Start WebApi server on localhost:5029
  - Update CORS settings to allow localhost:3000 (Resource Watch)
  - Remove hardcoded "New Jersey" filter from LiveResearchChatBot
  - _Requirements: 5.1, 5.4_

- [x] 2. Create simple research API service
  - Create `services/research-api.js` with basic WebSocket connection
  - Add conversation method to send research requests
  - Implement basic WebSocket message handling
  - _Requirements: 5.3_

- [x] 3. Create basic research chatbot component
  - Create `components/research/research-chatbot.jsx` as simple React component
  - Copy and adapt core chatbot logic from WebApp
  - Implement basic chat interface with input and message display
  - Add WebSocket connection and message handling
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Add research button to explore page
  - Modify existing test button in `layout/explore/component.jsx`
  - Add state for chatbot modal visibility
  - Create simple modal overlay for chatbot
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 5. Implement basic research pipeline integration
  - Connect React chatbot to WebApi research pipeline
  - Display research progress messages from WebSocket
  - Show final research results with basic formatting
  - _Requirements: 2.4, 5.2_

- [x] 6. Test and debug the prototype
  - Test complete research workflow from button click to results
  - Fix any connection or communication issues
  - Verify research pipeline works with environmental queries
  - _Requirements: 2.5, 4.1_