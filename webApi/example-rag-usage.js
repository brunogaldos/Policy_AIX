// Example usage of the Web Research Tool RAG System
// This script demonstrates how to add documents and test the RAG functionality

import { SimpleRagIngestion } from './ts-out/rag/simpleIngestion.js';

async function exampleUsage() {
  console.log('🚀 Starting Web Research Tool RAG System Example...\n');

  const ingestion = new SimpleRagIngestion();

  // Example 1: Add a simple document
  console.log('📄 Example 1: Adding a simple document...');
  try {
    await ingestion.addDocument({
      title: "Skills First Policy Overview",
      url: "https://example.com/skills-first-policy",
      description: "An overview of skills-first hiring policies and their benefits",
      content: `Skills-first hiring is a recruitment approach that prioritizes a candidate's skills and abilities over their formal education or work history. This approach has gained significant traction in recent years as organizations recognize the value of diverse talent pools and the limitations of traditional hiring criteria.

Key benefits of skills-first hiring include:
- Increased diversity in the workforce
- Access to untapped talent pools
- Better alignment between job requirements and candidate capabilities
- Reduced bias in hiring processes
- Improved retention rates

Many organizations are now implementing skills-first policies to address talent shortages and create more inclusive workplaces.`,
      category: "Policy"
    });
    console.log('✅ Document added successfully!\n');
  } catch (error) {
    console.error('❌ Failed to add document:', error.message, '\n');
  }

  // Example 2: Add multiple documents
  console.log('📚 Example 2: Adding multiple documents...');
  const documents = [
    {
      title: "Digital Skills Training Programs",
      url: "https://example.com/digital-skills",
      description: "Information about digital skills training and certification programs",
      content: `Digital skills training programs are essential for preparing workers for the modern economy. These programs focus on teaching practical skills such as coding, data analysis, digital marketing, and cybersecurity.

Popular training platforms include:
- Online learning platforms like Coursera and edX
- Bootcamp programs for intensive skill development
- Industry certification programs
- Employer-sponsored training initiatives

The demand for digital skills continues to grow across all sectors, making these training programs increasingly valuable for career advancement.`,
      category: "Training"
    },
    {
      title: "Workforce Development Strategies",
      url: "https://example.com/workforce-development",
      description: "Strategies for developing a skilled workforce in the digital age",
      content: `Workforce development strategies are crucial for building competitive economies in the digital age. These strategies involve collaboration between government, education, and industry to create pathways for skill development and career advancement.

Key components of effective workforce development include:
- Partnerships between educational institutions and employers
- Apprenticeship and internship programs
- Continuing education and professional development opportunities
- Recognition of prior learning and experience
- Support for career transitions and upskilling

Successful workforce development programs often result in improved employment outcomes and economic growth.`,
      category: "Strategy"
    }
  ];

  try {
    const results = await ingestion.addMultipleDocuments(documents);
    console.log(`✅ Added ${results.filter(r => r.success).length} out of ${results.length} documents\n`);
  } catch (error) {
    console.error('❌ Failed to add multiple documents:', error.message, '\n');
  }

  console.log('🎉 RAG System Example Completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Start the server: npm run start');
  console.log('2. Test the RAG chat endpoint: PUT /api/rag_chat');
  console.log('3. Ask questions about the documents you just added');
  console.log('\n💡 Example API call:');
  console.log(`
curl -X PUT http://localhost:5029/api/rag_chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "chatLog": [{"sender": "user", "message": "What are the benefits of skills-first hiring?"}],
    "wsClientId": "test-user"
  }'
  `);
}

// Run the example
exampleUsage().catch(console.error);


