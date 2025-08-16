import WebSocket from 'ws';

async function testChatbot() {
    console.log('🔌 Connecting to chatbot WebSocket...');
    
    const ws = new WebSocket('ws://localhost:9080/ws');
    //const ws = new WebSocket('ws://localhost:5029/ws');
    let clientId = null;
    
    ws.on('open', function open() {
        console.log('✅ Connected to WebSocket server');
    });
    
    let fullResponse = '';
    
    ws.on('message', function message(data) {
        try {
            const response = JSON.parse(data.toString());
            
            // If we get a clientId, store it and send our chat message
            if (response.clientId && !clientId) {
                clientId = response.clientId;
                console.log('🆔 Got client ID:', clientId);
                
                // Send chat message using the PUT API
                sendChatMessage(clientId);
            }
            
            // If we get a bot response, collect it
            if (response.sender === 'bot' && response.type === 'stream') {
                fullResponse += response.message || response.data || '';
            }
            
            // If we get an end message, display full response and close connection
            if (response.sender === 'bot' && response.type === 'end') {
                console.log('\n📝 **FULL CHATBOT RESPONSE:**');
                console.log('='.repeat(60));
                console.log(fullResponse);
                console.log('='.repeat(60));
                console.log('\n🔌 Chat completed, closing connection...');
                ws.close();
                process.exit(0);
            }
            
        } catch (error) {
            console.log('📥 Raw response:', data.toString());
        }
    });
    
    ws.on('error', function error(err) {
        console.error('❌ WebSocket error:', err.message);
        process.exit(1);
    });
    
    ws.on('close', function close() {
        console.log('🔌 WebSocket connection closed');
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
        console.log('⏰ Timeout reached, closing connection...');
        ws.close();
        process.exit(1);
    }, 30000);
}

async function sendChatMessage(clientId) {
    console.log('📤 Sending chat message via HTTP API...');
    
    try {
        //const response = await fetch('http://localhost:5029/api/rd_chat/', {
        const response = await fetch('http://localhost:9080/api/rd_chat/', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatLog: [
                    {
                        sender: 'user',
                        message: '"Give only the NO₂ data for Cali, Colombia and compared it with the NO₂ data for Santiago, Chile'
                    }
                ],
                wsClientId: clientId
            })
        });
        
        if (response.ok) {
            console.log('✅ Chat message sent successfully');
        } else {
            console.error('❌ Failed to send chat message:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ Error sending chat message:', error.message);
    }
}

testChatbot();
