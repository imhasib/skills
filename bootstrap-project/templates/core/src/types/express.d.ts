// Augments the Express Request with fields populated by our middleware chain.
// Keep in sync with the middleware files that set each field.

declare global {
  namespace Express {
    interface Request {
      /** Set by request-id middleware. Echoed in logs and error responses. */
      requestId: string;
      /** API version string. Set by api-version middleware. */
      apiVersion: string;
      /**
       * Authenticated user, set by jwt-verify middleware via requireAuth.
       * `userId` comes from the JWT `userId` claim issued by user-service.
       */
      user?: {
        userId: string;
        role: string;
        email?: string;
        name?: string;
      };
    }
  }
}

export {};
