import { spawn } from "node:child_process";
import type { Dimensions } from "../src/types";

export const makeThumbnail = (
  fullPath: string,
  thumbnailPath: string
): Promise<void> => {
  // ffmpeg -i video.mp4 -ss 5 -vframes 1 thumbnail.jpg
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      fullPath,
      "-ss",
      "5",
      "-vframes",
      "1",
      thumbnailPath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
};

export const getDimensions = (fullPath: string): Promise<Dimensions> => {
  // ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 video.mp4
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0",
      fullPath,
    ]);

    let output = "";
    ffprobe.stdout.on("data", (data: Buffer) => {
      output += data.toString("utf8");
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        const [width, height] = output.replace(/\s/g, "").split(",");
        resolve({
          width: Number(width),
          height: Number(height),
        });
      } else {
        reject(new Error(`FFprobe exited with code ${code}`));
      }
    });

    ffprobe.on("error", (err) => {
      reject(err);
    });
  });
};
