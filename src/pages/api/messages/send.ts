import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API with error handling
let genAI: any;
try {
  // Make sure to initialize with the API key
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  console.log('Gemini API initialized successfully');
} catch (error) {
  console.error('Failed to initialize Gemini API:', error);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, userName, roomId, replyToId } = req.body;

    if (!content || !userName || !roomId) {
      return res.status(400).json({ error: 'Content, userName, and roomId are required' });
    }

    // Create the user message with optional reply reference
    const message = await prisma.message.create({
      data: {
        content,
        userName,
        roomId,
        isAI: false,
        replyToId: replyToId || null,
      },
    });

    // Check if the message is directed to AI
    if (content.toLowerCase().startsWith('@ai')) {
      try {
        console.log('AI request detected:', content);
        const aiPrompt = content.substring(3).trim();
        
        if (!process.env.GEMINI_API_KEY) {
          console.error('GEMINI_API_KEY is not set');
          throw new Error('GEMINI_API_KEY is not set');
        }
        
        // Re-initialize the API client for each request to ensure fresh configuration
        const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log('API Key length:', process.env.GEMINI_API_KEY?.length);
        
        // Try with gemini-pro first (which is the most common model name)
        let result;
        try {
          console.log('Trying with model: gemini-pro');
          const model = geminiAI.getGenerativeModel({ model: "gemini-pro" });
          console.log('Sending to Gemini API:', aiPrompt);
          result = await model.generateContent(aiPrompt);
        } catch (error: any) {
          console.log('Error with gemini-pro, trying gemini-1.5-pro:', error.message);
          // If that fails, try with gemini-1.5-pro
          try {
            const model = geminiAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            result = await model.generateContent(aiPrompt);
          } catch (error2: any) {
            console.log('Error with gemini-1.5-pro, trying gemini-1.0-pro:', error2.message);
            // If that also fails, try with gemini-1.0-pro as a last resort
            const model = geminiAI.getGenerativeModel({ model: "gemini-1.0-pro" });
            result = await model.generateContent(aiPrompt);
          }
        }
        
        // Extract the response text
        const response = result.response;
        const aiResponse = response.text() || "Sorry, I couldn't process that request.";
        console.log('Received AI response:', aiResponse.substring(0, 50) + '...');

        // Create the AI response message
        const aiMessage = await prisma.message.create({
          data: {
            content: aiResponse,
            userName: "AI Assistant",
            roomId,
            isAI: true,
          },
        });

        return res.status(201).json({ userMessage: message, aiMessage });
      } catch (aiError: any) {
        console.error('Error generating AI response:', aiError);
        
        // Create a more helpful error message from the AI
        const errorMessage = await prisma.message.create({
          data: {
            content: `I'm having trouble processing your request right now. Error: ${aiError.message || 'Please try again later.'}`,
            userName: "AI Assistant",
            roomId,
            isAI: true,
          },
        });
        
        // Return both the user message and the error message
        return res.status(201).json({ 
          userMessage: message, 
          aiMessage: errorMessage
        });
      }
    }

    return res.status(201).json({ userMessage: message });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}