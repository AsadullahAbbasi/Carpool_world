/**
 * NIC Image Validation Utility
 * Validates that uploaded images are actually valid NIC card images
 */

import sharp from 'sharp';

export interface ImageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    hasText: boolean;
    textQuality: 'high' | 'medium' | 'low';
  };
}

/**
 * NIC-related keywords that should appear in a valid NIC image
 */
const NIC_KEYWORDS = [
  'pakistan',
  'identity',
  'card',
  'cnic',
  'nic',
  'national',
  'republic',
  'islamic',
  'pak',
  'nadra',
  'name',
  'father',
  'date',
  'birth',
  'address',
  'expiry',
  'valid',
  'till',
  'signature',
  'photo',
];

/**
 * Validate image dimensions - NIC cards should be document-sized
 */
function validateDimensions(width: number, height: number): { valid: boolean; error?: string } {
  // NIC cards are typically around 85.6mm x 53.98mm (credit card size)
  // In pixels at 300 DPI: ~1010 x 640 pixels
  // We'll accept a reasonable range
  
  const minWidth = 400;  // Minimum width for readable text
  const minHeight = 250; // Minimum height for readable text
  const maxWidth = 5000; // Maximum reasonable size
  const maxHeight = 5000;

  if (width < minWidth || height < minHeight) {
    return {
      valid: false,
      error: `Image is too small (${width}x${height}px). Minimum size: ${minWidth}x${minHeight}px. Please upload a higher resolution image.`,
    };
  }

  if (width > maxWidth || height > maxHeight) {
    return {
      valid: false,
      error: `Image is too large (${width}x${height}px). Maximum size: ${maxWidth}x${maxHeight}px.`,
    };
  }

  // Check aspect ratio - NIC cards are roughly rectangular (not square)
  const aspectRatio = width / height;
  if (aspectRatio < 1.2 || aspectRatio > 2.5) {
    return {
      valid: false,
      error: `Image aspect ratio (${aspectRatio.toFixed(2)}) doesn't match NIC card format. NIC cards are rectangular documents.`,
    };
  }

  return { valid: true };
}

/**
 * Check if extracted text contains NIC-related keywords
 */
function validateTextContent(extractedText: string): { valid: boolean; score: number; missingKeywords: string[] } {
  const lowerText = extractedText.toLowerCase();
  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];

  // Check for NIC-related keywords
  for (const keyword of NIC_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      foundKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }

  // Calculate score (percentage of keywords found)
  const score = (foundKeywords.length / NIC_KEYWORDS.length) * 100;

  // Consider valid if at least 20% of keywords are found
  // This accounts for OCR errors and different NIC formats
  const valid = score >= 20;

  return {
    valid,
    score,
    missingKeywords: missingKeywords.slice(0, 5), // Return first 5 missing for feedback
  };
}

/**
 * Assess image quality based on metadata and characteristics
 */
function assessImageQuality(metadata: sharp.Metadata, hasText: boolean): {
  quality: 'high' | 'medium' | 'low';
  warnings: string[];
} {
  const warnings: string[] = [];
  let qualityScore = 0;

  // Check resolution
  if (metadata.width && metadata.height) {
    const totalPixels = metadata.width * metadata.height;
    if (totalPixels < 200000) { // Less than ~450x450
      warnings.push('Image resolution is low. Higher resolution images improve verification accuracy.');
      qualityScore -= 2;
    } else if (totalPixels > 1000000) { // More than ~1000x1000
      qualityScore += 1;
    } else {
      qualityScore += 2;
    }
  }

  // Check if text was found
  if (hasText) {
    qualityScore += 2;
  } else {
    warnings.push('No readable text detected. Ensure the image is clear and well-lit.');
    qualityScore -= 3;
  }

  // Determine quality level
  let quality: 'high' | 'medium' | 'low';
  if (qualityScore >= 3) {
    quality = 'high';
  } else if (qualityScore >= 0) {
    quality = 'medium';
  } else {
    quality = 'low';
  }

  return { quality, warnings };
}

/**
 * Validate that an image is a valid NIC card image
 */
export async function validateNicImage(
  imageBuffer: Buffer,
  extractedText?: string
): Promise<ImageValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        valid: false,
        errors: ['Could not read image dimensions. Please upload a valid image file.'],
        warnings: [],
        metadata: {
          width: 0,
          height: 0,
          format: metadata.format || 'unknown',
          size: imageBuffer.length,
          hasText: false,
          textQuality: 'low',
        },
      };
    }

    // Validate dimensions
    const dimensionCheck = validateDimensions(metadata.width, metadata.height);
    if (!dimensionCheck.valid) {
      errors.push(dimensionCheck.error!);
    }

    // Validate text content if provided
    let textQuality: 'high' | 'medium' | 'low' = 'low';
    let hasText = false;
    
    if (extractedText) {
      hasText = extractedText.trim().length > 0;
      if (hasText) {
        const textValidation = validateTextContent(extractedText);
        if (!textValidation.valid) {
          errors.push(
            `Image doesn't appear to be a NIC card. Missing expected keywords. ` +
            `Found ${(100 - textValidation.score).toFixed(0)}% of expected NIC-related text.`
          );
        } else {
          // Determine text quality based on keyword match score
          if (textValidation.score >= 60) {
            textQuality = 'high';
          } else if (textValidation.score >= 30) {
            textQuality = 'medium';
          } else {
            textQuality = 'low';
            warnings.push('Some expected NIC-related text is missing. Please ensure the image shows the full NIC card.');
          }
        }
      } else {
        errors.push('No text could be extracted from the image. Please ensure the image is clear and shows a readable NIC card.');
      }
    } else {
      warnings.push('Text extraction not performed. Image will be validated during OCR processing.');
    }

    // Assess overall image quality
    const qualityAssessment = assessImageQuality(metadata, hasText);
    warnings.push(...qualityAssessment.warnings);

    // Check file format
    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
    if (metadata.format && !allowedFormats.includes(metadata.format)) {
      errors.push(`Unsupported image format: ${metadata.format}. Please use JPEG, PNG, or WebP.`);
    }

    // Final validation
    const valid = errors.length === 0;

    return {
      valid,
      errors,
      warnings,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || 'unknown',
        size: imageBuffer.length,
        hasText,
        textQuality,
      },
    };
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Failed to validate image: ${error.message}`],
      warnings: [],
      metadata: {
        width: 0,
        height: 0,
        format: 'unknown',
        size: imageBuffer.length,
        hasText: false,
        textQuality: 'low',
      },
    };
  }
}

/**
 * Quick validation before OCR (faster, less thorough)
 */
export async function quickValidateNicImage(imageBuffer: Buffer): Promise<{
  valid: boolean;
  error?: string;
  metadata: { width: number; height: number; format: string };
}> {
  try {
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        valid: false,
        error: 'Could not read image dimensions',
        metadata: { width: 0, height: 0, format: 'unknown' },
      };
    }

    const dimensionCheck = validateDimensions(metadata.width, metadata.height);
    if (!dimensionCheck.valid) {
      return {
        valid: false,
        error: dimensionCheck.error,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format || 'unknown',
        },
      };
    }

    return {
      valid: true,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || 'unknown',
      },
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message,
      metadata: { width: 0, height: 0, format: 'unknown' },
    };
  }
}





