export type UserRole = "borrower" | "staff" | "assistant_admin" | "admin";
export type AccountStatus = "active" | "inactive" | "disabled" | "pending_verification";
export type BorrowerAccountType = "student" | "teacher";
export type InventoryStatus = "available" | "borrowed" | "damaged" | "lost" | "archived";
export type RequestStatus = "pending" | "approved" | "rejected" | "active" | "returned" | "cancelled" | "overdue";
export type ReturnCondition = "good" | "minor_damage" | "damaged" | "lost";
export type ReturnTiming = "very_early" | "early" | "on_time" | "late_1" | "late_2_3" | "late_4_7" | "late_8_plus";
export type InvitationType = "borrower" | "staff";
export type StaffRole = "staff" | "assistant_admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  account_status: AccountStatus;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export interface BorrowerProfile {
  id: string;
  account_type: BorrowerAccountType;
  id_code: string;
  year?: string | null;
  section?: string | null;
  phone?: string | null;
  credit_score: number;
  photo_path?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface StaffProfile {
  id: string;
  department?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface InventoryCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface Inventory {
  id: string;
  name: string;
  category_id?: string | null;
  description?: string | null;
  photo_path?: string | null;
  sku_prefix: string;
  sku: string;
  barcode: string;
  quantity_total: number;
  quantity_available: number;
  quantity_borrowed: number;
  quantity_damaged: number;
  quantity_lost: number;
  status: InventoryStatus;
  track_individual: boolean;
  specifications?: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  inventory_categories?: InventoryCategory;
}

export interface InventoryItem {
  id: string;
  inventory_id: string;
  sku: string;
  barcode: string;
  status: InventoryStatus;
  condition: ReturnCondition | "good";
  current_borrower_id?: string | null;
  current_request_id?: string | null;
  notes?: string | null;
}

export interface GuestProfile {
  id: string;
  full_name: string;
  account_type: BorrowerAccountType;
  email: string;
  phone: string;
  id_code: string;
  year?: string | null;
  section?: string | null;
  photo_path?: string | null;
  created_at: string;
}

export interface BorrowRequest {
  id: string;
  request_number: string;
  borrower_id?: string | null;
  guest_profile_id?: string | null;
  is_guest: boolean;
  status: RequestStatus;
  borrow_date?: string | null;
  due_date?: string | null;
  photo_path?: string | null;
  notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  activated_at?: string | null;
  created_at: string;
  updated_at: string;
  borrower_profiles?: BorrowerProfile & { profiles?: Profile };
  profiles?: Profile & { borrower_profiles?: BorrowerProfile | BorrowerProfile[] };
  guest_profiles?: GuestProfile;
  borrow_request_items?: BorrowRequestItem[];
}

export interface BorrowRequestItem {
  id: string;
  request_id: string;
  inventory_id: string;
  inventory_item_id?: string | null;
  quantity: number;
  status: RequestStatus;
  inventory?: Inventory;
}

export interface ReturnRecord {
  id: string;
  request_id: string;
  request_item_id: string;
  inventory_id: string;
  inventory_item_id?: string | null;
  return_date: string;
  condition: ReturnCondition;
  notes?: string | null;
  return_timing?: ReturnTiming | null;
  days_late: number;
  processed_by: string;
  credit_change?: number | null;
  created_at: string;
  inventory?: Inventory;
}

export interface CreditHistoryEntry {
  id: string;
  borrower_id: string;
  transaction_type: string;
  behavior: string;
  credit_change: number;
  new_score: number;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface RegistrationInvitation {
  id: string;
  token: string;
  invitation_type: InvitationType;
  staff_role?: StaffRole | null;
  email: string;
  expires_at: string;
  used_at?: string | null;
  used_by?: string | null;
  created_by: string;
  created_at: string;
}

export interface SystemSettings {
  organization_name: string;
  logo_url: string;
  default_borrowing_days: number;
  invitation_expiration_hours: number;
  photo_retention_days: "90" | "180" | "365" | "forever";
  credit_settings: CreditSettings;
  email_notifications: EmailNotificationSettings;
  due_soon_days: number;
}

export interface CreditSettings {
  very_early_return: number;
  early_return: number;
  on_time_return: number;
  late_1_day: number;
  late_2_3_days: number;
  late_4_7_days: number;
  late_8_plus_days: number;
  minor_damage: number;
  moderate_damage: number;
  severe_damage: number;
  lost_item: number;
  min_score: number;
  max_score: number;
  default_score: number;
  rolling_weight_recent: number;
  rolling_weight_historical: number;
}

export interface EmailNotificationSettings {
  invitation: boolean;
  verification: boolean;
  password_reset: boolean;
  request_submitted: boolean;
  request_approved: boolean;
  request_rejected: boolean;
  due_soon: boolean;
  overdue: boolean;
  return_confirmation: boolean;
}

export interface CartItem {
  inventoryId: string;
  name: string;
  sku: string;
  barcode: string;
  photoPath?: string | null;
  quantity: number;
  maxQuantity: number;
}

export interface DashboardStats {
  totalInventory: number;
  availableItems: number;
  currentlyBorrowed: number;
  overdue: number;
  totalBorrowers: number;
  totalStaff: number;
  pendingRequests: number;
  totalBorrowings: number;
}

export interface BorrowerDashboardStats {
  currentlyBorrowed: number;
  totalBorrowed: number;
  itemsDue: number;
  overdueCount: number;
  mostBorrowedItem: string;
  creditScore: number;
  creditStatus: string;
}

export const ROLE_PERMISSIONS = {
  admin: [
    "dashboard", "inventory.manage", "inventory.view", "borrowers.view",
    "requests.manage", "returns.manage", "staff.manage", "invitations.manage",
    "activity.view", "reports.view", "settings.manage",
  ],
  assistant_admin: [
    "dashboard", "inventory.view", "requests.manage", "returns.manage",
  ],
  staff: [
    "dashboard", "requests.manage", "returns.manage",
  ],
  borrower: [
    "dashboard", "inventory.view", "borrow.create", "profile.manage",
  ],
} as const;

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return (perms as readonly string[]).includes(permission);
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "admin":
    case "assistant_admin":
    case "staff":
      return "/admin/dashboard";
    case "borrower":
      return "/borrower/dashboard";
    default:
      return "/";
  }
}
