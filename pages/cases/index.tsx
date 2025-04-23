import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { authOptions } from '../api/auth/[...nextauth]';
import CaseManagement from '../../components/CaseManagement';
import Layout from '../../components/Layout';

export default function CasesPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Case Management</h1>
        <CaseManagement />
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/cases',
        permanent: false,
      },
    };
  }

  return {
    props: { session },
  };
}; 