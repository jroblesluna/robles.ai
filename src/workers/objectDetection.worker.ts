/// <reference lib="webworker" />
// COCO-SSD off the main thread. Loading the model compiles every WebGL shader synchronously
// (several seconds on slow GPUs) and each detect() takes tens of ms; here neither freezes the page.
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import type { DetectorRequest, DetectorResponse } from "@/lib/objectDetector";

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (message: DetectorResponse) => scope.postMessage(message);

const model = (async () => {
  await tf.ready();
  return cocoSsd.load({ base: "lite_mobilenet_v2" });
})();

model.then(
  () => post({ type: "ready", backend: tf.getBackend() }),
  (error) => post({ type: "error", message: String(error?.message ?? error) }),
);

scope.onmessage = async ({ data }: MessageEvent<DetectorRequest>) => {
  const { id, frame, maxBoxes, minScore } = data;
  try {
    const predictions = await (await model).detect(frame as unknown as HTMLImageElement, maxBoxes, minScore);
    post({
      type: "result",
      id,
      detections: predictions.map((p) => ({ class: p.class, score: p.score, bbox: p.bbox as [number, number, number, number] })),
    });
  } catch (error) {
    post({ type: "failed", id, message: String((error as Error)?.message ?? error) });
  } finally {
    frame.close();
  }
};
