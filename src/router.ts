import type { Express } from "express";
import * as User from "./controllers/user";

export default (server: Express): void => {
  // ------------------------------------------------ //
  // ************ USER ROUTES ************* //
  // ------------------------------------------------ //

  // Log a user in and give them a token
  server.post("/api/login", User.logUserIn);

  // Log a user out
  server.delete("/api/logout", User.logUserOut);

  // Send user info
  server.get("/api/user", User.sendUserInfo);

  // Update a user info
  server.put("/api/user", User.updateUser);
};
