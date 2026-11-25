import cluster from "node:cluster";
import os from "node:os";
import JobQueue from "../lib/JobQueue";

interface WorkerMessage {
  messageType: string;
  data: { videoId: string; height: number; width: number };
}

if (cluster.isPrimary) {
  const jobs = new JobQueue();

  const coreCount = os.availableParallelism();
  for (let i = 0; i < coreCount; i++) {
    cluster.fork();
  }

  cluster.on("message", (worker, message: WorkerMessage) => {
    if (message.messageType === "new-resize") {
      const { videoId, height, width } = message.data;
      jobs.enqueue({
        type: "resize",
        videoId,
        width,
        height,
      });
    }
  });

  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `Worker ${worker.process.pid} died (${signal} | ${code}). Restarting...`
    );
    cluster.fork();
  });
} else {
  require("./index");
}
