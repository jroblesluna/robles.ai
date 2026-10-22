# Camera-based counting and inspection — v2

Concept: Detect, label and count three supported object classes.

![Self-contained first frame](first-frame-v2.jpg)

Use **first-frame-v2.jpg** in Firefly → Frames → First, paste **firefly-prompt-v2.txt**, keep Last empty. Generate 16:9, 720p, eight seconds, 24 fps, Audio off. Preserve the full composition.

Every explanatory label, connector, tracking graphic and output belongs inside the video. The first frame already contains the completed concept; animation demonstrates its relationships.

## Review the actual video

- Exactly three objects, three correct labels and three closed rectangles throughout.
- Cup box and label follow the cup in every frame; no drift, trails, extra detections or count mismatch.
- Count is always 3; laptop, bottle and cup are supported COCO classes.
- Reject scrambled text, cropped graphics, detached tracking or a concept that needs a website layer to make sense.

Save the original as **objectdetection-firefly-v2-master.mp4**. Use the v2 encoder to retain all eight seconds in 16:9. Videos have not been generated or temporally validated yet. Files without v2 in this folder are superseded v1 material.
