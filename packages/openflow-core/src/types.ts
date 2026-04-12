// === Flow Definition Types ===

export interface FlowDefinition {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: "draft" | "published" | "archived";
  settings: FlowSettings;
  steps: FlowStep[];
  edges: FlowEdge[];
  startStepId: string;
}

export interface FlowSettings {
  theme: FlowTheme;
  showProgressBar: boolean;
  progressBarStyle: "dots" | "bar" | "steps";
  submitButtonText: string;
  successMessage: string;
  successRedirectUrl?: string;
  customCSS?: string;
  customJS?: string;
  customHead?: string;
  cookieConsent?: {
    enabled: boolean;
    text?: string;
    acceptLabel?: string;
    declineLabel?: string;
  };
  header?: {
    enabled: boolean;
    logoUrl?: string;
    title?: string;
    backgroundColor?: string;
  };
  footer?: {
    enabled: boolean;
    text?: string;
    links?: Array<{ label: string; url: string }>;
    backgroundColor?: string;
  };
  tracking?: {
    ga4Id?: string;
    gtmId?: string;
    metaPixelId?: string;
  };
  og?: {
    title?: string;
    description?: string;
    imageUrl?: string;
  };
}

export interface FlowTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  cardBackgroundColor: string;
  borderRadius: string;
  fontFamily: string;
  headingFont: string;
  bodyFont: string;
  headingColor: string;
  borderColor: string;
  borderWidth: string;
  transitionStyle: "none" | "fade" | "slide";
  /** Color used for selected state of cards, image-choices, radio buttons etc. Defaults to primaryColor. */
  selectionColor?: string;
}

export interface FlowStep {
  id: string;
  flowId: string;
  type: "start" | "step" | "end";
  label: string;
  positionX: number;
  positionY: number;
  config: StepConfig;
  components: StepComponent[];
  sortOrder: number;
}

export interface StepConfig {
  title: string;
  subtitle?: string;
  description?: string;
  layout: "single-column" | "two-column";
  showProgress: boolean;
}

export interface StepComponent {
  id: string;
  stepId: string;
  componentType: string;
  fieldKey: string;
  label?: string;
  config: Record<string, unknown>;
  validation?: ValidationRule[];
  sortOrder: number;
  required: boolean;
}

export interface ValidationRule {
  type: "required" | "minLength" | "maxLength" | "min" | "max" | "pattern" | "email" | "url" | "custom";
  value?: string | number;
  message: string;
}

export interface FlowEdge {
  id: string;
  flowId: string;
  sourceStepId: string;
  targetStepId: string;
  conditionType: ConditionType;
  conditionFieldKey?: string;
  conditionValue?: string;
  label?: string;
  priority: number;
}

export type ConditionType = "always" | "equals" | "not_equals" | "contains" | "not_contains" | "gt" | "lt" | "gte" | "lte" | "regex" | "is_empty" | "is_not_empty";

// === Component Types ===

export type ComponentCategory = "input" | "choice" | "advanced" | "display" | "layout";

export interface ComponentDefinition<TConfig = Record<string, unknown>> {
  type: string;
  category: ComponentCategory;
  icon: string; // Lucide icon name
  label: string;
  description: string;
  defaultConfig: TConfig;
  configSchema: readonly ConfigSchemaField[];
  validate: (value: unknown, config: TConfig, required: boolean) => string | null;
}

export interface ConfigSchemaField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "color" | "textarea" | "json" | "image-list" | "option-list" | "file";
  accept?: string; // MIME types for file fields, e.g. ".stl,.obj"
  options?: readonly { value: string; label: string }[];
  defaultValue?: unknown;
  description?: string;
  condition?: { field: string; value: unknown }; // Show this field only when condition is met
}

// === Submission Types ===

export interface FlowSubmission {
  id: string;
  flowId: string;
  flowVersionId?: string;
  status: "in_progress" | "completed" | "abandoned";
  answers: Record<string, unknown>;
  metadata: SubmissionMetadata;
  startedAt: Date;
  completedAt?: Date;
  lastStepId?: string;
}

