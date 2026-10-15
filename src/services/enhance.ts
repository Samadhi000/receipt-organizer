import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Skia, ImageFormat } from '@shopify/react-native-skia';

// ---------------------------------------------------------------------------
// Best-effort, 100% on-device image enhancement before OCR.
//
// Two stages, each optional and each falling back to its input on failure:
//   1. UP-SCALE  — ML Kit has a minimum text size; tiny/low-res photos simply
//      aren't read. We up-scale narrow images (this also normalises a
//      content:// picker URI into a file:// path we can read as bytes).
//   2. GRAYSCALE + CONTRAST — real receipts (esp. faded thermal print) fail
//      from low contrast. We render the image through an offscreen Skia surface
//      with a colour matrix that converts to grayscale and boosts contrast,
//      pushing faint text darker and the background lighter so ML Kit reads it.
//
// We deliberately stop short of a hard binarisation threshold: a global
// threshold can erase faint text on some receipts, so grayscale + contrast is
// the safer, always-helpful choice.
// ---------------------------------------------------------------------------

const TARGET_WIDTH = 1600;

// Grayscale (luminance) + contrast (factor C, pivoting around mid-grey 0.5).
// out = C * luma + (0.5 - 0.5*C).  Offsets are in Skia's 0..1 colour space.
const C = 1.5;
const OFF = 0.5 - 0.5 * C;
const GRAY_CONTRAST = [
  0.299 * C, 0.587 * C, 0.114 * C, 0, OFF,
  0.299 * C, 0.587 * C, 0.114 * C, 0, OFF,
  0.299 * C, 0.587 * C, 0.114 * C, 0, OFF,
  0, 0, 0, 1, 0,
];

async function upscale(uri: string, width?: number): Promise<string> {
  try {
    if (width && width >= TARGET_WIDTH) return uri; // already big enough
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: TARGET_WIDTH });
    const rendered = await ctx.renderAsync();
    const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 1 });
    return out.uri;
  } catch {
    return uri;
  }
}

async function grayscaleContrast(uri: string): Promise<string | null> {
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const data = Skia.Data.fromBase64(b64);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) return null;

    const w = image.width();
    const h = image.height();
    const surface = Skia.Surface.MakeOffscreen(w, h);
    if (!surface) return null;

    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(GRAY_CONTRAST));
    surface.getCanvas().drawImage(image, 0, 0, paint);
    surface.flush();

    const snapshot = surface.makeImageSnapshot();
    const outB64 = snapshot.encodeToBase64(ImageFormat.PNG, 100);
    const path = `${FileSystem.cacheDirectory}enh_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(path, outB64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return path;
  } catch {
    return null;
  }
}

export async function enhanceForOcr(uri: string, width?: number): Promise<string> {
  const scaled = await upscale(uri, width);
  const processed = await grayscaleContrast(scaled);
  return processed ?? scaled; // graceful fallback at each stage
}
