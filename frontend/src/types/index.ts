export type LeadStatus = 
  | "new"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "negotiating"
  | "won"
  | "lost"
  | "archived";

export type LeadSource = 
  | "reddit"
  | "minecraft_server_list"
  | "planet_minecraft"
  | "mcservers"
  | "discord"
  | "referral"
  | "manual"
  | "other";

export type DraftStatus = 
  | "pending"
  | "generated"
  | "approved"
  | "sent"
  | "rejected";

export type TransactionType = "income" | "expense";

export type TransactionCategory = 
  | "service"
  | "hosting"
  | "development"
  | "design"
  | "marketing"
  | "subscription"
  | "salary"
  | "tax"
  | "other";

export type NotificationType = 
  | "invoice_due"
  | "call_scheduled"
  | "deadline"
  | "payment_received"
  | "payment_overdue"
  | "recurring_payment"
  | "client_message"
  | "custom";

export type RecurringFrequency = 
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  discord_id?: string;
  avatar_url?: string;
  notes?: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: number;
  client_id?: number;
  source: LeadSource;
  source_url?: string;
  title: string;
  description?: string;
  server_name?: string;
  server_ip?: string;
  server_players?: number;
  server_max_players?: number;
  server_version?: string;
  contact_username?: string;
  contact_platform?: string;
  status: LeadStatus;
  priority: number;
  estimated_value?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  contacted_at?: string;
  closed_at?: string;
  client?: Client;
  drafts_count?: number;
}

export interface Draft {
  id: number;
  lead_id: number;
  subject: string;
  content: string;
  ai_model?: string;
  prompt_used?: string;
  status: DraftStatus;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  sent_at?: string;
  lead?: Lead;
}

export interface Transaction {
  id: number;
  client_id?: number;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  invoice_number?: string;
  paid_at?: string;
  due_date?: string;
  is_recurring: boolean;
  recurring_id?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface RecurringPayment {
  id: number;
  client_id?: number;
  name: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  day_of_month?: number;
  day_of_week?: number;
  description?: string;
  next_due: string;
  last_generated?: string;
  is_active: boolean;
  notify_before_days: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Notification {
  id: number;
  client_id?: number;
  type: NotificationType;
  title: string;
  message: string;
  priority: number;
  is_read: boolean;
  is_sent: boolean;
  sent_at?: string;
  scheduled_for?: string;
  related_id?: number;
  related_type?: string;
  metadata: Record<string, any>;
  created_at: string;
  client?: Client;
}

export interface PiggyBankGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  deadline?: string;
  description?: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  progress_percentage?: number;
}

export interface PiggyBankTransaction {
  id: number;
  goal_id: number;
  amount: number;
  type: TransactionType;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DiscordMessage {
  id: number;
  client_id?: number;
  discord_user_id: string;
  discord_username: string;
  discord_avatar?: string;
  channel_id: string;
  message_id: string;
  content: string;
  is_from_bot: boolean;
  is_read: boolean;
  created_at: string;
  client?: Client;
}

export interface ScraperLog {
  id: number;
  scraper_name: string;
  status: string;
  leads_found: number;
  leads_new: number;
  error_message?: string;
  duration_ms: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DashboardStats {
  total_clients: number;
  active_leads: number;
  won_leads: number;
  lost_leads: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  pending_invoices: number;
  overdue_invoices: number;
  upcoming_notifications: number;
  piggy_bank_total: number;
  piggy_bank_target: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AIDraftRequest {
  lead_id: number;
  custom_prompt?: string;
  tone: "professional" | "casual" | "friendly" | "formal";
  language: "cs" | "en";
}

export interface AIDraftResponse {
  draft: Draft;
  usage: Record<string, any>;
}