import httpx
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.models import (
    Notification, NotificationType, RecurringPayment, RecurringFrequency,
    Transaction, TransactionType, Client, PiggyBankGoal
)
from app.core.config import settings
from app.services.discord_service import notify_invoice_due, notify_payment_received


async def check_and_create_notifications(db: AsyncSession):
    """Check for upcoming events and create notifications."""
    now = datetime.utcnow()
    
    # Check recurring payments due soon
    await _check_recurring_payments(db, now)
    
    # Check invoice due dates
    await _check_invoice_due_dates(db, now)
    
    # Check overdue invoices
    await _check_overdue_invoices(db, now)
    
    # Check piggy bank goals
    await _check_piggy_bank_goals(db, now)


async def _check_recurring_payments(db: AsyncSession, now: datetime):
    """Check recurring payments that need to be generated or notified."""
    # Payments due in notification window
    notify_cutoff = now + timedelta(days=7)  # Check a week ahead
    
    result = await db.execute(
        select(RecurringPayment)
        .where(
            and_(
                RecurringPayment.is_active == True,
                RecurringPayment.next_due <= notify_cutoff
            )
        )
    )
    payments = result.scalars().all()
    
    for payment in payments:
        days_until = (payment.next_due - now).days
        
        # Create notification if within notify_before_days
        if days_until <= payment.notify_before_days and days_until >= 0:
            # Check if notification already exists
            existing = await db.execute(
                select(Notification).where(
                    and_(
                        Notification.related_id == payment.id,
                        Notification.related_type == "recurring_payment",
                        Notification.type == NotificationType.RECURRING_PAYMENT,
                        Notification.created_at >= now - timedelta(days=1)
                    )
                )
            )
            if not existing.scalar_one_or_none():
                notification = Notification(
                    client_id=payment.client_id,
                    type=NotificationType.RECURRING_PAYMENT,
                    title=f"Pravidelná platba: {payment.name}",
                    message=f"Pravidelná platba **{payment.name}** ({payment.amount:,.0f} {payment.currency}) má splatnost za {days_until} dní ({payment.next_due.strftime('%d.%m.%Y')}).",
                    priority=5 if days_until == 0 else 3,
                    scheduled_for=now,
                    related_id=payment.id,
                    related_type="recurring_payment"
                )
                db.add(notification)
                
                # Send Discord notification
                if payment.client_id:
                    client_result = await db.execute(select(Client).where(Client.id == payment.client_id))
                    client = client_result.scalar_one_or_none()
                    if client and client.discord_id:
                        from app.services.discord_service import send_dm_embed
                        embed = {
                            "title": "🔔 Připomínka pravidelné platby",
                            "description": f"**{payment.name}**\n{notification.message}",
                            "color": 0xffaa00,
                            "footer": {"text": "LeadFlow Dashboard"}
                        }
                        await send_dm_embed(client.discord_id, embed)
        
        # Generate transaction if due today or overdue
        if payment.next_due <= now:
            await _generate_recurring_transaction(db, payment, now)


async def _generate_recurring_transaction(db: AsyncSession, payment: RecurringPayment, now: datetime):
    """Generate transaction from recurring payment."""
    # Calculate next due date
    next_due = _calculate_next_due(payment, payment.next_due)
    
    transaction = Transaction(
        client_id=payment.client_id,
        type=payment.type,
        category=payment.category,
        amount=payment.amount,
        currency=payment.currency,
        description=f"[Pravidelně] {payment.name}: {payment.description or ''}",
        due_date=payment.next_due,
        paid_at=now if payment.type == TransactionType.EXPENSE else None,
        is_recurring=True,
        recurring_id=payment.id,
        metadata={"generated_from_recurring": True}
    )
    db.add(transaction)
    
    # Update recurring payment
    payment.last_generated = now
    payment.next_due = next_due
    
    # Create notification
    notification = Notification(
        client_id=payment.client_id,
        type=NotificationType.RECURRING_PAYMENT,
        title=f"Vygenerována platba: {payment.name}",
        message=f"Byla vygenerována {'platba' if payment.type == TransactionType.EXPENSE else 'faktura'} **{payment.name}** v výši {payment.amount:,.0f} {payment.currency}.",
        priority=2,
        scheduled_for=now,
        related_id=transaction.id,
        related_type="transaction"
    )
    db.add(notification)
    
    await db.commit()


