#!/usr/bin/env node

// Test script for the integrated Policy Research Assistant
// This demonstrates the hybrid approach combining RAG and live research

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5029/api';

async function testPolicyResearch() {
    console.log('🧪 Testing Integrated Policy Research Assistant...\n');

    // Test 1: Basic policy research request
    console.log('📋 Test 1: Basic Policy Research Request');
    console.log('Query: "What policies should Cali implement based on NO₂ levels?"\n');

    try {
        const response = await fetch(`${API_BASE_URL}/policy_research/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatLog: [{
                    sender: 'user',
                    message: 'What policies should Cali implement based on NO₂ levels?',
                    date: new Date().toISOString()
                }],
                wsClientId: 'test-client-001',
                memoryId: 'test-memory-001',
                dataLayout: {
                    categories: ['Air Quality', 'Transportation', 'Urban Planning', 'Environmental Policy'],
                    aboutProject: 'Skills First Policy Research Assistant for urban air quality improvement'
                }
            })
        });

        if (response.ok) {
            console.log('✅ Test 1: Request sent successfully');
            const result = await response.json();
            console.log('📄 Response:', JSON.stringify(result, null, 2));
        } else {
            console.log('❌ Test 1: Request failed');
            console.log('Status:', response.status);
            console.log('Response:', await response.text());
        }
    } catch (error) {
        console.log('❌ Test 1: Error occurred');
        console.log('Error:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Follow-up question
    console.log('📋 Test 2: Follow-up Question');
    console.log('Query: "What are the implementation costs for these policies?"\n');

    try {
        const response = await fetch(`${API_BASE_URL}/policy_research/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatLog: [
                    {
                        sender: 'user',
                        message: 'What policies should Cali implement based on NO₂ levels?',
                        date: new Date().toISOString()
                    },
                    {
                        sender: 'bot',
                        message: 'Based on Cali\'s NO₂ levels, I recommend implementing public transportation improvements and industrial emission regulations.',
                        date: new Date().toISOString()
                    },
                    {
                        sender: 'user',
                        message: 'What are the implementation costs for these policies?',
                        date: new Date().toISOString()
                    }
                ],
                wsClientId: 'test-client-002',
                memoryId: 'test-memory-002',
                dataLayout: {
                    categories: ['Air Quality', 'Transportation', 'Urban Planning', 'Environmental Policy'],
                    aboutProject: 'Skills First Policy Research Assistant for urban air quality improvement'
                }
            })
        });

        if (response.ok) {
            console.log('✅ Test 2: Follow-up request sent successfully');
            const result = await response.json();
            console.log('📄 Response:', JSON.stringify(result, null, 2));
        } else {
            console.log('❌ Test 2: Follow-up request failed');
            console.log('Status:', response.status);
            console.log('Response:', await response.text());
        }
    } catch (error) {
        console.log('❌ Test 2: Error occurred');
        console.log('Error:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: CORS test
    console.log('📋 Test 3: CORS Test\n');

    try {
        const response = await fetch(`${API_BASE_URL}/policy_research/test`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            console.log('✅ Test 3: CORS test successful');
            const result = await response.json();
            console.log('📄 Response:', JSON.stringify(result, null, 2));
        } else {
            console.log('❌ Test 3: CORS test failed');
            console.log('Status:', response.status);
            console.log('Response:', await response.text());
        }
    } catch (error) {
        console.log('❌ Test 3: Error occurred');
        console.log('Error:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('🎉 Policy Research Assistant Testing Complete!');
    console.log('\n📝 Summary:');
    console.log('- Test 1: Basic policy research request');
    console.log('- Test 2: Follow-up question handling');
    console.log('- Test 3: CORS functionality');
    console.log('\n🔗 API Endpoints:');
    console.log('- PUT /api/policy_research/ - Main policy research endpoint');
    console.log('- GET /api/policy_research/:memoryId - Get chat history');
    console.log('- GET /api/policy_research/test - CORS test endpoint');
}

// Run the tests
testPolicyResearch().catch(console.error);
