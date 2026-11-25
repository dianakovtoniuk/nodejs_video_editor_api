import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import type { NextFunction, Request, Response } from "express";
import * as util from "../../lib/util";
import * as FF from "../../lib/FF";
import DB from "../DB";

// Return the list of all the videos that a logged in user has uploaded
export const getVideos = (req: Request, res: Response) => {
  DB.update();
  const videos = DB.videos.filter((video) => {
    return video.userId === req.userId;
  });

  res.status(200).json(videos);
};

// Upload a video file
export const uploadVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const specifiedFileName = req.headers.filename;

  if (typeof specifiedFileName !== "string") {
    return next({
      status: 400,
      message: "Please specify the file name in the filename header.",
    });
  }

  const extension = path.extname(specifiedFileName).substring(1).toLowerCase();
  const name = path.parse(specifiedFileName).name;
  const videoId = crypto.randomBytes(4).toString("hex");

  const FORMATS_SUPPORTED = ["mov", "mp4"];

  if (!FORMATS_SUPPORTED.includes(extension)) {
    return next({
      status: 400,
      message: "Only these formats are allowed: mov, mp4",
    });
  }

  try {
    await fs.mkdir(`./storage/${videoId}`);
    const fullPath = `./storage/${videoId}/original.${extension}`; // the original video path
    const file = await fs.open(fullPath, "w");
    const fileStream = file.createWriteStream();
    const thumbnailPath = `./storage/${videoId}/thumbnail.jpg`;

    await pipeline(req, fileStream);

    // Make a thumbnail for the video file
    await FF.makeThumbnail(fullPath, thumbnailPath);

    // Get the dimensions
    const dimensions = await FF.getDimensions(fullPath);

    DB.update();
    DB.videos.unshift({
      id: DB.videos.length,
      videoId,
      name,
      extension,
      dimensions,
      userId: req.userId!, // set by the authentication middleware
      extractedAudio: false,
      resizes: {},
    });
    DB.save();

    res.status(201).json({
      status: "success",
      message: "The file was uploaded successfully!",
    });
  } catch (e) {
    // Delete the folder
    util.deleteFolder(`./storage/${videoId}`);
    if ((e as NodeJS.ErrnoException).code !== "ECONNRESET") return next(e);
  }
};
