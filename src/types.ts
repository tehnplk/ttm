
export enum BookingStep {
  BRANCH_SELECTION = 0,
  SERVICE_SELECTION = 1,
  DATE_SELECTION = 2,
  TIME_SELECTION = 3,
  STAFF_SELECTION = 4,
  CONFIRMATION = 5,
  SUCCESS = 6,
  MY_BOOKINGS = 7, // New step for checking history
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  image: string;
  availableServices: string[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number; // THB
  image: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  image: string;
  specialty: string[];
}

export interface TimeSlot {
  id: string;
  time: string; // "10:00"
  available: boolean;
}

export interface BookingState {
  branch: Branch | null;
  service: Service | null;
  date: Date | null;
  timeSlot: TimeSlot | null;
  staff: Staff | null;
  customerName: string;
  customerPhone: string;
  note?: string; // Optional note field
}

export interface AIRecommendation {
  recommendedServiceId: string;
  reasoning: string;
}

// New Configurations
export interface ShopConfig {
  openTime: number; // Hour 0-23
  closeTime: number; // Hour 0-23
  holidays: string[]; // ISO Date strings "YYYY-MM-DD"
  slotInterval: number; // Minutes
}

export interface StaffSchedule {
  staffId: string;
  offDays: string[]; // ISO Date strings "YYYY-MM-DD"
  busySlots: { [date: string]: string[] }; // Key is date, Value is array of time strings "10:00"
}

export interface BookingHistory {
  id: string;
  branchName: string;
  serviceName: string;
  date: string; // ISO String
  time: string;
  staffName: string;
  customerPhone: string;
  status: 'confirmed' | 'completed' | 'cancelled';
}