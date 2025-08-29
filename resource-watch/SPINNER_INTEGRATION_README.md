# Spinner Integration for Resource Watch Research API

This document describes the spinner functionality that has been integrated into the Resource Watch research API to show loading states during intermediate message processing.

## Overview

The spinner functionality automatically displays a loading indicator **inline with intermediate messages** on the frontend page (`http://localhost:3000/data/explore`) whenever intermediate messages are being displayed through the WebSocket connection. This provides users with visual feedback that the system is actively processing their research requests by showing an animated progress ring **inline with the message text**, similar to how the original implementation handles thinking messages.

## How It Works

### 1. Automatic Spinner Control

The spinner automatically activates and deactivates based on WebSocket message types:

- **`agentStart`** → Spinner activates (research phase beginning)
- **`agentUpdate`** → Spinner remains active (progress updates)
- **`agentCompleted`** → Spinner deactivates (research phase completed)
- **`streamResponse`** → Spinner remains active (during streaming)
- **`streamEnd`** → Spinner deactivates (streaming ended)
- **`chatResponse`** → Spinner deactivates (response complete)
- **`error`** → Spinner deactivates (error occurred)

### 2. Inline Progress Ring Display

When the spinner is active, it shows a **progress ring animation inline with the message text** for intermediate messages:

**Intermediate messages (with progress ring):**
```
[progress-ring] Generated 7 search queries
[progress-ring] Pairwise Ranking Search Results...
[progress-ring] Processing data...
```

**Completed messages (with checkmark):**
```
✓ Generated 7 search queries
✓ Pairwise Ranking Completed
✓ Found 10 Web Pages
```

The progress ring appears **inline with the message text** for active intermediate messages, and completed messages show a checkmark (✓) instead. This matches the exact behavior of the original implementation.

### 2. Manual Spinner Control

You can also manually control the spinner state using these functions:

```javascript
import * as researchAPI from 'services/research-api';

// Get current spinner state
const isActive = researchAPI.getSpinnerState();

// Manually set spinner state
researchAPI.setSpinnerState(true);  // Show spinner
researchAPI.setSpinnerState(false); // Hide spinner
```

### 3. Spinner State Change Notifications

Register handlers to be notified when the spinner state changes:

```javascript
// Register spinner change handler
researchAPI.onSpinnerChange((active) => {
  console.log(`Spinner is now ${active ? 'active' : 'inactive'}`);
});

// Remove handler when done
researchAPI.offSpinnerChange(handler);
```

## Implementation Details

### Files Modified

1. **`resource-watch/services/research-api.js`**
   - Added `spinnerActive` property to `ResearchWebSocketManager`
   - Added spinner control methods (`setSpinnerActive`, `getSpinnerActive`)
   - Added spinner event handlers (`onSpinnerChange`, `offSpinnerChange`)
   - Integrated automatic spinner control in WebSocket message handling
   - Added spinner state to connection status

2. **`resource-watch/components/research/research-chatbot.jsx`**
   - Added `spinnerActive` state
   - Added spinner change handler
   - Registered spinner handler with research API
   - **Modified message rendering to show progress ring inline with message text**
   - **Progress ring appears in place of emojis within the same message block when active**

3. **`resource-watch/css/index.scss`**
   - Added inline progress ring spinner styling for messages
   - **Added CSS animations for the progress ring spinner**
   - **Removed separate spinner container styles**

### Spinner Component

The spinner uses the existing `Spinner` component from `components/ui/Spinner.js` with the `-inline` class for proper positioning within the chat interface.

## Usage Example

```javascript
// In your React component
import * as researchAPI from 'services/research-api';

function MyComponent() {
  const [spinnerActive, setSpinnerActive] = useState(false);

  useEffect(() => {
    // Listen for spinner state changes
    const handleSpinnerChange = (active) => {
      setSpinnerActive(active);
    };

    researchAPI.onSpinnerChange(handleSpinnerChange);

    return () => {
      researchAPI.offSpinnerChange(handleSpinnerChange);
    };
  }, []);

  return (
    <div>
      {/* Messages will automatically show progress ring inline when spinnerActive is true */}
      {messages.map((msg) => (
        <div key={msg.id}>
          {spinnerActive && msg.sender === 'system' ? (
            <div className="message-with-spinner">
              <svg className="progress-ring" width="16" height="16">
                <circle
                  className="progress-ring__circle"
                  stroke="blue"
                  strokeWidth="2"
                  fill="transparent"
                  r="6"
                  cx="8"
                  cy="8"
                />
              </svg>
              <span>{msg.message}</span>
            </div>
          ) : (
            <span>{msg.message}</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Key Points:**
- The progress ring appears **inline with the message text**
- It's positioned **in place of the emoji** within the same message block
- Uses CSS animations for smooth spinning effect
- The message content remains intact and readable
- No separate spinner container is needed
- Works seamlessly with existing message flow

## Testing

Use the test file `test-spinner-integration.js` to verify the spinner functionality:

```javascript
import { testSpinnerIntegration } from './test-spinner-integration';

// Run the test
testSpinnerIntegration();
```

## Benefits

1. **User Experience**: Users get immediate visual feedback that their request is being processed
2. **Automatic**: No manual intervention required - spinner automatically shows/hides based on message flow
3. **Consistent**: Uses existing spinner component and styling patterns
4. **Flexible**: Supports both automatic and manual control
5. **Integrated**: Seamlessly integrated with existing WebSocket message handling

## Troubleshooting

### Spinner Not Showing

1. Check that the research API service is properly imported
2. Verify that WebSocket messages are being received
3. Check browser console for any JavaScript errors
4. Ensure the spinner component is properly rendered in the UI

### Spinner Not Hiding

1. Check that all message types are properly handled
2. Verify that `setSpinnerActive(false)` is being called
3. Check for any errors in the WebSocket message handling

### Performance Issues

1. The spinner state changes are lightweight and shouldn't impact performance
2. If you experience issues, consider debouncing rapid state changes

## Future Enhancements

1. **Custom Spinner Messages**: Allow different messages for different processing stages
2. **Progress Indicators**: Show progress percentage or step-by-step status
3. **Animation Options**: Provide different spinner animations or styles
4. **Accessibility**: Add ARIA labels and screen reader support
5. **Theming**: Support for different visual themes or color schemes
