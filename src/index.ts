import path from "node:path";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { authenticate, serverIndex } from "./middleware";
import apiRouter from "./router";
import type { HttpError } from "./types";

const PORT = 8060;

const server = express();

// ------ Middlewares ------ //

// For serving static files
server.use(express.static(path.resolve("./public")));

// For parsing JSON body
server.use(express.json());

// For authentication
server.use(authenticate);

// For different routes that need the index.html file
server.use(serverIndex);

// ------ API Routes ------ //
apiRouter(server);

const isHttpError = (error: unknown): error is HttpError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "message" in error
  );
};

// Handle all the errors that could happen in the routes
server.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  if (isHttpError(error)) {
    res.status(error.status).json({ error: error.message });
  } else {
    console.error(error);
    res.status(500).json({
      error: "Sorry, something unexpected happened from our side.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server has started on port ${PORT}`);
});
