import WebSocket from 'ws';

async function testStreamingOnly() {
    console.log('🔌 Testing streaming functionality only...');
    
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
            
            // If we get a clientId, store it and send a simple followup question
            if (response.clientId && !clientId) {
                clientId = response.clientId;
                console.log('🆔 Got client ID:', clientId);
                
                // Send a simple followup question to test streaming
                setTimeout(() => {
                    console.log('🚀 Sending followup question...');
                    sendFollowupQuestion(clientId);
                }, 1000);
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
                console.log('✅ Streaming test completed successfully!');
                ws.close();
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

async function sendFollowupQuestion(clientId) {
    try {
        const response = await fetch('http://localhost:5029/api/policy_research/', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wsClientId: clientId,
                chatLog: [
                    {
                        sender: 'user',
                        message: 'What are the current policies on renewable energy?'
                    },
                    {
                        sender: 'assistant',
                        message: 'I have researched renewable energy policies. Here are the key findings...'
                    },
                    {
                        sender: 'user',
                        message: 'Can you provide more details about solar energy policies specifically?'
                    }
                ],
                numberOfSelectQueries: 3,
                percentOfTopQueriesToSearch: 0.5,
                percentOfTopResultsToScan: 0.5
            })
        });
        
        if (response.ok) {
            console.log('✅ Followup question sent successfully');
            console.log('⏳ Waiting for streaming response...');
        } else {
            console.error('❌ Followup question failed:', response.status);
        }
    } catch (error) {
        console.error('❌ Error sending followup question:', error);
    }
}

// Run the test
testStreamingOnly().catch(console.error);


