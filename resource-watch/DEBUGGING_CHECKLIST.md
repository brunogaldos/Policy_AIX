# Research Integration Debugging Checklist

## Pre-Testing Setup

### 1. Start WebApi Server
```bash
cd webApi
npm install  # if not done already
npm start    # Should start on port 5029
```

### 2. Start Resource Watch
```bash
cd resource-watch
npm install  # if not done already
npm run dev  # Should start on port 3000
```

### 3. Verify Environment Variables
Check that these are set correctly:
- `NEXT_PUBLIC_RESEARCH_API_URL=http://localhost:5029`
- `NEXT_PUBLIC_RESEARCH_WS_URL=ws://localhost:5029/ws`

## Step-by-Step Testing

### Phase 1: Basic Connectivity
1. **Test WebApi Server**
   - Open browser to `http://localhost:5029`
   - Should see some response (even 404 is fine, means server is running)

2. **Test Resource Watch**
   - Open browser to `http://localhost:3000`
   - Navigate to explore page
   - Look for the blue "Research" button in top-right corner

### Phase 2: WebSocket Connection
1. **Open Browser DevTools** (F12)
2. **Click Research Button**
3. **Check Console for:**
   - WebSocket connection attempts
   - Any error messages
   - Client ID assignment

### Phase 3: Research Pipeline
1. **Type a simple environmental query** like:
   - "What is climate change?"
   - "How does deforestation affect biodiversity?"

2. **Watch for:**
   - Progress messages (🔄 Starting research...)
   - Agent updates (search queries, web scanning)
   - Final research results

## Common Issues and Solutions

### Issue 1: WebSocket Connection Failed
**Symptoms:** Red connection indicator, "Failed to connect" message
**Check:**
- WebApi server is running on port 5029
- No firewall blocking WebSocket connections
- Browser console shows WebSocket errors

**Fix:**
- Restart WebApi server
- Check CORS settings in WebApi
- Verify WebSocket URL in environment variables

### Issue 2: Network Error on Research Request
**Symptoms:** "❌ Failed to send message: Network Error"
**Check:**
- Browser DevTools Network tab for failed requests
- WebApi server logs for errors
- CORS configuration in WebApi server
- API endpoint URL is correct

**Debug Steps:**
1. Open Browser DevTools (F12) → Network tab
2. Try sending a message again
3. Look for failed HTTP requests (red entries)
4. Check the request details (URL, headers, response)

**Common Causes:**
- CORS blocking the request
- WebApi server not responding to HTTP requests
- Wrong API endpoint URL
- WebApi server crashed or restarted

**Fix:**
- Check WebApi server terminal for error messages
- Verify CORS settings allow localhost:3000
- Test API endpoint manually (see debug commands below)
- Restart WebApi server if needed

### Issue 3: No Research Results
**Symptoms:** Research completes but no results shown
**Check:**
- WebSocket messages in DevTools
- Message parsing in research-api.js
- Component state updates

**Fix:**
- Check message type handling
- Verify response parsing logic
- Debug React component state

### Issue 4: CORS Errors
**Symptoms:** Browser blocks requests to WebApi
**Check:**
- Browser console for CORS errors
- WebApi CORS configuration

**Fix:**
- Update WebApi CORS settings to allow localhost:3000
- Restart WebApi server after changes

## Debug Commands

### Test WebSocket Connection Manually
```javascript
// Run in browser console
const ws = new WebSocket('ws://localhost:5029/ws');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
ws.onerror = (e) => console.log('Error:', e);
```

### Test API Endpoint Manually
```javascript
// Run in browser console - Step 1: Simple connectivity test
fetch('http://localhost:5029/')
  .then(r => console.log('Server responding:', r.status))
  .catch(e => console.log('Server not reachable:', e));

// Step 2: Test the research endpoint
fetch('http://localhost:5029/api/live_research_chat/', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wsClientId: 'test-client-id',
    chatLog: [{ sender: 'user', message: 'test', timestamp: new Date() }],
    numberOfSelectQueries: 3,
    percentOfTopQueriesToSearch: 0.5,
    percentOfTopResultsToScan: 0.5
  })
})
.then(r => {
  console.log('API Response status:', r.status);
  return r.text();
})
.then(text => console.log('API Response:', text))
.catch(e => console.log('API Error:', e));
```

### Immediate Debug Steps for Network Error
```javascript
// 1. Check if WebApi server is reachable
console.log('Testing WebApi server...');
fetch('http://localhost:5029/').then(r => console.log('✅ Server reachable:', r.status)).catch(e => console.log('❌ Server not reachable:', e));

// 2. Check current environment variables
console.log('Environment config:', {
  API_URL: process.env.NEXT_PUBLIC_RESEARCH_API_URL || 'http://localhost:5029',
  WS_URL: process.env.NEXT_PUBLIC_RESEARCH_WS_URL || 'ws://localhost:5029/ws'
});

// 3. Test with minimal payload
fetch('http://localhost:5029/api/live_research_chat/', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: 'minimal' })
}).then(r => console.log('Minimal test status:', r.status)).catch(e => console.log('Minimal test error:', e));
```

## Expected Behavior

### Successful Flow:
1. Click Research button → Modal opens
2. WebSocket connects → Green indicator, "Connected" status
3. Type query → User message appears in chat
4. Research starts → Progress messages appear
5. Research completes → Results with citations appear

### Message Flow:
1. `agentStart` → "🔄 Starting research..."
2. `agentUpdate` → "🔄 Generating search queries..."
3. `agentCompleted` → "✅ Search queries generated"
4. `agentStart` → "🔄 Searching web..."
5. `agentUpdate` → "🔄 Scanning web pages..."
6. `chatResponse` → Final research results

## Debugging Tips

1. **Use Browser DevTools extensively**
   - Console tab for errors and logs
   - Network tab for API requests
   - WebSocket frames in Network tab

2. **Check both client and server logs**
   - Resource Watch console logs
   - WebApi server terminal output

3. **Test with simple queries first**
   - Start with basic questions
   - Avoid complex or very specific queries initially

4. **Monitor resource usage**
   - WebApi can be memory/CPU intensive
   - Consider reducing query parameters for testing

5. **Test incrementally**
   - First test WebSocket connection
   - Then test API endpoint
   - Finally test complete workflow

## Quick Fixes for Common Problems

### Fix 1: Update WebApi CORS (if needed)
```typescript
// In webApi/src/customApp.ts
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
```

### Fix 2: Reduce Research Parameters for Testing
```javascript
// In research-chatbot.jsx, reduce these values:
numberOfSelectQueries = 3  // instead of 7
percentOfTopQueriesToSearch = 0.5  // instead of 0.25
percentOfTopResultsToScan = 0.5    // instead of 0.25
```

### Fix 3: Add More Logging
```javascript
// Add to research-api.js for debugging
console.log('WebSocket message received:', message);
console.log('Sending research request:', payload);
```

## Success Criteria

✅ **Task 6 Complete When:**
- [ ] Research button opens modal successfully
- [ ] WebSocket connection establishes (green indicator)
- [ ] Can send environmental queries
- [ ] Research pipeline processes queries
- [ ] Results appear with proper formatting
- [ ] Error handling works (try invalid queries)
- [ ] Connection recovery works (restart WebApi during use)

## Next Steps After Debugging

Once basic functionality works:
1. Test with various environmental queries
2. Verify citation links work
3. Test error scenarios
4. Check mobile responsiveness
5. Performance testing with longer queries