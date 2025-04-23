import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { AuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";

// Extend the types for the session
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      accessToken?: string;
      refreshToken?: string;
    };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback triggered', { user, account, profile });
      
      if (!user.email) {
        console.log('No email provided');
        return false;
      }

      try {
        // Check if user exists, if not create them
        const dbUser = await prisma.user.upsert({
          where: { email: user.email },
          update: {}, // No updates needed if user exists
          create: {
            email: user.email,
            username: user.name,
            isAdmin: false, // Default to non-admin
          }
        });
        console.log('User upserted successfully:', dbUser);
        return true;
      } catch (error) {
        console.error('Error upserting user:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      console.log('JWT callback', { token, user, account });
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          userId: user.id,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : undefined,
        };
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to update it
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      console.log('Session callback', { session, token });
      if (session.user) {
        session.user.accessToken = token.accessToken as string;
        session.user.refreshToken = token.refreshToken as string;
        session.user.id = token.userId as string;
      }
      
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 