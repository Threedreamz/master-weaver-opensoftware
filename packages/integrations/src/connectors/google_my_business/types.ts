// ==================== Google My Business (Business Profile) API Types ====================
// OAuth2 authentication via Google Identity Platform

/** Configuration for Google My Business client */
export interface GoogleMyBusinessClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Accounts & Locations ====================

/** Google Business account */
export interface BusinessAccount {
  name: string;
  accountName: string;
  type: "PERSONAL" | "LOCATION_GROUP" | "USER_GROUP" | "ORGANIZATION";
  role: "PRIMARY_OWNER" | "OWNER" | "MANAGER" | "SITE_MANAGER";
  state: { status: "VERIFIED" | "UNVERIFIED" | "VERIFICATION_REQUESTED" };
  accountNumber?: string;
}

/** Business location */
export interface BusinessLocation {
  name: string;
  title: string;
  storeCode?: string;
  languageCode?: string;
  storefrontAddress?: PostalAddress;
  websiteUri?: string;
  phoneNumbers?: PhoneNumbers;
  categories?: Categories;
  regularHours?: BusinessHours;
  specialHours?: SpecialHours;
  latlng?: LatLng;
  metadata?: LocationMetadata;
  openInfo?: OpenInfo;
  profile?: BusinessProfile;
}

/** Postal address */
export interface PostalAddress {
  regionCode: string;
  languageCode?: string;
  postalCode?: string;
  administrativeArea?: string;
  locality?: string;
  addressLines: string[];
}

/** Phone numbers */
export interface PhoneNumbers {
  primaryPhone?: string;
  additionalPhones?: string[];
}

/** Business categories */
export interface Categories {
  primaryCategory?: Category;
  additionalCategories?: Category[];
}

/** Single category */
export interface Category {
  name: string;
  displayName: string;
}

/** Regular business hours */
export interface BusinessHours {
  periods: TimePeriod[];
}

/** Time period for business hours */
export interface TimePeriod {
  openDay: DayOfWeek;
  openTime: TimeOfDay;
  closeDay: DayOfWeek;
  closeTime: TimeOfDay;
}

export type DayOfWeek =
  | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY"
  | "FRIDAY" | "SATURDAY" | "SUNDAY";

/** Time of day in 24h format */
export interface TimeOfDay {
  hours: number;
  minutes: number;
}

/** Special hours (holidays, etc.) */
export interface SpecialHours {
  specialHourPeriods: SpecialHourPeriod[];
}

export interface SpecialHourPeriod {
  startDate: DateValue;
  openTime?: TimeOfDay;
  endDate?: DateValue;
  closeTime?: TimeOfDay;
  isClosed?: boolean;
}

export interface DateValue {
  year: number;
  month: number;
  day: number;
}

/** Geographic coordinates */
export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Location metadata (read-only) */
export interface LocationMetadata {
  mapsUri?: string;
  newReviewUri?: string;
  placeId?: string;
}

/** Whether the location is open */
export interface OpenInfo {
  status: "OPEN" | "CLOSED_PERMANENTLY" | "CLOSED_TEMPORARILY";
  canReopen?: boolean;
  openingDate?: DateValue;
}

/** Business profile data */
export interface BusinessProfile {
  description?: string;
}

// ==================== Reviews ====================

/** A customer review */
export interface Review {
  name: string;
  reviewId: string;
  reviewer: Reviewer;
  starRating: StarRating;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: ReviewReply;
}

export interface Reviewer {
  displayName: string;
  profilePhotoUrl?: string;
  isAnonymous?: boolean;
}

export type StarRating = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";

export interface ReviewReply {
  comment: string;
  updateTime: string;
}

/** Parameters for listing reviews */
export interface ListReviewsParams {
  /** Location resource name */
  locationName: string;
  /** Page size (max 50) */
  pageSize?: number;
  /** Page token for pagination */
  pageToken?: string;
  /** Sort order */
  orderBy?: "updateTime desc" | "rating desc" | "rating asc";
}

