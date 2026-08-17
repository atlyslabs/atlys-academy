import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ALLOWED_EMAIL_DOMAIN, isAllowedEmail } from "@/lib/auth/config";
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          hd: ALLOWED_EMAIL_DOMAIN,
          prompt: "select_account",
        },
      },
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/signin",
    error: "/signin",
  },

  callbacks: {
    signIn({ profile }) {
      return isAllowedEmail(profile?.email, profile?.email_verified);
    },
    jwt({ token, profile }) {
      if (profile?.sub) token.sub = profile.sub;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