export interface SubmissionMetadata {
  userAgent?: string;
  referrer?: string;
  utm?: Record<string, string>;
  durationMs?: number;
  stepPath?: string[]; // IDs of steps visited in order
}

// === Card Selector Config (most common component) ===

export interface CardSelectorConfig {
  selectionMode: "single" | "multiple";
  columns: 1 | 2 | 3 | 4;
  cards: CardOption[];
  style: "bordered" | "filled" | "minimal";
}

export interface CardOption {
  key: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  icon?: string; // Lucide icon name
}

// === Pricing Card Config ===

export interface PricingCardConfig {
  columns: 1 | 2 | 3 | 4;
  cards: PricingOption[];
  style: "bordered" | "filled";
}

export interface PricingOption {
  key: string;
  label: string;
  title: string;
  size?: string;
  price: string;
  imageUrl?: string;
  features: string[];
  highlighted?: boolean;
}

// === Other Config Types ===

export interface TextInputConfig {
  placeholder?: string;
  maxLength?: number;
  inputType: "text" | "email" | "phone" | "url" | "number";
}

export interface TextAreaConfig {
  placeholder?: string;
  maxLength?: number;
  rows: number;
}

export interface FileUploadConfig {
  acceptedTypes: string[]; // MIME types
  maxFileSizeMb: number;
  maxFiles: number;
  description?: string;
}

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  unit?: string;
  showValue: boolean;
}

export interface RatingConfig {
  maxRating: number;
  icon: "star" | "heart" | "thumbsUp";
  allowHalf: boolean;
}

export interface DropdownConfig {
  placeholder?: string;
  options: { value: string; label: string }[];
  searchable: boolean;
}

export interface RadioGroupConfig {
  layout: "vertical" | "horizontal" | "grid";
  options: { value: string; label: string; description?: string }[];
}

export interface CheckboxGroupConfig {
  layout: "vertical" | "horizontal" | "grid";
  options: { value: string; label: string }[];
  minSelections?: number;
  maxSelections?: number;
}

export interface DatePickerConfig {
  minDate?: string;
  maxDate?: string;
  format: "DD.MM.YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  includeTime: boolean;
}

export interface HeadingConfig {
  level: 1 | 2 | 3 | 4;
  text: string;
  alignment: "left" | "center" | "right";
}

export interface ParagraphConfig {
  text: string;
  alignment: "left" | "center" | "right";
}

export interface ImageBlockConfig {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  alignment: "left" | "center" | "right";
}

export interface ImageChoiceConfig {
  selectionMode: "single" | "multiple";
  columns: 2 | 3 | 4;
  options: { value: string; label: string; imageUrl: string }[];
}

export interface HiddenFieldConfig {
  defaultValue: string;
  source: "static" | "url_param" | "referrer" | "user_agent";
  paramName?: string; // For url_param source
}

export interface SignaturePadConfig {
  width: number;
  height: number;
  penColor: string;
  backgroundColor: string;
}

export interface LocationPickerConfig {
  placeholder?: string;
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
}

export interface PaymentFieldConfig {
  currency: string;
  amounts?: number[]; // Predefined amounts in cents
  allowCustomAmount: boolean;
  minAmount?: number;
  maxAmount?: number;
}

export interface TwoColumnConfig {
  leftWidth: "1/3" | "1/2" | "2/3";
}

export interface AccordionGroupConfig {
  items: { title: string; defaultOpen: boolean }[];
}

export interface StepSummaryConfig {
  showFieldLabels: boolean;
  groupByStep: boolean;
  editableFromSummary: boolean;
}

export interface StlViewerConfig {
  fileUrl: string;
  backgroundColor?: string;
  modelColor?: string;
  autoRotate?: boolean;
  caption?: string;
  height?: number;
}
