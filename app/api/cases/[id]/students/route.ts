import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { parse } from 'csv-parse/sync';
import { CaseAccess, Prisma } from '@prisma/client';

type CSVRecord = {
  email: string;
  [key: string]: string;
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is an admin or creator of the case
    const professor = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!professor) {
      return NextResponse.json({ error: 'Professor not found' }, { status: 404 });
    }

    const caseAccess = await prisma.caseAccess.findFirst({
      where: {
        case: { id: params.id },
        user: { email: session.user.email },
        role: 'PROFESSOR'
      }
    });

    if (!caseAccess) {
      return NextResponse.json({ error: 'Unauthorized - Only professors can manage students' }, { status: 403 });
    }

    // Check content type
    const contentType = req.headers.get('content-type');
    let studentEmails: string[] = [];

    if (contentType?.includes('application/json')) {
      // Handle single email from JSON
      const { email } = await req.json();
      if (!email) {
        return NextResponse.json({ error: 'No email provided' }, { status: 400 });
      }
      studentEmails = [email];
    } else if (contentType?.includes('multipart/form-data')) {
      // Handle CSV file upload
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const csvText = await file.text();
      // Parse CSV without headers, each row is just an email in the first column
      const records = parse(csvText, {
        columns: false,
        skip_empty_lines: true
      });
      
      studentEmails = records
        .map((row: string[]) => row[0]?.trim()) // Get first column value
        .filter((email): email is string => Boolean(email && email.includes('@')));
    } else {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    if (studentEmails.length === 0) {
      return NextResponse.json({ error: 'No valid email addresses provided' }, { status: 400 });
    }

    // Add students to the case
    const results = await Promise.all(
      studentEmails.map(async (email) => {
        try {
          // Create or get user
          const user = await prisma.user.upsert({
            where: { email },
            create: { email },
            update: {}
          });

          // Grant case access
          await prisma.caseAccess.upsert({
            where: {
              userId_caseId: {
                userId: user.id,
                caseId: params.id
              }
            },
            create: {
              userId: user.id,
              caseId: params.id,
              role: 'STUDENT',
              addedBy: professor.id
            },
            update: {
              role: 'STUDENT',
              addedBy: professor.id
            }
          });

          return { email, status: 'success' as const };
        } catch (error) {
          console.error(`Error adding student ${email}:`, error);
          return { email, status: 'error' as const, message: 'Failed to add student' };
        }
      })
    );

    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');

    return NextResponse.json({
      message: `Successfully added ${successful.length} students${failed.length > 0 ? `, failed to add ${failed.length} students` : ''}`,
      results
    });

  } catch (error) {
    console.error('Error in student management:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check if the user has access to this case
    const userAccess = await prisma.caseAccess.findFirst({
      where: {
        caseId: params.id,
        user: {
          email: session.user.email,
        },
      },
    });

    if (!userAccess || userAccess.role !== 'PROFESSOR') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get all students with access to this case
    const students = await prisma.caseAccess.findMany({
      where: {
        caseId: params.id,
        role: 'STUDENT',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        addedAt: 'desc',
      },
    });

    // Format the response
    const formattedStudents = students.map((access) => ({
      id: access.user.id,
      email: access.user.email,
      addedAt: access.addedAt.toISOString(),
      role: access.role,
    }));

    return NextResponse.json(formattedStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 
 