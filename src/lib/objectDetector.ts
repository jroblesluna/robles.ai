// Main-thread handle for src/workers/objectDetection.worker.ts: frames go in as transferable
// ImageBitmaps, boxes come back in the frame's pixel coordinates.

export type DetectedObject = { class: string; score: number; bbox: [number, number, number, number] };

export type DetectorRequest = { id: number; frame: ImageBitmap; maxBoxes: number; minScore: number };
export type DetectorResponse =
  | { type: "ready"; backend: string }
  | { type: "error"; message: string }
  | { type: "result"; id: number; detections: DetectedObject[] }
  | { type: "failed"; id: number; message: string };

export type ObjectDetector = {
  backend: string;
  /** Takes ownership of `frame` (it is transferred and closed by the worker). */
  detect(frame: ImageBitmap, maxBoxes: number, minScore: number): Promise<DetectedObject[]>;
  dispose(): void;
};

export function loadObjectDetector(): { ready: Promise<ObjectDetector>; dispose: () => void } {
  const worker = new Worker(new URL("../workers/objectDetection.worker.ts", import.meta.url), { type: "module" });
  const pending = new Map<number, { resolve: (d: DetectedObject[]) => void; reject: (e: Error) => void }>();
  let nextId = 0;
  let disposed = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    worker.terminate();
    pending.forEach(({ reject }) => reject(new Error("detector disposed")));
    pending.clear();
  };

  const ready = new Promise<ObjectDetector>((resolve, reject) => {
    worker.onerror = (event) => reject(new Error(event.message || "worker failed to start"));
    worker.onmessage = ({ data }: MessageEvent<DetectorResponse>) => {
      switch (data.type) {
        case "ready":
          resolve({
            backend: data.backend,
            detect(frame, maxBoxes, minScore) {
              if (disposed) {
                frame.close();
                return Promise.reject(new Error("detector disposed"));
              }
              const id = nextId++;
              return new Promise((res, rej) => {
                pending.set(id, { resolve: res, reject: rej });
                worker.postMessage({ id, frame, maxBoxes, minScore } satisfies DetectorRequest, [frame]);
              });
            },
            dispose,
          });
          break;
        case "error":
          reject(new Error(data.message));
          break;
        case "result":
        case "failed": {
          const call = pending.get(data.id);
          pending.delete(data.id);
          if (data.type === "result") call?.resolve(data.detections);
          else call?.reject(new Error(data.message));
        }
      }
    };
  });

  return { ready, dispose };
}
