// ─── GILAM SAAS — GLOBAL TYPES ───────────────────────────────────────────────
// Bu fayl loyihadagi barcha entity'larning yagona va aniq typelari.
// Backend entity'lar bilan 100% mos.

export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'OPERATOR' | 'DRIVER' | 'WASHER' | 'FINISHER' | 'CUSTOMER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'OFFLINE' | 'DELETED';
export type CompanyStatus = 'ACTIVE' | 'INACTIVE';
export type OrderStatus = 'NEW' | 'DRIVER_ASSIGNED' | 'PICKED_UP' | 'AT_FACILITY' | 'WASHING' | 'DRYING' | 'READY_FOR_DELIVERY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type CallStatus = 'RINGING' | 'ANSWERED' | 'COMPLETED' | 'MISSED' | 'REJECTED';
export type CallDirection = 'INCOMING' | 'OUTGOING';
export type CampaignStatus = 'ACTIVE' | 'INACTIVE';

// ─── COMPANY ─────────────────────────────────────────────────────────────────
export interface Company {
  id: string;
  name: string;
  phoneNumber?: string;
  sipCredentials?: Record<string, any>;
  status: CompanyStatus;
  subscriptionEndDate?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── USER ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
  companyId: string;
  company?: Company;
  status: UserStatus;
  currentLocation?: any;
  createdAt: string;
  updatedAt?: string;
}

// ─── CUSTOMER ────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  companyId: string;
  company?: Company;
  fullName: string;
  phone1: string;      // DB column: phone_1 (NOT 'phone')
  phone2?: string;     // DB column: phone_2
  address?: string;
  location?: any;
  operatorId?: string;
  operator?: User;
  createdAt: string;
  updatedAt?: string;
}

// ─── SERVICE ─────────────────────────────────────────────────────────────────
export interface Service {
  id: string;
  name: string;
  price: number;
  measurementUnit: string;
  companyId: string;
  createdAt: string;
}

// ─── ORDER ───────────────────────────────────────────────────────────────────
export interface OrderItem {
  id: string;
  serviceId: string;
  service?: Service;
  quantity: number;
  width: number;
  length: number;
  price: number;
  total: number;
  notes?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer?: Customer;
  companyId: string;
  operatorId: string;
  operator?: User;
  driverId?: string;
  driver?: User;
  status: OrderStatus;
  totalAmount: number;
  paidAmount?: number;
  paymentStatus?: string;
  items: OrderItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── CAMPAIGN ────────────────────────────────────────────────────────────────
export interface Campaign {
  id: string;
  companyId: string;
  company?: Company;
  name: string;
  phoneNumber: string;
  extraNumbers: string[];
  description?: string;
  status: CampaignStatus;
  driverId?: string;
  driver?: User;
  operators: User[];
  createdAt: string;
  updatedAt?: string;
}

// ─── CALL ────────────────────────────────────────────────────────────────────
export interface Call {
  id: string;
  companyId: string;
  company?: Company;
  campaignId?: string;
  campaign?: Campaign;
  operatorId?: string;
  operator?: User;
  customerId?: string;
  customer?: Customer;
  orderId?: string;
  order?: Order;
  callerPhone: string;
  calledPhone?: string;
  direction: CallDirection;
  status: CallStatus;
  sipCallId?: string;
  notes?: string;
  durationSeconds: number;
  recordingUrl?: string;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── NOTIFICATION ────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  title?: string;
  text: string;        // Backend entity field name (was incorrectly 'message')
  message?: string;    // Alias kept for backward compat — use text instead
  type: string;
  companyId?: string;
  userId?: string;
  isRead: boolean;
  createdAt: string;
}

// ─── INCOMING CALL EVENT (WebSocket) ─────────────────────────────────────────
export interface IncomingCallEvent {
  call: {
    id: string;
    callerPhone: string;
    calledPhone: string;
    campaignId: string;
    companyId: string;
    status: CallStatus;
    direction: CallDirection;
    startedAt: string;
  };
  customer: {
    id: string;
    fullName: string;
    phone1: string;
    phone2?: string;
    address?: string;
  } | null;
  campaign: {
    id: string;
    name: string;
    phoneNumber: string;
    driver?: { id: string; fullName: string } | null;
  };
}

// ─── CALL UPDATE EVENT (WebSocket) ───────────────────────────────────────────
export interface CallUpdateEvent {
  callId: string;
  status?: CallStatus;
  operatorId?: string;
  driverId?: string;
  orderId?: string;
  type?: string;
  message?: string;
  customerPhone?: string;
}
