/**
 * NIC OCR Processing Utility
 * Extracts NIC number from images using Tesseract.js
 */

import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { validateNicImage, quickValidateNicImage } from './nic-image-validation';

/**
 * Download image from URL and convert to buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Preprocess image for better OCR accuracy
 */
async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  return await sharp(imageBuffer)
    .greyscale() // Convert to grayscale
    .normalize() // Enhance contrast
    .sharpen() // Sharpen edges
    .resize(2000, null, { // Resize for better OCR (max width 2000px)
      withoutEnlargement: true,
      fit: 'inside',
    })
    .toBuffer();
}

/**
 * Extract text from image using OCR
 * Adds timeout to prevent hanging
 */
async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const worker = await createWorker('eng'); // English language
  try {
    // Add timeout wrapper (30 seconds max per image)
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('OCR processing timeout - image may be too large or complex')), 30000);
    });
    
    const ocrPromise = worker.recognize(imageBuffer).then(({ data: { text } }) => text);
    
    const text = await Promise.race([ocrPromise, timeoutPromise]);
    return text;
  } catch (error: any) {
    if (error.message?.includes('timeout')) {
      throw new Error('OCR processing took too long. Please try with smaller or clearer images.');
    }
    throw error;
  } finally {
    await worker.terminate();
  }
}

/**
 * Extract NIC number from OCR text
 * Returns 13-digit format (no dashes) as per Pakistani CNIC standard
 */
function extractNicNumber(text: string): string | null {
  // Remove all whitespace, dashes, and normalize
  const cleaned = text.replace(/[\s\-]/g, '');
  
  // Pattern 1: Look for 13 consecutive digits (standard format)
  const thirteenDigits = /[0-9]{13}/g;
  const matches = cleaned.match(thirteenDigits);
  if (matches && matches.length > 0) {
    // Take the longest match (most likely to be NIC)
    const longestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
    if (longestMatch.length === 13) {
      // Return as 13-digit number (no dashes)
      return longestMatch;
    }
  }
  
  // Pattern 2: Look for 5-7-1 digit pattern (might be separated by spaces or other chars)
  const flexiblePattern = /[0-9]{5}[^0-9]{0,3}[0-9]{7}[^0-9]{0,3}[0-9]{1}/g;
  const match2 = cleaned.match(flexiblePattern);
  if (match2 && match2[0]) {
    const digits = match2[0].replace(/[^0-9]/g, '');
    if (digits.length === 13) {
      // Return as 13-digit number (no dashes)
      return digits;
    }
  }
  
  return null;
}

/**
 * Process NIC images and extract NIC number
 */
export async function processNicImages(
  frontImageUrl: string,
  backImageUrl: string
): Promise<{
  nicNumber: string | null;
  confidence: 'high' | 'medium' | 'low';
  extractedText: {
    front: string;
    back: string;
  };
  validation: {
    front: any;
    back: any;
  };
}> {
  try {
    // Download both images
    const [frontBuffer, backBuffer] = await Promise.all([
      downloadImage(frontImageUrl),
      downloadImage(backImageUrl),
    ]);

    // Quick validation before processing (check dimensions, format)
    const [frontQuickValidation, backQuickValidation] = await Promise.all([
      quickValidateNicImage(frontBuffer),
      quickValidateNicImage(backBuffer),
    ]);

    // If basic validation fails, throw error
    if (!frontQuickValidation.valid) {
      throw new Error(`Front image validation failed: ${frontQuickValidation.error}`);
    }
    if (!backQuickValidation.valid) {
      throw new Error(`Back image validation failed: ${backQuickValidation.error}`);
    }

    // Preprocess images for better OCR
    const [preprocessedFront, preprocessedBack] = await Promise.all([
      preprocessImage(frontBuffer),
      preprocessImage(backBuffer),
    ]);

    // Run OCR on both images in parallel
    console.log('[NIC OCR] Starting OCR processing (this may take 15-30 seconds)...');
    const [frontText, backText] = await Promise.all([
      extractTextFromImage(preprocessedFront),
      extractTextFromImage(preprocessedBack),
    ]);
    console.log('[NIC OCR] OCR completed, extracting NIC number...');

    // Full validation with extracted text
    const [frontValidation, backValidation] = await Promise.all([
      validateNicImage(frontBuffer, frontText),
      validateNicImage(backBuffer, backText),
    ]);

    // Try to extract NIC number from both images
    const frontNic = extractNicNumber(frontText);
    const backNic = extractNicNumber(backText);

    // Determine confidence level
    let nicNumber: string | null = null;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    if (frontNic && backNic) {
      // Both images have NIC number
      if (frontNic === backNic) {
        // Same NIC number found in both - high confidence
        nicNumber = frontNic;
        confidence = 'high';
      } else {
        // Different NIC numbers - use front, medium confidence
        nicNumber = frontNic;
        confidence = 'medium';
      }
    } else if (frontNic) {
      // Only front has NIC number
      nicNumber = frontNic;
      confidence = 'medium';
    } else if (backNic) {
      // Only back has NIC number
      nicNumber = backNic;
      confidence = 'medium';
    } else {
      // No NIC number found in either image
      confidence = 'low';
    }

    // If validation fails, reduce confidence
    if (!frontValidation.valid || !backValidation.valid) {
      const validationErrors = [
        ...(frontValidation.valid ? [] : frontValidation.errors),
        ...(backValidation.valid ? [] : backValidation.errors),
      ];
      
      // If critical validation fails, throw error
      if (validationErrors.some(err => err.includes("doesn't appear to be a NIC card"))) {
        throw new Error(`Image validation failed: ${validationErrors.join('; ')}`);
      }
      
      // Otherwise, reduce confidence but continue
      if (confidence === 'high') {
        confidence = 'medium';
      } else if (confidence === 'medium') {
        confidence = 'low';
      }
    }

    return {
      nicNumber,
      confidence,
      extractedText: {
        front: frontText,
        back: backText,
      },
      validation: {
        front: frontValidation,
        back: backValidation,
      },
    };
  } catch (error: any) {
    console.error('NIC OCR processing error:', error);
    throw new Error(`Failed to process NIC images: ${error.message}`);
  }
}

