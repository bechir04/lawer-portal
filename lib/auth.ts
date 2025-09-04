import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions, User, Account, Profile } from "next-auth"
import { JWT } from "next-auth/jwt"
import GoogleProvider, { GoogleProfile } from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

type UserRole = 'CLIENT' | 'LAWYER' | 'ADMIN'

declare module 'next-auth' {
  interface Session {
    user: {
      lawyerId: any
      id: string
      name?: string | null
      email: string
      image?: string | null
      role: UserRole
    },
    callbackUrl?: string
  }

  interface User {
    id: string
    name?: string | null
    email: string
    image?: string | null
    role: UserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    email?: string
    name?: string | null
    picture?: string | null
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      profile(profile: GoogleProfile) {
        // Ensure required fields are present and properly typed
        if (!profile.sub || !profile.email) {
          throw new Error('Google profile is missing required fields')
        }
        
        return {
          id: profile.sub,
          name: profile.name || '',
          email: profile.email,
          image: profile.picture || null,
          role: 'CLIENT' as UserRole
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user?.password) {
          throw new Error('Invalid credentials')
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isCorrectPassword) {
          throw new Error('Invalid credentials')
        }

        return user
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: any, account: any, profile?: any }) {
      try {
        // Handle Google OAuth sign-in
        if (account?.provider === 'google' && user.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          // If user doesn't exist, create a new user with client role
          if (!existingUser) {
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || '',
                image: user.image || null,
                role: 'CLIENT',
                emailVerified: new Date(),
              },
            });
            // Store role in account for JWT callback to avoid extra DB query
            (account as any).userRole = newUser.role;
          } else {
            // Update existing user's profile if needed
            if (existingUser.image !== user.image || existingUser.name !== user.name) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  name: user.name,
                  image: user.image,
                },
              });
            }
            // Store role in account for JWT callback to avoid extra DB query
            (account as any).userRole = existingUser.role;
          }
        } else {
          // For credentials login, get user role once
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true }
          });
          
          if (account) {
            (account as any).userRole = dbUser?.role;
          }
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    
    async session({ session, token }) {
      if (session.user) {
        // Ensure all required fields are set with proper types
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) || 'CLIENT';
        session.user.email = token.email as string || '';
        session.user.name = token.name as string || null;
        session.user.image = token.picture as string || null;
        
        // Set the callback URL based on user role
        const role = session.user.role;
        session.callbackUrl = (role === 'LAWYER' || role === 'ADMIN') ? '/dashboard' : '/client';
      }
      return session;
    },
    
    async jwt({ token, user, account, profile }) {
      // Initial sign in - use cached role from signIn callback to avoid DB query
      if (account && user) {
        // Use role from signIn callback if available, otherwise query DB
        const role = (account as any).userRole || 'CLIENT';
        const callbackUrl = role === 'LAWYER' || role === 'ADMIN' ? '/dashboard' : '/client';
        
        return {
          ...token,
          id: user.id,
          role: role,
          email: user.email,
          name: user.name,
          picture: user.image,
          callbackUrl: callbackUrl,
          lastUpdated: Date.now() // Track when we last fetched from DB
        };
      }
      
      // Only refresh user data every 5 minutes instead of every request
      const shouldRefresh = !token.lastUpdated || (Date.now() - (token.lastUpdated as number)) > 5 * 60 * 1000;
      
      if (token.id && shouldRefresh) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { role: true }
          });
          
          if (dbUser) {
            token.role = dbUser.role;
            token.callbackUrl = dbUser.role === 'CLIENT' ? '/client' : '/dashboard';
            token.lastUpdated = Date.now();
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
          // Continue with existing token data if DB query fails
        }
      }
      
      return token;
    },
    
    async redirect({ url, baseUrl }: { url: string, baseUrl: string }) {
      // Allow redirects to continue if they're already set
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      
      // After sign in, redirect to dashboard if coming from sign-in
      // The actual role-based redirect is handled in the sign-in callback
      
      // Default to client dashboard
      return `${baseUrl}/client`;
    }
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
}
