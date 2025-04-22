import { s3Client, BUCKET_NAME, uploadToS3 } from '../app/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const demos = [
  {
    id: 'communicate-instructions',
    title: 'Communicate Instructions',
    author: 'Rob Bray',
    iconPath: 'demos/communicate-instructions/icon.svg',
    assistants: [
      {
        id: 'instructor',
        name: 'Instructor',
        description: 'An AI assistant that helps communicate instructions effectively',
        iconPath: 'demos/communicate-instructions/assistants/instructor/icon.svg',
        hasPassword: false,
        isAvailableAtStart: true,
        promptMarkdownPath: 'demos/communicate-instructions/markdown/instructor.md',
        orderIndex: 0
      }
    ]
  },
  {
    id: 'guided-homeworks',
    title: 'Guided Homeworks',
    author: 'Rob Bray and Sebastien Martin',
    iconPath: 'demos/guided-homeworks/icon.svg',
    assistants: [
      {
        id: 'guide',
        name: 'Guide',
        description: 'An AI assistant that helps with homework guidance',
        iconPath: 'demos/guided-homeworks/assistants/guide/icon.svg',
        hasPassword: false,
        isAvailableAtStart: true,
        promptMarkdownPath: 'demos/guided-homeworks/markdown/guide.md',
        orderIndex: 0
      }
    ]
  },
  {
    id: 'sally',
    title: 'Sally',
    author: 'Harry',
    iconPath: 'demos/sally/icon.svg',
    assistants: [
      {
        id: 'assistant',
        name: 'Sally',
        description: 'An AI assistant named Sally',
        iconPath: 'demos/sally/assistants/assistant/icon.svg',
        hasPassword: false,
        isAvailableAtStart: true,
        promptMarkdownPath: 'demos/sally/markdown/assistant.md',
        orderIndex: 0
      }
    ]
  },
  {
    id: 'karen',
    title: 'Karen',
    author: 'Benny',
    iconPath: 'demos/karen/icon.svg',
    assistants: [
      {
        id: 'assistant',
        name: 'Karen',
        description: 'An AI assistant named Karen',
        iconPath: 'demos/karen/assistants/assistant/icon.svg',
        hasPassword: false,
        isAvailableAtStart: true,
        promptMarkdownPath: 'demos/karen/markdown/assistant.md',
        orderIndex: 0
      }
    ]
  },
  {
    id: 'robs-wonderland',
    title: "Rob's Wonderland",
    author: 'Benny',
    iconPath: 'demos/robs-wonderland/icon.svg',
    assistants: [
      {
        id: 'assistant',
        name: 'Rob',
        description: 'An AI assistant in Rob\'s Wonderland',
        iconPath: 'demos/robs-wonderland/assistants/assistant/icon.svg',
        hasPassword: false,
        isAvailableAtStart: true,
        promptMarkdownPath: 'demos/robs-wonderland/markdown/assistant.md',
        orderIndex: 0
      }
    ]
  }
];

async function createDemoConfigs() {
  for (const demo of demos) {
    try {
      // Create base config
      const config = {
        ...demo,
        hasPassword: false,
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        explanationMarkdownPath: `demos/${demo.id}/markdown/explanation.md`
      };

      // Upload config
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `demos/${demo.id}/config.json`,
        Body: JSON.stringify(config, null, 2),
        ContentType: 'application/json'
      }));

      console.log(`Created/updated config for ${demo.id}`);

      // Create default markdown files
      const defaultMarkdown = `# ${demo.title}\n\nWelcome to ${demo.title}!`;
      
      // Upload explanation markdown
      await uploadToS3(
        Buffer.from(defaultMarkdown),
        `demos/${demo.id}/markdown/explanation.md`,
        'text/markdown'
      );

      // Upload assistant prompts
      for (const assistant of demo.assistants) {
        const promptMarkdown = `# ${assistant.name}\n\nI am ${assistant.name}, ${assistant.description}.`;
        await uploadToS3(
          Buffer.from(promptMarkdown),
          assistant.promptMarkdownPath,
          'text/markdown'
        );
      }

      console.log(`Created markdown files for ${demo.id}`);
    } catch (error) {
      console.error(`Error processing demo ${demo.id}:`, error);
    }
  }
}

