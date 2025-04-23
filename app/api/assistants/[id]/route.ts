import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3, getSignedDownloadUrl } from '../../../lib/s3';
import { promises as fs } from 'fs';
import path from 'path';
import { Assistant } from '../../../../src/types';

interface ApiResponse {
  success: boolean;
  error?: {
    message: string;
    type?: string;
  };
}

function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext || '';
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    const formData = await request.formData();
    const assistantId = params.id;
    const demoId = assistantId.split('-')[0];

    // Handle icon file
    const iconFile = formData.get('icon') as File;
    let iconPath = '';
    if (iconFile && iconFile.size > 0) {
      const iconBuffer = Buffer.from(await iconFile.arrayBuffer());
      iconPath = `demos/${demoId}/icons/${assistantId}.${getFileExtension(iconFile.name)}`;
      await uploadToS3(iconBuffer, iconPath, iconFile.type);
    }

    // Handle markdown file
    const markdownFile = formData.get('markdown') as File;
    let markdownPath = '';
    if (markdownFile && markdownFile.size > 0) {
      const markdownBuffer = Buffer.from(await markdownFile.arrayBuffer());
      markdownPath = `demos/${demoId}/markdown/${assistantId}.md`;
      await uploadToS3(markdownBuffer, markdownPath, 'text/markdown');
    }

    // Update assistant data
    const assistant: Partial<Assistant> = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      isAvailableAtStart: formData.get('isAvailableAtStart') === 'true',
      orderIndex: parseInt(formData.get('orderIndex') as string),
    };

    if (iconPath) {
      assistant.iconPath = iconPath;
    }
    if (markdownPath) {
      assistant.promptMarkdownPath = markdownPath;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating assistant:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to update assistant' } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assistantId = params.id;
    const formData = await request.formData();
    const iconFile = formData.get('icon') as File;

    if (!iconFile) {
      return new NextResponse('No icon file provided', { status: 400 });
    }

    // Upload icon to S3
    const key = `assistants/${assistantId}/icon-${Date.now()}.${iconFile.name.split('.').pop()}`;
    await uploadToS3(key, await iconFile.arrayBuffer());

    // Get signed URL for the uploaded icon
    const iconUrl = await getSignedDownloadUrl(key);

    // Update the assistant's icon URL in the case config
    const caseId = assistantId.split('-')[0];
    const configPath = path.join(process.cwd(), 'public', 'demos', caseId, 'config.json');
    
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    const assistantIndex = config.assistants.findIndex((a: any) => a.id === assistantId);
    if (assistantIndex === -1) {
      return new NextResponse('Assistant not found', { status: 404 });
    }

    // Update icon URL
    config.assistants[assistantIndex].iconUrl = iconUrl;

    // Save updated config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    return NextResponse.json({ iconUrl });
  } catch (error) {
    console.error('Error uploading assistant icon:', error);
    return new NextResponse('Error uploading icon', { status: 500 });
  }
} 