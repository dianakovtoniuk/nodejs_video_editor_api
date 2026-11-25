import type { NextFunction, Request, Response } from "express";
import DB from "../DB";

interface LoginBody {
  username: string;
  password: string;
}

interface UpdateUserBody {
  username: string;
  name: string;
  password?: string;
}

export const logUserIn = (req: Request, res: Response, next: NextFunction) => {
  const { username, password }: LoginBody = req.body;

  // Check if the user exists
  DB.update();
  const user = DB.users.find((user) => user.username === username);

  // Check the password if the user was found
  if (user && user.password === password) {
    // At this point, we know that the client is who they say they are

    // Generate a random 10 digit token
    const token = Math.floor(Math.random() * 10000000000).toString();

    // Save the generated token
    DB.sessions.push({ userId: user.id, token: token });
    DB.save();

    res.setHeader("Set-Cookie", `token=${token}; Path=/;`);
    res.status(200).json({ message: "Logged in successfully!" });
  } else {
    return next({ status: 401, message: "Invalid username or password." });
  }
};

export const logUserOut = (req: Request, res: Response) => {
  // Remove the session object form the DB SESSIONS array
  DB.update();
  const sessionIndex = DB.sessions.findIndex(
    (session) => session.userId === req.userId
  );
  if (sessionIndex > -1) {
    DB.sessions.splice(sessionIndex, 1);
    DB.save();
  }
  res.setHeader(
    "Set-Cookie",
    `token=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
  res.status(200).json({ message: "Logged out successfully!" });
};

export const sendUserInfo = (req: Request, res: Response, next: NextFunction) => {
  DB.update();
  const user = DB.users.find((user) => user.id === req.userId);

  if (!user) {
    return next({ status: 401, message: "Unauthorized" });
  }

  res.json({ username: user.username, name: user.name });
};

export const updateUser = (req: Request, res: Response, next: NextFunction) => {
  const { username, name, password }: UpdateUserBody = req.body;

  // Grab the user object that is currently logged in
  DB.update();
  const user = DB.users.find((user) => user.id === req.userId);

  if (!user) {
    return next({ status: 401, message: "Unauthorized" });
  }

  user.username = username;
  user.name = name;

  // Only update the password if it is provided
  if (password) {
    user.password = password;
  }

  DB.save();

  res.status(200).json({
    username: user.username,
    name: user.name,
    password_status: password ? "updated" : "not updated",
  });
};
