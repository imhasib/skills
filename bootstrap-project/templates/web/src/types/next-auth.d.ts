import 'next-auth';
import 'next-auth/jwt';

interface BackendSessionUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

declare module 'next-auth' {
  interface Session {
    /** Backend-issued JWT, forwarded to backend requests as a Bearer token. */
    backendToken?: string;
    /** User profile returned by user-service at sign-in time. */
    backendUser?: BackendSessionUser;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    backendToken?: string;
    backendUser?: BackendSessionUser;
  }
}
