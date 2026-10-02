import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import mongoose from 'mongoose';
import connectToDatabase from './lib/db/mongoose';
import User from './models/User';
import { verifyPassword } from './lib/auth/password';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email atau Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const identifier = (credentials?.identifier as string || '').toLowerCase().trim();
        const password = (credentials?.password as string || '');

        if (!identifier || !password) return null;

        await connectToDatabase();

        const user = await User.findOne({
          $or: [{ email: identifier }, { username: identifier }],
        });

        if (!user || !user.password) return null;

        const isValid = verifyPassword(password, user.password);
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatarUrl || '',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        await connectToDatabase();
        const existingUser = await User.findOne({ email: user.email.toLowerCase() });
        if (!existingUser) {
          await User.create({
            email: user.email.toLowerCase(),
            name: user.name || user.email.split('@')[0],
            avatarUrl: user.image || '',
          });
        }
        return true;
      } catch (error) {
        console.error('Error during signIn callback:', error);
        return false;
      }
    },
    async jwt({ token, user, trigger, session }) {
      const email = user?.email || (token.email as string);
      const id = user?.id || (token.id as string) || (token.sub as string);

      if (email || id) {
        await connectToDatabase();
        let dbUser = null;
        if (id && mongoose.Types.ObjectId.isValid(id)) {
          dbUser = await User.findById(id);
        }
        if (!dbUser && email) {
          dbUser = await User.findOne({ email: email.toLowerCase() });
        }

        if (dbUser) {
          token.sub = dbUser._id.toString();
          token.id = dbUser._id.toString();
          token.username = dbUser.username || null;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.avatarUrl = dbUser.avatarUrl || '';
        }
      }

      if (trigger === 'update' && session?.username) {
        token.username = session.username;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        (session.user as any).username = token.username || null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET || 'ticco_dev_super_secret_session_key_32bytes_long!',
});
