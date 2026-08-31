from pydantic import BaseModel, EmailStr, HttpUrl, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL_SENT = "proposal_sent"
    NEGOTIATING = "negotiating"
    WON = "won"
    LOST = "lost"
    ARCHIVED = "archived"


class LeadSource(str, Enum):
    REDDIT = "reddit"
    MINECRAFT_SERVER_LIST = "minecraft_server_list"
    PLANET_MINECRAFT = "planet_minecraft"
    MCSERVERS = "mcservers"
    DISCORD = "discord"
    REFERRAL = "referral"
    MANUAL = "manual"
    OTHER = "other"


class DraftStatus(str, Enum):
    PENDING = "pending"
    GENERATED = "generated"
    APPROVED = "approved"
    SENT = "sent"
    REJECTED = "rejected"


class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


class TransactionCategory(str, Enum):
    SERVICE = "service"
    HOSTING = "hosting"
    DEVELOPMENT = "development"
    DESIGN = "design"
    MARKETING = "marketing"
    SUBSCRIPTION = "subscription"
    SALARY = "salary"
    TAX = "tax"
    OTHER = "other"


class NotificationType(str, Enum):
    INVOICE_DUE = "invoice_due"
    CALL_SCHEDULED = "call_scheduled"
    DEADLINE = "deadline"
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_OVERDUE = "payment_overdue"
    RECURRING_PAYMENT = "recurring_payment"
    CLIENT_MESSAGE = "client_message"
    CUSTOM = "custom"


class RecurringFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


# Client schemas
class ClientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=200)
    website: Optional[HttpUrl] = None
    discord_id: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    tags: List[str] = []
    is_active: bool = True


