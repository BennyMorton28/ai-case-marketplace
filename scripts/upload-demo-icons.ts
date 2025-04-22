import { s3Client, BUCKET_NAME, uploadToS3 } from '../app/lib/s3';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const demos = [
  {
    id: 'communicate-instructions',
    title: 'Communicate Instructions',
    iconPath: 'demos/communicate-instructions/icon.svg'
  },
  {
    id: 'guided-homeworks',
    title: 'Guided Homeworks',
    iconPath: 'demos/guided-homeworks/icon.svg'
  },
  {
    id: 'sally',
    title: 'Sally',
    iconPath: 'demos/sally/icon.svg'
  },
  {
    id: 'karen',
    title: 'Karen',
    iconPath: 'demos/karen/icon.svg'
  },
  {
    id: 'robs-wonderland',
    title: "Rob's Wonderland",
    iconPath: 'demos/robs-wonderland/icon.svg'
  }
];

async function uploadDemoIcons() {
  for (const demo of demos) {
    try {
      // Get the demo's config
      const configCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `demos/${demo.id}/config.json`
      });

      const configResponse = await s3Client.send(configCommand);
      if (!configResponse.Body) continue;

      const configText = await configResponse.Body.transformToString();
      const config = JSON.parse(configText);

      // Update the icon path
      config.iconPath = demo.iconPath;

      // Upload default icon if none exists
      try {
        const defaultIconContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">${demo.title[0]}</text>
        </svg>`;

        await uploadToS3(
          Buffer.from(defaultIconContent),
          demo.iconPath,
          'image/svg+xml'
        );

        console.log(`Uploaded default icon for ${demo.id}`);
      } catch (error) {
        console.error(`Error uploading icon for ${demo.id}:`, error);
      }

      // Save updated config
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `demos/${demo.id}/config.json`,
        Body: JSON.stringify(config, null, 2),
        ContentType: 'application/json'
      }));

      console.log(`Updated config for ${demo.id}`);
    } catch (error) {
      console.error(`Error processing demo ${demo.id}:`, error);
    }
  }
}

uploadDemoIcons().catch(console.error); 
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const demos = [
  {
    id: 'communicate-instructions',
    title: 'Communicate Instructions',
    iconPath: 'demos/communicate-instructions/icon.svg'
  },
  {
    id: 'guided-homeworks',
    title: 'Guided Homeworks',
    iconPath: 'demos/guided-homeworks/icon.svg'
  },
  {
    id: 'sally',
    title: 'Sally',
    iconPath: 'demos/sally/icon.svg'
  },
  {
    id: 'karen',
    title: 'Karen',
    iconPath: 'demos/karen/icon.svg'
  },
  {
    id: 'robs-wonderland',
    title: "Rob's Wonderland",
    iconPath: 'demos/robs-wonderland/icon.svg'
  }
];

async function uploadDemoIcons() {
  for (const demo of demos) {
    try {
      // Get the demo's config
      const configCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `demos/${demo.id}/config.json`
      });

      const configResponse = await s3Client.send(configCommand);
      if (!configResponse.Body) continue;

      const configText = await configResponse.Body.transformToString();
      const config = JSON.parse(configText);

      // Update the icon path
      config.iconPath = demo.iconPath;

      // Upload default icon if none exists
      try {
        const defaultIconContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">${demo.title[0]}</text>
        </svg>`;

        await uploadToS3(
          Buffer.from(defaultIconContent),
          demo.iconPath,
          'image/svg+xml'
        );

        console.log(`Uploaded default icon for ${demo.id}`);
      } catch (error) {
        console.error(`Error uploading icon for ${demo.id}:`, error);
      }

      // Save updated config
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `demos/${demo.id}/config.json`,
        Body: JSON.stringify(config, null, 2),
        ContentType: 'application/json'
      }));

      console.log(`Updated config for ${demo.id}`);
    } catch (error) {
      console.error(`Error processing demo ${demo.id}:`, error);
    }
  }
}

uploadDemoIcons().catch(console.error); 