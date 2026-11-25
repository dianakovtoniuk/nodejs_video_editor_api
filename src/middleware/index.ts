import path from "node:path";
import type { RequestHandler } from "express";
import DB from "../DB";

export const authenticate: RequestHandler = (req, res, next) => {
  const routesToAuthenticate = [
    "GET /api/user",
    "PUT /api/user",
    "DELETE /api/logout",
    "POST /api/upload-video",
    "GET /api/videos",
  ];

  if (routesToAuthenticate.includes(req.method + " " + req.url)) {
    // If we have a token cookie, then save the userId to the req object
    if (req.headers.cookie) {
      const token = req.headers.cookie.split("=")[1];

      DB.update();
      const session = DB.sessions.find((session) => session.token === token);
      if (session) {
        req.userId = session.userId;
        return next();
      }
    }

    return res.status(401).json({ error: "Unauthorized" });
  } else {
    next();
  }
};

export const serverIndex: RequestHandler = (req, res, next) => {
  const routes = ["/", "/login", "/profile"];

  if (routes.includes(req.url) && req.method === "GET") {
    return res.status(200).sendFile(path.resolve("./public/index.html"));
  } else {
    next();
  }
};