def _calculate_next_due(payment: RecurringPayment, current_due: datetime) -> datetime:
    """Calculate next due date based on frequency."""
    if payment.frequency == RecurringFrequency.DAILY:
        return current_due + timedelta(days=1)
    elif payment.frequency == RecurringFrequency.WEEKLY:
        return current_due + timedelta(weeks=1)
    elif payment.frequency == RecurringFrequency.MONTHLY:
        # Add one month, keeping day of month
        month = current_due.month + 1
        year = current_due.year
        if month > 12:
            month = 1
            year += 1
        day = min(payment.day_of_month or current_due.day, 28)  # Safe day
        return current_due.replace(year=year, month=month, day=day)
    elif payment.frequency == RecurringFrequency.QUARTERLY:
        month = current_due.month + 3
        year = current_due.year
        while month > 12:
            month -= 12
            year += 1
        day = min(payment.day_of_month or current_due.day, 28)
        return current_due.replace(year=year, month=month, day=day)
    elif payment.frequency == RecurringFrequency.YEARLY:
        year = current_due.year + 1
        day = min(payment.day_of_month or current_due.day, 28)
        return current_due.replace(year=year, day=day)
    return current_due + timedelta(days=30)


async def _check_invoice_due_dates(db: AsyncSession, now: datetime):
    """Check for invoices due soon."""
    # 3 days, 1 day, and today
    for days in [3, 1, 0]:
        target_date = now + timedelta(days=days)
        start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        
        result = await db.execute(
            select(Transaction).where(
                and_(
                    Transaction.type == TransactionType.INCOME,
                    Transaction.paid_at.is_(None),
                    Transaction.due_date >= start,
                    Transaction.due_date < end
                )
            )
        )
        transactions = result.scalars().all()
        
        for transaction in transactions:
            # Check if notification already sent for this period
            existing = await db.execute(
                select(Notification).where(
                    and_(
                        Notification.related_id == transaction.id,
                        Notification.related_type == "transaction",
                        Notification.type == NotificationType.INVOICE_DUE,
                        Notification.created_at >= now - timedelta(days=1)
                    )
                )
            )
            if existing.scalar_one_or_none():
                continue
            
            if transaction.client_id:
                client_result = await db.execute(select(Client).where(Client.id == transaction.client_id))
                client = client_result.scalar_one_or_none()
                
                notification = Notification(
                    client_id=transaction.client_id,
                    type=NotificationType.INVOICE_DUE,
                    title=f"Faktura #{transaction.invoice_number} - splatnost",
                    message=f"Faktura **#{transaction.invoice_number}** ({transaction.amount:,.0f} {transaction.currency}) má splatnost "
                           f"{'dnes' if days == 0 else f'za {days} dní'} ({transaction.due_date.strftime('%d.%m.%Y')}).",
                    priority=5 if days == 0 else 3,
                    scheduled_for=now,
                    related_id=transaction.id,
                    related_type="transaction"
                )
                db.add(notification)
                
                if client and client.discord_id:
                    await notify_invoice_due(client, transaction, days)
    
    await db.commit()


async def _check_overdue_invoices(db: AsyncSession, now: datetime):
    """Check for overdue invoices."""
    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.type == TransactionType.INCOME,
                Transaction.paid_at.is_(None),
                Transaction.due_date < now
            )
        )
    )
    transactions = result.scalars().all()
    
    for transaction in transactions:
        # Check if overdue notification sent recently
        existing = await db.execute(
            select(Notification).where(
                and_(
                    Notification.related_id == transaction.id,
                    Notification.related_type == "transaction",
                    Notification.type == NotificationType.PAYMENT_OVERDUE,
                    Notification.created_at >= now - timedelta(days=7)
                )
            )
        )
        if existing.scalar_one_or_none():
            continue
        
        days_overdue = (now - transaction.due_date).days
        
        notification = Notification(
            client_id=transaction.client_id,
            type=NotificationType.PAYMENT_OVERDUE,
            title=f"PO SPLATNOSTI: Faktura #{transaction.invoice_number}",
            message=f"Faktura **#{transaction.invoice_number}** ({transaction.amount:,.0f} {transaction.currency}) je po splatnosti už **{days_overdue} dní**!",
            priority=10,
            scheduled_for=now,
            related_id=transaction.id,
            related_type="transaction"
        )
        db.add(notification)
        
        if transaction.client_id:
            client_result = await db.execute(select(Client).where(Client.id == transaction.client_id))
            client = client_result.scalar_one_or_none()
            if client and client.discord_id:
                from app.services.discord_service import send_dm_embed
                embed = {
                    "title": "❌ Faktura po splatnosti",
                    "description": f"Faktura **#{transaction.invoice_number** je po splatnosti {days_overdue} dní.\nČástka: {transaction.amount:,.0f} {transaction.currency}",
                    "color": 0xff4444,
                    "footer": {"text": "LeadFlow Dashboard"}
                }
                await send_dm_embed(client.discord_id, embed)
    
    await db.commit()


