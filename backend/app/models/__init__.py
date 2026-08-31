import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String, Text, Integer, BigInteger, DateTime, ForeignKey, Enum, Boolean,
    Float, JSON, Index, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.base import Base


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL_SENT = "proposal_sent"
    NEGOTIATING = "negotiating"
    WON = "won"
    LOST = "lost"
    ARCHIVED = "archived"


class LeadSource(str, enum.Enum):
    REDDIT = "reddit"
    MINECRAFT_SERVER_LIST = "minecraft_server_list"
    PLANET_MINECRAFT = "planet_minecraft"
    MCSERVERS = "mcservers"
    DISCORD = "discord"
    REFERRAL = "referral"
    MANUAL = "manual"
    OTHER = "other"


class DraftStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATED = "generated"
    APPROVED = "approved"
    SENT = "sent"
    REJECTED = "rejected"


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class TransactionCategory(str, enum.Enum):
    SERVICE = "service"
    HOSTING = "hosting"
    DEVELOPMENT = "development"
    DESIGN = "design"
    MARKETING = "marketing"
    SUBSCRIPTION = "subscription"
    SALARY = "salary"
    TAX = "tax"
    OTHER = "other"


class NotificationType(str, enum.Enum):
    INVOICE_DUE = "invoice_due"
    CALL_SCHEDULED = "call_scheduled"
    DEADLINE = "deadline"
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_OVERDUE = "payment_overdue"
    RECURRING_PAYMENT = "recurring_payment"
    CLIENT_MESSAGE = "client_message"
    CUSTOM = "custom"


class RecurringFrequency(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    discord_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    company: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="client", cascade="all, delete-orphan")
    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="client", cascade="all, delete-orphan")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="client", cascade="all, delete-orphan")
    recurring_payments: Mapped[List["RecurringPayment"]] = relationship("RecurringPayment", back_populates="client", cascade="all, delete-orphan")
    discord_messages: Mapped[List["DiscordMessage"]] = relationship("DiscordMessage", back_populates="client", cascade="all, delete-orphan")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    source: Mapped[LeadSource] = mapped_column(Enum(LeadSource), default=LeadSource.MANUAL, index=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    server_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    server_ip: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    server_players: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    server_max_players: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    server_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    contact_username: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    contact_platform: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[LeadStatus] = mapped_column(Enum(LeadStatus), default=LeadStatus.NEW, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    estimated_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    contacted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    client: Mapped[Optional["Client"]] = relationship("Client", back_populates="leads")
    drafts: Mapped[List["Draft"]] = relationship("Draft", back_populates="lead", cascade="all, delete-orphan")


class Draft(Base):
    __tablename__ = "drafts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"), index=True)
    subject: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    ai_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    prompt_used: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[DraftStatus] = mapped_column(Enum(DraftStatus), default=DraftStatus.PENDING, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="drafts")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), index=True)
    category: Mapped[TransactionCategory] = mapped_column(Enum(TransactionCategory), default=TransactionCategory.OTHER)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="CZK")
    description: Mapped[str] = mapped_column(String(500))
    reference: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    invoice_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurring_id: Mapped[Optional[int]] = mapped_column(ForeignKey("recurring_payments.id", ondelete="SET NULL"), nullable=True)
    metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client: Mapped[Optional["Client"]] = relationship("Client", back_populates="transactions")
    recurring: Mapped[Optional["RecurringPayment"]] = relationship("RecurringPayment", back_populates="transactions")


class RecurringPayment(Base):
    __tablename__ = "recurring_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType))
    category: Mapped[TransactionCategory] = mapped_column(Enum(TransactionCategory), default=TransactionCategory.OTHER)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="CZK")
    frequency: Mapped[RecurringFrequency] = mapped_column(Enum(RecurringFrequency))
    day_of_month: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    day_of_week: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    next_due: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    last_generated: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_before_days: Mapped[int] = mapped_column(Integer, default=3)
    metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client: Mapped[Optional["Client"]] = relationship("Client", back_populates="recurring_payments")
    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="recurring")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), index=True)
    title: Mapped[str] = mapped_column(String(300))
    message: Mapped[str] = mapped_column(Text)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    related_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    related_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    client: Mapped[Optional["Client"]] = relationship("Client", back_populates="notifications")


class DiscordMessage(Base):
    __tablename__ = "discord_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    discord_user_id: Mapped[str] = mapped_column(String(100), index=True)
    discord_username: Mapped[str] = mapped_column(String(200))
    discord_avatar: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    channel_id: Mapped[str] = mapped_column(String(100))
    message_id: Mapped[str] = mapped_column(String(100), unique=True)
    content: Mapped[str] = mapped_column(Text)
    is_from_bot: Mapped[bool] = mapped_column(Boolean, default=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    client: Mapped[Optional["Client"]] = relationship("Client", back_populates="discord_messages")


class PiggyBankGoal(Base):
    __tablename__ = "piggy_bank_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    target_amount: Mapped[float] = mapped_column(Float)
    current_amount: Mapped[float] = mapped_column(Float, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="CZK")
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(7), default="#00d4aa")
    icon: Mapped[str] = mapped_column(String(50), default="🐷")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PiggyBankTransaction(Base):
    __tablename__ = "piggy_bank_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("piggy_bank_goals.id", ondelete="CASCADE"), index=True)
    amount: Mapped[float] = mapped_column(Float)
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType))
    description: Mapped[str] = mapped_column(String(500))
    metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ScraperLog(Base):
    __tablename__ = "scraper_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scraper_name: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(50))
    leads_found: Mapped[int] = mapped_column(Integer, default=0)
    leads_new: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)