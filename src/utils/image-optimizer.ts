import * as ImageManipulator from 'expo-image-manipulator';

export interface OptimizedPhotoResult {
  uri: string;
  width: number;
  height: number;
}

export const optimizePhoto = async (
  uri: string,
  originalWidth?: number,
  originalHeight?: number
): Promise<OptimizedPhotoResult> => {
  try {
    // If we have original dimensions, check if it even needs resizing
    const needsResize = originalWidth ? originalWidth > 1600 : true;

    const actions = needsResize ? [{ resize: { width: 1600 } }] : [];

    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  } catch (e) {
    console.warn('[ImageOptimizer] Optimization failed, returning original:', e);
    return {
      uri,
      width: originalWidth || 1200,
      height: originalHeight || 900,
    };
  }
};
