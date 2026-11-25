// Adds the fields our middleware sets on the request object
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export {};