createDemoConfigs().catch(console.error); 
import { PutObjectCommand } from '@aws-sdk/client-s3';

const demos = [
  {
    id: 'communicate-instructions',
    title: 'Communicate Instructions',
    author: 'Rob Bray',
    iconPath: 'demos/communicate-instructions/icon.svg',
    assistants: [
      {
        id: 'instructor',
        name: 'Instructor',
        description: 'An AI assistant that helps communicate instructions effectively',
        iconPath: 'demos/communicate-instructions/assistants/instructor/icon.svg',
        hasPassword: false,
        isAvailableAtStart: true,
        promptMarkdownPath: 'demos/communicate-instructions/markdown/instructor.md',
        orderIndex: 0
      }
    ]
  },
  {
    id: 'guided-homeworks',
    title: 'Guided Homeworks',
    author: 'Rob Bray and Sebastien Martin',
    iconPath: 'demos/guided-homeworks/icon.svg',
    assistants: [
      {
        id: 'guide',
        name: 'Guide',
        description: 'An AI assistant that helps with homework guidance',
        iconPath: 'demos/guided-homeworks/assistants/guide/icon.svg',
        hasPassword: false,
        isAvailableAtStart: true,
        promptMarkdownPath: 'demos/guided-homeworks/markdown/guide.md',
        orderIndex: 0
      }
    ]
  },
  {
    id: 'sally',
    title: 'Sally',
    author: 'Harry',
    iconPath: 'demos/sally/icon.svg',
    assistants: [
      {
        id: 'assistant',
        name: 'Sally',
        description: 'An AI assistant named Sally',
        iconPath: 'demos/sally/assistants/assistant/icon.svg',
        hasPassword: false,
        isAvailableAtStart: true,
        promptMarkdownPath: 'demos/sally/markdown/assistant.md',
        orderIndex: 0
      }
    ]
  },
  {
    id: 'karen',
    title: 'Karen',
    author: 'Benny',
    iconPath: 'demos/karen/icon.svg',
    assistants: [
      {
        id: 'assistant',
        name: 'Karen',
        description: 'An AI assistant named Karen',
        iconPath: 'demos/karen/assistants/assistant/icon.svg',
        hasPassword: false,
        isAvailableAtStart: true,
        promptMarkdownPath: 'demos/karen/markdown/assistant.md',
        orderIndex: 0
      }
    ]
  },
  {
    id: 'robs-wonderland',
    title: "Rob's Wonderland",
    author: 'Benny',
    iconPath: 'demos/robs-wonderland/icon.svg',
    assistants: [
      {
        id: 'assistant',
        name: 'Rob',
        description: 'An AI assistant in Rob\'s Wonderland',
        iconPath: 'demos/robs-wonderland/assistants/assistant/icon.svg',
        hasPassword: false,
        isAvailableAtStart: true,
        promptMarkdownPath: 'demos/robs-wonderland/markdown/assistant.md',
        orderIndex: 0
      }
    ]
  }
];

async function createDemoConfigs() {
  for (const demo of demos) {
    try {
      // Create base config
      const config = {
        ...demo,
        hasPassword: false,
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        explanationMarkdownPath: `demos/${demo.id}/markdown/explanation.md`
      };

      // Upload config
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `demos/${demo.id}/config.json`,
        Body: JSON.stringify(config, null, 2),
        ContentType: 'application/json'
      }));

      console.log(`Created/updated config for ${demo.id}`);

      // Create default markdown files
      const defaultMarkdown = `# ${demo.title}\n\nWelcome to ${demo.title}!`;
      
      // Upload explanation markdown
      await uploadToS3(
        Buffer.from(defaultMarkdown),
        `demos/${demo.id}/markdown/explanation.md`,
        'text/markdown'
      );

      // Upload assistant prompts
      for (const assistant of demo.assistants) {
        const promptMarkdown = `# ${assistant.name}\n\nI am ${assistant.name}, ${assistant.description}.`;
        await uploadToS3(
          Buffer.from(promptMarkdown),
          assistant.promptMarkdownPath,
          'text/markdown'
        );
      }

      console.log(`Created markdown files for ${demo.id}`);
    } catch (error) {
      console.error(`Error processing demo ${demo.id}:`, error);
    }
  }
}

createDemoConfigs().catch(console.error); 