/** Paginated reviews response */
export interface ListReviewsResponse {
  reviews: Review[];
  averageRating: number;
  totalReviewCount: number;
  nextPageToken?: string;
}

// ==================== Posts ====================

/** A Google Business post */
export interface LocalPost {
  name: string;
  languageCode?: string;
  summary: string;
  topicType: PostTopicType;
  callToAction?: CallToAction;
  media?: MediaItem[];
  state: "LIVE" | "REJECTED" | "PROCESSING";
  createTime: string;
  updateTime: string;
  event?: PostEvent;
  offer?: PostOffer;
  searchUrl?: string;
}

export type PostTopicType = "STANDARD" | "EVENT" | "OFFER" | "PRODUCT";

export interface CallToAction {
  actionType: CTA_ActionType;
  url: string;
}

export type CTA_ActionType =
  | "BOOK"
  | "ORDER"
  | "SHOP"
  | "LEARN_MORE"
  | "SIGN_UP"
  | "CALL";

export interface MediaItem {
  mediaFormat: "PHOTO" | "VIDEO";
  sourceUrl: string;
}

export interface PostEvent {
  title: string;
  schedule: {
    startDate: DateValue;
    startTime?: TimeOfDay;
    endDate: DateValue;
    endTime?: TimeOfDay;
  };
}

export interface PostOffer {
  couponCode?: string;
  redeemOnlineUrl?: string;
  termsConditions?: string;
}

/** Parameters for creating a post */
export interface CreatePostParams {
  /** Location resource name */
  locationName: string;
  /** Post content */
  post: Omit<LocalPost, "name" | "state" | "createTime" | "updateTime" | "searchUrl">;
}

/** Parameters for listing posts */
export interface ListPostsParams {
  /** Location resource name */
  locationName: string;
  /** Page size (max 100) */
  pageSize?: number;
  /** Page token for pagination */
  pageToken?: string;
}

/** Paginated posts response */
export interface ListPostsResponse {
  localPosts: LocalPost[];
  nextPageToken?: string;
}

// ==================== Insights ====================

/** Metrics for a location */
export interface LocationInsights {
  locationName: string;
  timeRange: InsightsTimeRange;
  metrics: InsightsMetric[];
}

export interface InsightsTimeRange {
  startTime: string;
  endTime: string;
}

export interface InsightsMetric {
  metric: InsightsMetricType;
  totalValue?: MetricValue;
  dimensionalValues?: DimensionalMetricValue[];
}

export type InsightsMetricType =
  | "QUERIES_DIRECT"
  | "QUERIES_INDIRECT"
  | "QUERIES_CHAIN"
  | "VIEWS_MAPS"
  | "VIEWS_SEARCH"
  | "ACTIONS_WEBSITE"
  | "ACTIONS_PHONE"
  | "ACTIONS_DRIVING_DIRECTIONS"
  | "PHOTOS_VIEWS_MERCHANT"
  | "PHOTOS_VIEWS_CUSTOMERS"
  | "PHOTOS_COUNT_MERCHANT"
  | "PHOTOS_COUNT_CUSTOMERS";

export interface MetricValue {
  metricOption?: string;
  timeDimension?: { timeRange: InsightsTimeRange };
  value: number;
}

export interface DimensionalMetricValue {
  metricOption?: string;
  timeDimension?: { timeRange: InsightsTimeRange };
  value: number;
}

/** Parameters for requesting insights */
export interface InsightsParams {
  /** Location resource name */
  locationName: string;
  /** Metrics to retrieve */
  metrics: InsightsMetricType[];
  /** Start time (ISO 8601) */
  startTime: string;
  /** End time (ISO 8601) */
  endTime: string;
}

/** Google API paginated response */
export interface GoogleListResponse<T> {
  items: T[];
  nextPageToken?: string;
  totalSize?: number;
}