async def _check_piggy_bank_goals(db: AsyncSession, now: datetime):
    """Check piggy bank goals for milestones."""
    result = await db.execute(select(PiggyBankGoal).where(PiggyBankGoal.is_active == True))
    goals = result.scalars().all()
    
    for goal in goals:
        progress = (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
        
        # Check milestones: 25%, 50%, 75%, 90%, 100%
        milestones = [25, 50, 75, 90, 100]
        for milestone in milestones:
            if progress >= milestone:
                # Check if already notified
                existing = await db.execute(
                    select(Notification).where(
                        and_(
                            Notification.related_id == goal.id,
                            Notification.related_type == "piggy_bank",
                            Notification.metadata.op('->>')('milestone') == str(milestone)
                        )
                    )
                )
                if existing.scalar_one_or_none():
                    continue
                
                notification = Notification(
                    type=NotificationType.CUSTOM,
                    title=f"🐷 Prasátko: {milestone}% dosaženo!",
                    message=f"Cíl **{goal.name}** dosáhl **{milestone}%** ({goal.current_amount:,.0f}/{goal.target_amount:,.0f} {goal.currency}).",
                    priority=2,
                    scheduled_for=now,
                    related_id=goal.id,
                    related_type="piggy_bank",
                    metadata={"milestone": str(milestone)}
                )
                db.add(notification)
        
        # Check deadline
        if goal.deadline and goal.deadline <= now + timedelta(days=7) and progress < 100:
            days_left = (goal.deadline - now).days
            existing = await db.execute(
                select(Notification).where(
                    and_(
                        Notification.related_id == goal.id,
                        Notification.related_type == "piggy_bank",
                        Notification.type == NotificationType.DEADLINE,
                        Notification.created_at >= now - timedelta(days=1)
                    )
                )
            )
            if not existing.scalar_one_or_none():
                notification = Notification(
                    type=NotificationType.DEADLINE,
                    title=f"🐷 Prasátko: Blíží se deadline!",
                    message=f"Cíl **{goal.name}** má deadline za **{days_left} dní**. Aktuální progres: {progress:.0f}%.",
                    priority=5,
                    scheduled_for=now,
                    related_id=goal.id,
                    related_type="piggy_bank"
                )
                db.add(notification)
    
    await db.commit()


async def send_gotify_notification(title: str, message: str, priority: int = 5):
    """Send notification via Gotify."""
    if not settings.gotify_url or not settings.gotify_token:
        return
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.gotify_url}/message",
                params={"token": settings.gotify_token},
                json={
                    "title": title,
                    "message": message,
                    "priority": priority
                }
            )
    except Exception:
        pass


async def create_notification(
    db: AsyncSession,
    type: NotificationType,
    title: str,
    message: str,
    client_id: Optional[int] = None,
    priority: int = 0,
    scheduled_for: Optional[datetime] = None,
    related_id: Optional[int] = None,
    related_type: Optional[str] = None,
    metadata: Optional[dict] = None
) -> Notification:
    """Create a notification and optionally send via Gotify/Discord."""
    notification = Notification(
        client_id=client_id,
        type=type,
        title=title,
        message=message,
        priority=priority,
        scheduled_for=scheduled_for,
        related_id=related_id,
        related_type=related_type,
        metadata=metadata or {}
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    # Send via Gotify
    await send_gotify_notification(title, message, priority)
    
    # Send via Discord if client linked
    if client_id:
        client_result = await db.execute(select(Client).where(Client.id == client_id))
        client = client_result.scalar_one_or_none()
        if client and client.discord_id:
            from app.services.discord_service import send_dm_embed
            embed = {
                "title": title,
                "description": message,
                "color": 0x5865F2,
                "footer": {"text": "LeadFlow Dashboard"}
            }
            await send_dm_embed(client.discord_id, embed)
    
    return notification


async def mark_transaction_paid(db: AsyncSession, transaction_id: int, paid_at: Optional[datetime] = None):
    """Mark transaction as paid and create notifications."""
    result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    transaction = result.scalar_one_or_none()
    if not transaction:
        return
    
    transaction.paid_at = paid_at or datetime.utcnow()
    await db.commit()
    
    # Create notification
    if transaction.type == TransactionType.INCOME and transaction.client_id:
        client_result = await db.execute(select(Client).where(Client.id == transaction.client_id))
        client = client_result.scalar_one_or_none()
        
        notification = Notification(
            client_id=transaction.client_id,
            type=NotificationType.PAYMENT_RECEIVED,
            title=f"Platba přijata: #{transaction.invoice_number}",
            message=f"Přišla platba **{transaction.amount:,.0f} {transaction.currency}** za fakturu **#{transaction.invoice_number}**.",
            priority=3,
            scheduled_for=datetime.utcnow(),
            related_id=transaction.id,
            related_type="transaction"
        )
        db.add(notification)
        await db.commit()
        
        if client and client.discord_id:
            await notify_payment_received(client, transaction)