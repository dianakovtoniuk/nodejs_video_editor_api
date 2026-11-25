import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
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

// Extract the audio for a video file (can only be done once per video)
export const extractAudio = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const videoId = req.query.videoId;

  if (typeof videoId !== "string") {
    return next({ status: 400, message: "Please specify a videoId." });
  }

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  if (!video) {
    return next({ status: 404, message: "Video not found!" });
  }

  if (video.extractedAudio) {
    return next({
      status: 400,
      message: "The audio has already been extracted for this video.",
    });
  }

  const originalVideoPath = `./storage/${videoId}/original.${video.extension}`;
  const targetAudioPath = `./storage/${videoId}/audio.aac`;

  try {
    await FF.extractAudio(originalVideoPath, targetAudioPath);

    video.extractedAudio = true;
    DB.save();

    res.status(200).json({
      status: "success",
      message: "The audio was extracted successfully!",
    });
  } catch (e) {
    util.deleteFile(targetAudioPath);
    return next(e);
  }
};

// Return a video asset to the client
export const getVideoAsset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const videoId = req.query.videoId;
  const type = req.query.type; // thumbnail, original, audio, resize

  if (typeof videoId !== "string" || typeof type !== "string") {
    return next({
      status: 400,
      message: "Please specify both videoId and type.",
    });
  }

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  if (!video) {
    return next({
      status: 404,
      message: "Video not found!",
    });
  }

  let file: FileHandle;
  let mimeType: string;
  let filename: string | undefined; // the final file name for the download (including the extension)

  switch (type) {
    case "thumbnail":
      file = await fs.open(path.resolve("./storage", videoId, "thumbnail.jpg"), "r");
      mimeType = "image/jpeg";
      break;
    case "audio":
      file = await fs.open(path.resolve("./storage", videoId, "audio.aac"), "r");
      mimeType = "audio/aac";
      filename = `${video.name}-audio.aac`;
      break;
    case "original":
      file = await fs.open(
        path.resolve("./storage", videoId, `original.${video.extension}`),
        "r"
      );
      mimeType = "video/mp4"; // Not a good practice! Videos are not always MP4
      filename = `${video.name}.${video.extension}`;
      break;
    default:
      return next({ status: 400, message: "Unknown asset type." });
  }

  try {
    // Grab the file size
    const stat = await file.stat();

    const fileStream = file.createReadStream();

    if (type !== "thumbnail") {
      // Set a header to prompt for download
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    }

    // Set the Content-Type header based on the file type
    res.setHeader("Content-Type", mimeType);
    // Set the Content-Length to the size of the file
    res.setHeader("Content-Length", stat.size);

    res.status(200);

    await pipeline(fileStream, res);
    file.close();
  } catch (e) {
    console.log(e);
  }
};
