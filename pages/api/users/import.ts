import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { parse } from 'csv-parse/sync';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get the current user
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email as string },
  });

  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { csvData, caseId } = req.body;

    if (!csvData || !caseId) {
      return res.status(400).json({ error: 'CSV data and case ID are required' });
    }

    // Check if the case exists
    const caseExists = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Parse CSV data
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
    });

    if (!records.length) {
      return res.status(400).json({ error: 'No valid records found in CSV' });
    }

    // Process each record
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const record of records) {
      try {
        const email = record.email || record.Email;

        if (!email) {
          results.failed++;
          results.errors.push('Missing email in record');
          continue;
        }

        // Create or update user
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            username: record.username || record.Username || null,
          },
        });

        // Add case access if not already exists
        const existingAccess = await prisma.caseAccess.findUnique({
          where: {
            userId_caseId: {
              userId: user.id,
              caseId,
            },
          },
        });

        if (!existingAccess) {
          await prisma.caseAccess.create({
            data: {
              userId: user.id,
              caseId,
              addedBy: currentUser.email,
            },
          });
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Error processing record: ${error}`);
      }
    }

    return res.status(200).json({
      message: 'Import completed',
      results,
    });
  } catch (error) {
    console.error('Error importing users:', error);
    return res.status(500).json({ error: 'Failed to import users' });
  }
} 