class ClientCreate(ClientBase):
    avatar_url: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=200)
    website: Optional[HttpUrl] = None
    discord_id: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ClientResponse(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ClientWithRelations(ClientResponse):
    leads_count: int = 0
    total_revenue: float = 0
    total_expenses: float = 0
    last_contact: Optional[datetime] = None


# Lead schemas
class LeadBase(BaseModel):
    source: LeadSource = LeadSource.MANUAL
    source_url: Optional[HttpUrl] = None
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    server_name: Optional[str] = Field(None, max_length=200)
    server_ip: Optional[str] = Field(None, max_length=100)
    server_players: Optional[int] = None
    server_max_players: Optional[int] = None
    server_version: Optional[str] = Field(None, max_length=50)
    contact_username: Optional[str] = Field(None, max_length=200)
    contact_platform: Optional[str] = Field(None, max_length=50)
    priority: int = 0
    estimated_value: Optional[float] = None
    metadata: Dict[str, Any] = {}


class LeadCreate(LeadBase):
    client_id: Optional[int] = None


class LeadUpdate(BaseModel):
    client_id: Optional[int] = None
    source: Optional[LeadSource] = None
    source_url: Optional[HttpUrl] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    server_name: Optional[str] = Field(None, max_length=200)
    server_ip: Optional[str] = Field(None, max_length=100)
    server_players: Optional[int] = None
    server_max_players: Optional[int] = None
    server_version: Optional[str] = Field(None, max_length=50)
    contact_username: Optional[str] = Field(None, max_length=200)
    contact_platform: Optional[str] = Field(None, max_length=50)
    status: Optional[LeadStatus] = None
    priority: Optional[int] = None
    estimated_value: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class LeadResponse(LeadBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: Optional[int] = None
    status: LeadStatus
    created_at: datetime
    updated_at: datetime
    contacted_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None


class LeadWithClient(LeadResponse):
    client: Optional[ClientResponse] = None
    drafts_count: int = 0


# Draft schemas
class DraftBase(BaseModel):
    subject: str = Field(..., min_length=1, max_length=500)
    content: str
    ai_model: Optional[str] = None
    prompt_used: Optional[str] = None


class DraftCreate(DraftBase):
    lead_id: int


class DraftUpdate(BaseModel):
    subject: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    status: Optional[DraftStatus] = None


class DraftResponse(DraftBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    lead_id: int
    status: DraftStatus
    created_at: datetime
    updated_at: datetime
    approved_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None


# Transaction schemas
class TransactionBase(BaseModel):
    type: TransactionType
    category: TransactionCategory = TransactionCategory.OTHER
    amount: float = Field(..., gt=0)
    currency: str = Field("CZK", min_length=3, max_length=3)
    description: str = Field(..., min_length=1, max_length=500)
    reference: Optional[str] = Field(None, max_length=200)
    invoice_number: Optional[str] = Field(None, max_length=100)
    due_date: Optional[datetime] = None
    is_recurring: bool = False
    metadata: Dict[str, Any] = {}


class TransactionCreate(TransactionBase):
    client_id: Optional[int] = None
    paid_at: Optional[datetime] = None


class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    category: Optional[TransactionCategory] = None
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    reference: Optional[str] = Field(None, max_length=200)
    invoice_number: Optional[str] = Field(None, max_length=100)
    paid_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class TransactionResponse(TransactionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: Optional[int] = None
    recurring_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


# Recurring Payment schemas
class RecurringPaymentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    type: TransactionType
    category: TransactionCategory = TransactionCategory.OTHER
    amount: float = Field(..., gt=0)
    currency: str = Field("CZK", min_length=3, max_length=3)
    frequency: RecurringFrequency
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    description: Optional[str] = None
    notify_before_days: int = Field(3, ge=0, le=30)
    metadata: Dict[str, Any] = {}


class RecurringPaymentCreate(RecurringPaymentBase):
    client_id: Optional[int] = None
    next_due: datetime


class RecurringPaymentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[TransactionType] = None
    category: Optional[TransactionCategory] = None
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    frequency: Optional[RecurringFrequency] = None
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    description: Optional[str] = None
    next_due: Optional[datetime] = None
    is_active: Optional[bool] = None
    notify_before_days: Optional[int] = Field(None, ge=0, le=30)
    metadata: Optional[Dict[str, Any]] = None


class RecurringPaymentResponse(RecurringPaymentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: Optional[int] = None
    next_due: datetime
    last_generated: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


# Notification schemas
class NotificationBase(BaseModel):
    type: NotificationType
    title: str = Field(..., min_length=1, max_length=300)
    message: str
    priority: int = 0
    scheduled_for: Optional[datetime] = None
    related_id: Optional[int] = None
    related_type: Optional[str] = Field(None, max_length=50)
    metadata: Dict[str, Any] = {}


class NotificationCreate(NotificationBase):
    client_id: Optional[int] = None


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_sent: Optional[bool] = None


class NotificationResponse(NotificationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: Optional[int] = None
    is_read: bool
    is_sent: bool
    sent_at: Optional[datetime] = None
    created_at: datetime


# Discord Message schemas
class DiscordMessageBase(BaseModel):
    discord_user_id: str
    discord_username: str
    discord_avatar: Optional[str] = None
    channel_id: str
    message_id: str
    content: str
    is_from_bot: bool = False


class DiscordMessageCreate(DiscordMessageBase):
    client_id: Optional[int] = None


class DiscordMessageResponse(DiscordMessageBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: Optional[int] = None
    is_read: bool
    created_at: datetime


# Piggy Bank schemas
class PiggyBankGoalBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    target_amount: float = Field(..., gt=0)
    currency: str = Field("CZK", min_length=3, max_length=3)
    deadline: Optional[datetime] = None
    description: Optional[str] = None
    color: str = Field("#00d4aa", pattern="^#[0-9a-fA-F]{6}$")
    icon: str = Field("🐷", max_length=10)


class PiggyBankGoalCreate(PiggyBankGoalBase):
    pass


class PiggyBankGoalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    target_amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    deadline: Optional[datetime] = None
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9a-fA-F]{6}$")
    icon: Optional[str] = Field(None, max_length=10)
    is_active: Optional[bool] = None


class PiggyBankGoalResponse(PiggyBankGoalBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    current_amount: float
    is_active: bool
    created_at: datetime
    updated_at: datetime
    progress_percentage: float = 0


class PiggyBankTransactionBase(BaseModel):
    amount: float = Field(..., gt=0)
    type: TransactionType
    description: str = Field(..., min_length=1, max_length=500)
    metadata: Dict[str, Any] = {}


class PiggyBankTransactionCreate(PiggyBankTransactionBase):
    goal_id: int


class PiggyBankTransactionResponse(PiggyBankTransactionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    goal_id: int
    created_at: datetime


# Scraper schemas
class ScraperLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    scraper_name: str
    status: str
    leads_found: int
    leads_new: int
    error_message: Optional[str] = None
    duration_ms: int
    metadata: Dict[str, Any] = {}
    created_at: datetime


# AI Draft generation
class AIDraftRequest(BaseModel):
    lead_id: int
    custom_prompt: Optional[str] = None
    tone: str = Field("professional", pattern="^(professional|casual|friendly|formal)$")
    language: str = Field("cs", pattern="^(cs|en)$")


class AIDraftResponse(BaseModel):
    draft: DraftResponse
    usage: Dict[str, Any] = {}


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# Pagination
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# Dashboard stats
class DashboardStats(BaseModel):
    total_clients: int
    active_leads: int
    won_leads: int
    lost_leads: int
    total_revenue: float
    total_expenses: float
    net_profit: float
    pending_invoices: int
    overdue_invoices: int
    upcoming_notifications: int
    piggy_bank_total: float
    piggy_bank_target: float