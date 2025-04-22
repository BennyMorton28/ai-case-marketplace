import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { s3Client, BUCKET_NAME } from '../../lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'edge';

// Initialize OpenAI client with API key from environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

console.log('Initializing OpenAI client with API key:', OPENAI_API_KEY.slice(0, 5) + '...');
const client = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// Define the type for a message in the conversation
type MessageRole = 'system' | 'user' | 'assistant';
interface ConversationMessage {
  role: MessageRole;
  content: string;
}

export async function POST(req: Request) {
  try {
    const { prompt, messageHistory, assistantId, demoId: caseId } = await req.json();

    console.log('Received request with:', {
      prompt,
      messageHistoryLength: messageHistory?.length,
      assistantId,
      caseId
    });

    if (!prompt || !assistantId || !caseId) {
      console.error('Missing required fields:', { prompt, assistantId, caseId });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Try to load the markdown instructions from S3
    let instructions = '';
    try {
      const s3Key = `demos/${caseId}/markdown/${assistantId}.md`;
      console.log('Fetching markdown from S3:', s3Key);
      
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      });

      const response = await s3Client.send(command);
      if (response.Body) {
        instructions = await response.Body.transformToString();
        console.log('Found instructions in S3, length:', instructions.length);
        console.log('First 100 chars of instructions:', instructions.slice(0, 100));
      }
    } catch (error) {
      console.error('Error fetching from S3:', error);
      return NextResponse.json(
        { error: 'Assistant instructions not found' },
        { status: 404 }
      );
    }

    if (!instructions) {
      console.error('No instructions found for:', { caseId, assistantId });
      return NextResponse.json(
        { error: 'Assistant instructions not found' },
        { status: 404 }
      );
    }

    try {
      // Format the input as a single string
      let input = instructions + "\n\n";
      
      // Add message history if available
      if (messageHistory && Array.isArray(messageHistory)) {
        messageHistory.forEach(msg => {
          input += `${msg.role}: ${msg.content}\n`;
        });
      }

      // Add the current prompt
      input += `\nuser: ${prompt}`;

      console.log('Using OpenAI model: gpt-4o');
      console.log('Input length:', input.length);
      console.log('Input preview:', input.slice(0, 100));

      const stream = await client.responses.create({
        model: "gpt-4o",
        input: input,
        stream: true,
      });

      // Create a new TransformStream for streaming the response
      const encoder = new TextEncoder();
      const stream_response = new TransformStream();
      const writer = stream_response.writable.getWriter();

      // Start processing the stream
      (async () => {
        try {
          for await (const event of stream) {
            if (event.type === "response.output_text.delta") {
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({
                  item_id: event.item_id,
                  output_index: event.output_index,
                  content_index: event.content_index,
                  delta: event.delta
                })}\n\n`)
              );
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream processing error' })}\n\n`)
          );
        } finally {
          await writer.close();
        }
      })();

      // Return the readable stream
      return new NextResponse(stream_response.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error) {
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to process request with OpenAI API' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 