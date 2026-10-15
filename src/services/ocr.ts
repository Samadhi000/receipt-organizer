import TextRecognition from '@react-native-ml-kit/text-recognition';

// One recognized line of text WITH its position on the image.
// The position (top/left) is what lets the parser rebuild visual rows,
// because ML Kit returns receipt columns (names vs prices) separately.
export interface OcrLine {
  text: string;
  top: number;    // y of the line's bounding box
  left: number;   // x of the line's bounding box
  width: number;
  height: number;
}

export interface OcrResult {
  text: string;      // full flat text (handy for debugging)
  lines: OcrLine[];  // structured lines with positions
}

// Runs Google ML Kit on-device text recognition against a local image uri.
// Fully offline — the recognition model ships inside the app.
export async function recognizeReceipt(imageUri: string): Promise<OcrResult> {
  const result = await TextRecognition.recognize(imageUri);
  const text = result?.text ?? '';

  const lines: OcrLine[] = [];
  for (const block of result?.blocks ?? []) {
    for (const line of block?.lines ?? []) {
      if (!line?.text) continue;
      const f = line.frame;
      lines.push({
        text: line.text,
        top: f?.top ?? 0,
        left: f?.left ?? 0,
        width: f?.width ?? 0,
        height: f?.height ?? 0,
      });
    }
  }

  return { text, lines };
}
