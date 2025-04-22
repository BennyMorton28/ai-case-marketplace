import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSavePaths } from '../../../../../lib/files';
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
    const { publicPath, standalonePath } = getSavePaths();
    const updatedAssistant = await request.json();

    // Validate the assistant ID matches
    if (assistantId !== updatedAssistant.id) {
      return new NextResponse('Assistant ID mismatch', { status: 400 });
    }

    // Get the demo config
    const configPath = path.join(publicPath, 'public', 'demos', demoId, 'config.json');
    if (!fs.existsSync(configPath)) {
      return new NextResponse('Demo not found', { status: 404 });
    }

    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // Find and update the assistant
    const assistantIndex = config.assistants.findIndex((a: any) => a.id === assistantId);
    if (assistantIndex === -1) {
      return new NextResponse('Assistant not found', { status: 404 });
    }

    // Update the assistant
    config.assistants[assistantIndex] = {
      ...config.assistants[assistantIndex],
      ...updatedAssistant,
    };

    // Update timestamps
    config.updatedAt = new Date().toISOString();

    // Write to public path
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Updated demo config at: ${configPath}`);

    // If standalone path exists, update there too
    if (standalonePath) {
      const standaloneConfigPath = path.join(standalonePath, 'public', 'demos', demoId, 'config.json');
      if (fs.existsSync(standaloneConfigPath)) {
        fs.writeFileSync(standaloneConfigPath, JSON.stringify(config, null, 2));
        console.log(`Also updated demo config at standalone: ${standaloneConfigPath}`);
      }
    }

    return new NextResponse(JSON.stringify(updatedAssistant), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error updating assistant:', error);
    return new NextResponse('Error updating assistant', { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; assistantId: string } }
) {
  try {
    const { id: demoId, assistantId } = params;

    // Don't allow deleting assistants from static demos
    if (staticDemoIds.includes(demoId)) {
      return new NextResponse('Cannot delete assistants from static demos', { status: 403 });
    }

    // Get the current config from S3
    const configKey = `demos/${demoId}/config.json`;
    try {
      const getConfigCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: configKey
      });
      const configResponse = await s3Client.send(getConfigCommand);
      const configText = await configResponse.Body?.transformToString();
      if (!configText) {
        return new NextResponse('Demo config not found', { status: 404 });
      }

      const config = JSON.parse(configText);

      // Find the assistant to delete
      const assistantIndex = config.assistants.findIndex((a: any) => a.id === assistantId);
      if (assistantIndex === -1) {
        return new NextResponse('Assistant not found', { status: 404 });
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
          console.log(`Deleted assistant icon: ${assistant.iconPath}`);
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
          console.log(`Deleted assistant markdown: ${assistant.promptMarkdownPath}`);
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

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error('Error accessing demo config:', error);
      return new NextResponse('Error accessing demo configuration', { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting assistant:', error);
    return new NextResponse('Error deleting assistant', { status: 500 });
  }
} 
import fs from 'fs';
import path from 'path';
import { getSavePaths } from '../../../../../lib/files';
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
    const { publicPath, standalonePath } = getSavePaths();
    const updatedAssistant = await request.json();

    // Validate the assistant ID matches
    if (assistantId !== updatedAssistant.id) {
      return new NextResponse('Assistant ID mismatch', { status: 400 });
    }

    // Get the demo config
    const configPath = path.join(publicPath, 'public', 'demos', demoId, 'config.json');
    if (!fs.existsSync(configPath)) {
      return new NextResponse('Demo not found', { status: 404 });
    }

    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // Find and update the assistant
    const assistantIndex = config.assistants.findIndex((a: any) => a.id === assistantId);
    if (assistantIndex === -1) {
      return new NextResponse('Assistant not found', { status: 404 });
    }

    // Update the assistant
    config.assistants[assistantIndex] = {
      ...config.assistants[assistantIndex],
      ...updatedAssistant,
    };

    // Update timestamps
    config.updatedAt = new Date().toISOString();

    // Write to public path
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Updated demo config at: ${configPath}`);

    // If standalone path exists, update there too
    if (standalonePath) {
      const standaloneConfigPath = path.join(standalonePath, 'public', 'demos', demoId, 'config.json');
      if (fs.existsSync(standaloneConfigPath)) {
        fs.writeFileSync(standaloneConfigPath, JSON.stringify(config, null, 2));
        console.log(`Also updated demo config at standalone: ${standaloneConfigPath}`);
      }
    }

    return new NextResponse(JSON.stringify(updatedAssistant), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error updating assistant:', error);
    return new NextResponse('Error updating assistant', { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; assistantId: string } }
) {
  try {
    const { id: demoId, assistantId } = params;

    // Don't allow deleting assistants from static demos
    if (staticDemoIds.includes(demoId)) {
      return new NextResponse('Cannot delete assistants from static demos', { status: 403 });
    }

    // Get the current config from S3
    const configKey = `demos/${demoId}/config.json`;
    try {
      const getConfigCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: configKey
      });
      const configResponse = await s3Client.send(getConfigCommand);
      const configText = await configResponse.Body?.transformToString();
      if (!configText) {
        return new NextResponse('Demo config not found', { status: 404 });
      }

      const config = JSON.parse(configText);

      // Find the assistant to delete
      const assistantIndex = config.assistants.findIndex((a: any) => a.id === assistantId);
      if (assistantIndex === -1) {
        return new NextResponse('Assistant not found', { status: 404 });
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
          console.log(`Deleted assistant icon: ${assistant.iconPath}`);
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
          console.log(`Deleted assistant markdown: ${assistant.promptMarkdownPath}`);
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

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error('Error accessing demo config:', error);
      return new NextResponse('Error accessing demo configuration', { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting assistant:', error);
    return new NextResponse('Error deleting assistant', { status: 500 });
  }
} 