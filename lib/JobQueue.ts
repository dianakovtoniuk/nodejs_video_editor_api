import DB from "../src/DB";
import * as FF from "./FF";
import * as util from "./util";

interface ResizeJob {
  type: "resize";
  videoId: string;
  width: number;
  height: number;
}

type Job = ResizeJob;

export default class JobQueue {
  private jobs: Job[] = [];
  private currentJob: Job | null = null;

  constructor() {
    // Loop through the videos and find all the processing true items, and
    // add them to the queue (enqueue)
    DB.update();
    DB.videos.forEach((video) => {
      Object.keys(video.resizes).forEach((key) => {
        if (video.resizes[key].processing) {
          const [width, height] = key.split("x");
          this.enqueue({
            type: "resize",
            videoId: video.videoId,
            width: Number(width),
            height: Number(height),
          });
        }
      });
    });
  }

  enqueue(job: Job): void {
    this.jobs.push(job);
    this.executeNext();
  }

  dequeue(): Job | undefined {
    return this.jobs.shift();
  }

  executeNext(): void {
    if (this.currentJob) return;
    this.currentJob = this.dequeue() ?? null;
    if (!this.currentJob) return;
    this.execute(this.currentJob);
  }

  async execute(job: Job): Promise<void> {
    if (job.type === "resize") {
      const { videoId, width, height } = job;

      DB.update();
      const video = DB.videos.find((video) => video.videoId === videoId);

      if (video) {
        const originalVideoPath = `./storage/${video.videoId}/original.${video.extension}`;
        const targetVideoPath = `./storage/${video.videoId}/${width}x${height}.${video.extension}`;

        try {
          await FF.resize(originalVideoPath, targetVideoPath, width, height);

          DB.update();
          const updatedVideo = DB.videos.find(
            (video) => video.videoId === videoId
          );
          if (updatedVideo) {
            updatedVideo.resizes[`${width}x${height}`].processing = false;
            DB.save();
          }

          console.log(
            "Done resizing! Number of jobs remaining:",
            this.jobs.length
          );
        } catch (e) {
          util.deleteFile(targetVideoPath);
        }
      }
    }

    this.currentJob = null;
    this.executeNext();
  }
}
