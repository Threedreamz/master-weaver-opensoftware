// ── Shared ──────────────────────────────────────────────────────────────────

export interface GoogleCloudVisionClientConfig {
  accessToken: string;
  projectId?: string;
  timeout?: number;
  retries?: number;
}

// ── Image Input ────────────────────────────────────────────────────────────

export interface VisionImage {
  /** Base64-encoded image content. */
  content?: string;
  /** Google Cloud Storage image URI. */
  source?: {
    imageUri?: string;
    gcsImageUri?: string;
  };
}

// ── Feature Types ──────────────────────────────────────────────────────────

export type VisionFeatureType =
  | "TEXT_DETECTION"
  | "DOCUMENT_TEXT_DETECTION"
  | "LABEL_DETECTION"
  | "FACE_DETECTION"
  | "LANDMARK_DETECTION"
  | "LOGO_DETECTION"
  | "SAFE_SEARCH_DETECTION"
  | "IMAGE_PROPERTIES"
  | "OBJECT_LOCALIZATION"
  | "WEB_DETECTION"
  | "PRODUCT_SEARCH"
  | "CROP_HINTS";

export interface VisionFeature {
  type: VisionFeatureType;
  maxResults?: number;
  model?: string;
}

// ── Annotation Request ─────────────────────────────────────────────────────

export interface VisionAnnotateRequest {
  image: VisionImage;
  features: VisionFeature[];
  imageContext?: {
    languageHints?: string[];
    cropHintsParams?: { aspectRatios: number[] };
    textDetectionParams?: { enableTextDetectionConfidenceScore: boolean };
  };
}

export interface VisionBatchAnnotateRequest {
  requests: VisionAnnotateRequest[];
}

// ── Text Detection ─────────────────────────────────────────────────────────

export interface VisionVertex {
  x: number;
  y: number;
}

export interface VisionBoundingPoly {
  vertices: VisionVertex[];
  normalizedVertices?: VisionVertex[];
}

export interface VisionEntityAnnotation {
  mid: string;
  locale: string;
  description: string;
  score: number;
  confidence: number;
  topicality: number;
  boundingPoly: VisionBoundingPoly;
  locations: Array<{ latLng: { latitude: number; longitude: number } }>;
  properties: Array<{ name: string; value: string; uint64Value: string }>;
}

export interface VisionTextAnnotation {
  pages: VisionPage[];
  text: string;
}

export interface VisionPage {
  property: VisionTextProperty | null;
  width: number;
  height: number;
  blocks: VisionBlock[];
  confidence: number;
}

export interface VisionBlock {
  property: VisionTextProperty | null;
  boundingBox: VisionBoundingPoly;
  paragraphs: VisionParagraph[];
  blockType: string;
  confidence: number;
}

export interface VisionParagraph {
  property: VisionTextProperty | null;
  boundingBox: VisionBoundingPoly;
  words: VisionWord[];
  confidence: number;
}

export interface VisionWord {
  property: VisionTextProperty | null;
  boundingBox: VisionBoundingPoly;
  symbols: VisionSymbol[];
  confidence: number;
}

export interface VisionSymbol {
  property: VisionTextProperty | null;
  boundingBox: VisionBoundingPoly;
  text: string;
  confidence: number;
}

export interface VisionTextProperty {
  detectedLanguages: Array<{
    languageCode: string;
    confidence: number;
  }>;
  detectedBreak: {
    type: string;
    isPrefix: boolean;
  } | null;
}

// ── Label Detection ────────────────────────────────────────────────────────

export interface VisionLabel {
  mid: string;
  description: string;
  score: number;
  topicality: number;
}

// ── Safe Search ────────────────────────────────────────────────────────────

export type VisionLikelihood =
  | "UNKNOWN"
  | "VERY_UNLIKELY"
  | "UNLIKELY"
  | "POSSIBLE"
  | "LIKELY"
  | "VERY_LIKELY";

export interface VisionSafeSearchAnnotation {
  adult: VisionLikelihood;
  spoof: VisionLikelihood;
  medical: VisionLikelihood;
  violence: VisionLikelihood;
  racy: VisionLikelihood;
}

// ── Object Localization ────────────────────────────────────────────────────

export interface VisionLocalizedObject {
  mid: string;
  name: string;
  score: number;
  boundingPoly: VisionBoundingPoly;
}

// ── Web Detection ──────────────────────────────────────────────────────────

export interface VisionWebDetection {
  webEntities: Array<{
    entityId: string;
    score: number;
    description: string;
  }>;
  fullMatchingImages: Array<{ url: string; score: number }>;
  partialMatchingImages: Array<{ url: string; score: number }>;
  pagesWithMatchingImages: Array<{
    url: string;
    pageTitle: string;
    fullMatchingImages: Array<{ url: string }>;
    partialMatchingImages: Array<{ url: string }>;
  }>;
  visuallySimilarImages: Array<{ url: string; score: number }>;
  bestGuessLabels: Array<{ label: string; languageCode: string }>;
}

// ── Annotation Response ────────────────────────────────────────────────────

export interface VisionAnnotateResponse {
  textAnnotations?: VisionEntityAnnotation[];
  fullTextAnnotation?: VisionTextAnnotation;
  labelAnnotations?: VisionLabel[];
  safeSearchAnnotation?: VisionSafeSearchAnnotation;
  localizedObjectAnnotations?: VisionLocalizedObject[];
  webDetection?: VisionWebDetection;
  faceAnnotations?: VisionEntityAnnotation[];
  landmarkAnnotations?: VisionEntityAnnotation[];
  logoAnnotations?: VisionEntityAnnotation[];
  error?: {
    code: number;
    message: string;
    details: unknown[];
  };
}

export interface VisionBatchAnnotateResponse {
  responses: VisionAnnotateResponse[];
}
