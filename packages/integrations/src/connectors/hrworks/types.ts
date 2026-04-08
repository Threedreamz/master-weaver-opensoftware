// ==================== HRworks API Types ====================
// API key authentication with HMAC signing
// https://developers.hrworks.de/

// ==================== Config ====================

export interface HRworksClientConfig {
  /** HRworks access key */
  accessKey: string;
  /** HRworks secret key (used for HMAC-SHA256 signing) */
  secretKey: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Common ====================

export interface HRworksPaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Items per page (max 100) */
  pageSize?: number;
}

export interface HRworksListResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

// ==================== Persons ====================

export interface HRworksPerson {
  personnelNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "diverse";
  title?: string;
  nationality?: string;
  entryDate?: string;
  exitDate?: string;
  status: "active" | "inactive";
  organizationUnit?: string;
  costCenter?: string;
  supervisor?: string;
  address?: HRworksAddress;
  bankDetails?: HRworksBankDetails;
  employmentType?: "fulltime" | "parttime" | "minijob" | "intern";
  weeklyWorkingHours?: number;
}

export interface HRworksAddress {
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  additionalLine?: string;
}

export interface HRworksBankDetails {
  iban?: string;
  bic?: string;
  bankName?: string;
  accountHolder?: string;
}

export interface HRworksCreatePersonData {
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "diverse";
  entryDate?: string;
  organizationUnit?: string;
  costCenter?: string;
  employmentType?: "fulltime" | "parttime" | "minijob" | "intern";
  weeklyWorkingHours?: number;
  address?: HRworksAddress;
  bankDetails?: HRworksBankDetails;
}

// ==================== Absences ====================

export interface HRworksAbsence {
  id: string;
  personnelNumber: string;
  absenceType: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
  status: "requested" | "approved" | "rejected" | "cancelled";
  days: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HRworksAbsenceType {
  id: string;
  name: string;
  shortName: string;
  category: "vacation" | "sick" | "special" | "unpaid" | "other";
  requiresApproval: boolean;
  deductsFromAllowance: boolean;
}

export interface HRworksCreateAbsenceData {
  personnelNumber: string;
  absenceTypeId: string;
  startDate: string;
  endDate: string;
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
  comment?: string;
}

export interface HRworksAbsenceBalance {
  personnelNumber: string;
  absenceTypeId: string;
  absenceTypeName: string;
  entitlement: number;
  used: number;
  planned: number;
  remaining: number;
  year: number;
}

// ==================== Working Times ====================

export interface HRworksWorkingTime {
  id: string;
  personnelNumber: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  breakMinutes: number;
  netMinutes: number;
  projectId?: string;
  comment?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface HRworksCreateWorkingTimeData {
  personnelNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  projectId?: string;
  comment?: string;
}

export interface HRworksWorkingTimeModel {
  id: string;
  name: string;
  weeklyHours: number;
  mondayHours: number;
  tuesdayHours: number;
  wednesdayHours: number;
  thursdayHours: number;
  fridayHours: number;
  saturdayHours: number;
  sundayHours: number;
}

// ==================== Master Data ====================

export interface HRworksOrganizationUnit {
  id: string;
  name: string;
  parentId?: string;
  managerId?: string;
  costCenter?: string;
}

export interface HRworksCostCenter {
  id: string;
  number: string;
  name: string;
  active: boolean;
}

export interface HRworksHolidayCalendar {
  id: string;
  name: string;
  region: string;
  holidays: HRworksHoliday[];
}

export interface HRworksHoliday {
  date: string;
  name: string;
  halfDay: boolean;
}

export interface HRworksProject {
  id: string;
  name: string;
  number?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
}
