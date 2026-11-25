export interface User {
  id: number;
  name: string;
  username: string;
  password: string;
}

export interface Session {
  userId: number;
  token: string;
}

export interface Resize {
  processing: boolean;
}

export interface Video {
  id: number;
  videoId: string;
  name: string;
  extension: string;
  userId: number;
  extractedAudio: boolean;
  resizes: Record<string, Resize>;
}

export interface HttpError {
  status: number;
  message: string;
}
