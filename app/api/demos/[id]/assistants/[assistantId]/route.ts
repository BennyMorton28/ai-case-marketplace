import { NextRequest, NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME } from '../../../../../lib/s3';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// List of static demo IDs that should be protected
const staticDemoIds = ['math-assistant', 'writing-assistant', 'language-assistant', 'coding-assistant'];

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; assistantId: string } }
) {
  try {
    const { id: demoId, assistantId } = params;
    const updatedAssistant = await request.json();

    // Validate that the assistant ID matches
    if (assistantId !== updatedAssistant.id) {
      return NextResponse.json({ error: 'Assistant ID mismatch' }, { status: 400 });
    }

    // Get the config from S3
    const getConfigCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `demos/${demoId}/config.json`
    });

    const configResponse = await s3Client.send(getConfigCommand);
    const configString = await configResponse.Body?.transformToString();
    if (!configString) {
      return NextResponse.json({ error: 'Could not read demo configuration' }, { status: 500 });
    }

    const config = JSON.parse(configString);

    // Update the assistant in the config
    const assistantIndex = config.assistants.findIndex((a: any) => a.id === assistantId);
    if (assistantIndex === -1) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
      }
    config.assistants[assistantIndex] = updatedAssistant;

    // Save updated config back to S3
      const putConfigCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
      Key: `demos/${demoId}/config.json`,
        Body: JSON.stringify(config, null, 2),
        ContentType: 'application/json'
      });
      await s3Client.send(putConfigCommand);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating assistant:', error);
    return NextResponse.json({ error: 'Failed to update assistant' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; assistantId: string } }
) {
  try {
    const { id: demoId, assistantId } = params;

    // Get the current config from S3
    const configKey = `demos/${demoId}/config.json`;
      const getConfigCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: configKey
      });
    
      const configResponse = await s3Client.send(getConfigCommand);
    const configString = await configResponse.Body?.transformToString();
    if (!configString) {
      return NextResponse.json({ error: 'Demo config not found' }, { status: 404 });
      }

    const config = JSON.parse(configString);

      // Find the assistant to delete
      const assistantIndex = config.assistants.findIndex((a: any) => a.id === assistantId);
      if (assistantIndex === -1) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
      }

      // Get the assistant's data before removing it
      const assistant = config.assistants[assistantIndex];

      // Delete assistant's icon from S3 if it exists
      if (assistant.iconPath) {
        try {
          const deleteIconCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: assistant.iconPath
          });
          await s3Client.send(deleteIconCommand);
        } catch (error) {
          console.error('Error deleting assistant icon:', error);
          // Continue with deletion even if icon deletion fails
        }
      }

      // Delete assistant's markdown file from S3 if it exists
      if (assistant.promptMarkdownPath) {
        try {
          const deleteMarkdownCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: assistant.promptMarkdownPath
          });
          await s3Client.send(deleteMarkdownCommand);
        } catch (error) {
          console.error('Error deleting assistant markdown:', error);
          // Continue with deletion even if markdown deletion fails
        }
      }

      // Remove the assistant from the config
      config.assistants.splice(assistantIndex, 1);
      config.updatedAt = new Date().toISOString();

      // Save the updated config back to S3
      const putConfigCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: configKey,
        Body: JSON.stringify(config, null, 2),
        ContentType: 'application/json'
      });
      await s3Client.send(putConfigCommand);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting assistant:', error);
    return NextResponse.json({ error: 'Failed to delete assistant' }, { status: 500 });
  }
} 