import WebSocket from 'ws';

async function testWebSocketMessages() {
    console.log('🔌 Testing WebSocket message format...');
    
    const ws = new WebSocket('ws://localhost:5029/ws');
    let clientId = null;
    let messageCount = 0;
    
    ws.on('open', function open() {
        console.log('✅ Connected to WebSocket server');
    });
    
    ws.on('message', function message(data) {
        try {
            const response = JSON.parse(data.toString());
            messageCount++;
            console.log(`📨 Message #${messageCount}:`, JSON.stringify(response, null, 2));
            
            // If we get a clientId, store it and send our chat message
            if (response.clientId && !clientId) {
                clientId = response.clientId;
                console.log('🆔 Got client ID:', clientId);
                
                // Send a test research request to trigger agent messages
                setTimeout(() => {
                    console.log('🚀 Sending test research request...');
                    sendTestResearchRequest(clientId);
                }, 1000);
            }
            
            // Check message format for agent messages
            if (response.type === 'agentStart' || response.type === 'agentUpdate' || response.type === 'agentCompleted') {
                console.log('🔍 Agent message detected:');
                console.log('  Type:', response.type);
                console.log('  Data:', response.data);
                console.log('  Message:', response.message);
                console.log('  Full structure:', Object.keys(response));
            }
            
            // Check for streaming messages
            if (response.type === 'stream' || response.type === 'streamResponse' || response.type === 'stream_response') {
                console.log('🔍 Streaming message detected:');
                console.log('  Type:', response.type);
                console.log('  Content:', response.content);
                console.log('  Message:', response.message);
                console.log('  Data:', response.data);
            }
            
            // Check for end messages
            if (response.type === 'end' || response.type === 'streamEnd' || response.type === 'stream_end') {
                console.log('🔍 End message detected:');
                console.log('  Type:', response.type);
                console.log('  Full message:', response);
            }
            
        } catch (error) {
            console.log('📥 Raw response:', data.toString());
        }
    });
    
    ws.on('error', function error(err) {
        console.error('❌ WebSocket error:', err.message);
    });
    
    ws.on('close', function close() {
        console.log('🔌 WebSocket connection closed');
        console.log(`📊 Total messages received: ${messageCount}`);
        process.exit(0);
    });
}

async function sendTestResearchRequest(clientId) {
    try {
        const response = await fetch('http://localhost:5029/api/policy_research/', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wsClientId: clientId,
                chatLog: [{
                    sender: 'user',
                    message: 'Test research question: What are the current policies on renewable energy?'
                }],
                numberOfSelectQueries: 3,
                percentOfTopQueriesToSearch: 0.5,
                percentOfTopResultsToScan: 0.5
            })
        });
        
        if (response.ok) {
            console.log('✅ Test research request sent successfully');
            console.log('⏳ Waiting for research to complete...');
        } else {
            console.error('❌ Test research request failed:', response.status);
        }
    } catch (error) {
        console.error('❌ Error sending test research request:', error);
    }
}

// Run the test
testWebSocketMessages().catch(console.error);
