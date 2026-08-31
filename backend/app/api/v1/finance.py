from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, extract
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta, date
from app.db.base import get_db
from app.api.deps import get_current_user
from app.models import (
    Transaction, TransactionType, TransactionCategory,
    RecurringPayment, RecurringFrequency,
    PiggyBankGoal, PiggyBankTransaction,
    Notification, NotificationType
)
from app.schemas import (
    TransactionCreate, TransactionUpdate, TransactionResponse,
    RecurringPaymentCreate, RecurringPaymentUpdate, RecurringPaymentResponse,
    PiggyBankGoalCreate, PiggyBankGoalUpdate, PiggyBankGoalResponse,
    PiggyBankTransactionCreate, PiggyBankTransactionResponse,
    NotificationCreate, NotificationUpdate, NotificationResponse,
    PaginatedResponse, DashboardStats
)

router_transactions = APIRouter(prefix="/transactions", tags=["transactions"])


@router_transactions.get("", response_model=PaginatedResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    type: Optional[TransactionType] = None,
    category: Optional[TransactionCategory] = None,
    client_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Transaction).options(selectinload(Transaction.client))
    
    if type:
        query = query.where(Transaction.type == type)
    if category:
        query = query.where(Transaction.category == category)
    if client_id:
        query = query.where(Transaction.client_id == client_id)
    if start_date:
        query = query.where(Transaction.created_at >= start_date)
    if end_date:
        query = query.where(Transaction.created_at <= end_date)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.order_by(Transaction.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    return PaginatedResponse(
        items=[TransactionResponse.model_validate(t) for t in transactions],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router_transactions.get("/stats/summary")
async def get_transaction_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query_income = select(func.coalesce(func.sum(Transaction.amount), 0)).where(Transaction.type == TransactionType.INCOME)
    query_expense = select(func.coalesce(func.sum(Transaction.amount), 0)).where(Transaction.type == TransactionType.EXPENSE)
    
    if start_date:
        query_income = query_income.where(Transaction.created_at >= start_date)
        query_expense = query_expense.where(Transaction.created_at >= start_date)
    if end_date:
        query_income = query_income.where(Transaction.created_at <= end_date)
        query_expense = query_expense.where(Transaction.created_at <= end_date)
    
    total_income = await db.scalar(query_income)
    total_expense = await db.scalar(query_expense)
    
    # By category
    income_by_cat = await db.execute(
        select(Transaction.category, func.sum(Transaction.amount))
        .where(Transaction.type == TransactionType.INCOME)
        .group_by(Transaction.category)
    )
    expense_by_cat = await db.execute(
        select(Transaction.category, func.sum(Transaction.amount))
        .where(Transaction.type == TransactionType.EXPENSE)
        .group_by(Transaction.category)
    )
    
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net": total_income - total_expense,
        "income_by_category": {cat.value: float(amount) for cat, amount in income_by_cat},
        "expense_by_category": {cat.value: float(amount) for cat, amount in expense_by_cat}
    }


@router_transactions.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    transaction = Transaction(**transaction_data.model_dump())
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router_transactions.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    update_data = transaction_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)
    
    transaction.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router_transactions.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    await db.delete(transaction)
    await db.commit()


router_recurring = APIRouter(prefix="/recurring", tags=["recurring"])


@router_recurring.get("", response_model=PaginatedResponse)
async def list_recurring_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = None,
    client_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(RecurringPayment).options(selectinload(RecurringPayment.client))
    
    if is_active is not None:
        query = query.where(RecurringPayment.is_active == is_active)
    if client_id:
        query = query.where(RecurringPayment.client_id == client_id)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.order_by(RecurringPayment.next_due).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    payments = result.scalars().all()
    
    return PaginatedResponse(
        items=[RecurringPaymentResponse.model_validate(p) for p in payments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router_recurring.get("/upcoming")
async def get_upcoming_payments(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    cutoff = datetime.utcnow() + timedelta(days=days)
    result = await db.execute(
        select(RecurringPayment)
        .options(selectinload(RecurringPayment.client))
        .where(
            and_(
                RecurringPayment.is_active == True,
                RecurringPayment.next_due <= cutoff
            )
        )
        .order_by(RecurringPayment.next_due)
    )
    payments = result.scalars().all()
    return [RecurringPaymentResponse.model_validate(p) for p in payments]


@router_recurring.post("", response_model=RecurringPaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_payment(
    payment_data: RecurringPaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    payment = RecurringPayment(**payment_data.model_dump())
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


@router_recurring.patch("/{payment_id}", response_model=RecurringPaymentResponse)
async def update_recurring_payment(
    payment_id: int,
    payment_data: RecurringPaymentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(RecurringPayment).where(RecurringPayment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Recurring payment not found")
    
    update_data = payment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(payment, field, value)
    
    payment.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(payment)
    return payment


@router_recurring.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(RecurringPayment).where(RecurringPayment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Recurring payment not found")
    
    await db.delete(payment)
    await db.commit()


router_piggy = APIRouter(prefix="/piggy-bank", tags=["piggy-bank"])


@router_piggy.get("/goals", response_model=List[PiggyBankGoalResponse])
async def list_piggy_goals(
    is_active: Optional[bool] = True,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(PiggyBankGoal)
    if is_active is not None:
        query = query.where(PiggyBankGoal.is_active == is_active)
    query = query.order_by(PiggyBankGoal.created_at.desc())
    result = await db.execute(query)
    goals = result.scalars().all()
    
    response = []
    for goal in goals:
        g = PiggyBankGoalResponse.model_validate(goal)
        g.progress_percentage = (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
        response.append(g)
    return response


@router_piggy.get("/goals/{goal_id}", response_model=PiggyBankGoalResponse)
async def get_piggy_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(PiggyBankGoal).where(PiggyBankGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    response = PiggyBankGoalResponse.model_validate(goal)
    response.progress_percentage = (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
    return response


@router_piggy.post("/goals", response_model=PiggyBankGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_piggy_goal(
    goal_data: PiggyBankGoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    goal = PiggyBankGoal(**goal_data.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    
    response = PiggyBankGoalResponse.model_validate(goal)
    response.progress_percentage = (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
    return response


@router_piggy.patch("/goals/{goal_id}", response_model=PiggyBankGoalResponse)
async def update_piggy_goal(
    goal_id: int,
    goal_data: PiggyBankGoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(PiggyBankGoal).where(PiggyBankGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    update_data = goal_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    
    goal.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(goal)
    
    response = PiggyBankGoalResponse.model_validate(goal)
    response.progress_percentage = (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
    return response


@router_piggy.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_piggy_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(PiggyBankGoal).where(PiggyBankGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    await db.delete(goal)
    await db.commit()


@router_piggy.get("/goals/{goal_id}/transactions", response_model=List[PiggyBankTransactionResponse])
async def get_piggy_transactions(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(PiggyBankGoal).where(PiggyBankGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    result = await db.execute(
        select(PiggyBankTransaction)
        .where(PiggyBankTransaction.goal_id == goal_id)
        .order_by(PiggyBankTransaction.created_at.desc())
    )
    transactions = result.scalars().all()
    return [PiggyBankTransactionResponse.model_validate(t) for t in transactions]


@router_piggy.post("/goals/{goal_id}/transactions", response_model=PiggyBankTransactionResponse, status_code=status.HTTP_201_CREATED)
async def add_piggy_transaction(
    goal_id: int,
    transaction_data: PiggyBankTransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(PiggyBankGoal).where(PiggyBankGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    transaction = PiggyBankTransaction(
        goal_id=goal_id,
        **transaction_data.model_dump()
    )
    db.add(transaction)
    
    # Update goal current amount
    if transaction_data.type == TransactionType.INCOME:
        goal.current_amount += transaction_data.amount
    else:
        goal.current_amount -= transaction_data.amount
    
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router_piggy.delete("/goals/{goal_id}/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_piggy_transaction(
    goal_id: int,
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(PiggyBankTransaction)
        .where(PiggyBankTransaction.id == transaction_id, PiggyBankTransaction.goal_id == goal_id)
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update goal current amount
    result = await db.execute(select(PiggyBankGoal).where(PiggyBankGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if goal:
        if transaction.type == TransactionType.INCOME:
            goal.current_amount -= transaction.amount
        else:
            goal.current_amount += transaction.amount
    
    await db.delete(transaction)
    await db.commit()


router_notifications = APIRouter(prefix="/notifications", tags=["notifications"])


@router_notifications.get("", response_model=PaginatedResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    is_read: Optional[bool] = None,
    client_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Notification).options(selectinload(Notification.client))
    
    if is_read is not None:
        query = query.where(Notification.is_read == is_read)
    if client_id:
        query = query.where(Notification.client_id == client_id)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.order_by(Notification.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return PaginatedResponse(
        items=[NotificationResponse.model_validate(n) for n in notifications],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router_notifications.get("/unread-count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    count = await db.scalar(select(func.count(Notification.id)).where(Notification.is_read == False))
    return {"count": count}


@router_notifications.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification


@router_notifications.patch("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    await db.execute(
        select(Notification).where(Notification.is_read == False)
    )
    # Update all
    from sqlalchemy import update
    await db.execute(update(Notification).where(Notification.is_read == False).values(is_read=True))
    await db.commit()
    return {"ok": True}


router_dashboard = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router_dashboard.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.models import Lead, LeadStatus
    
    total_clients = await db.scalar(select(func.count(Client.id)))
    active_leads = await db.scalar(select(func.count(Lead.id)).where(Lead.status.in_([
        LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED,
        LeadStatus.PROPOSAL_SENT, LeadStatus.NEGOTIATING
    ])))
    won_leads = await db.scalar(select(func.count(Lead.id)).where(Lead.status == LeadStatus.WON))
    lost_leads = await db.scalar(select(func.count(Lead.id)).where(Lead.status == LeadStatus.LOST))
    
    total_income = await db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(Transaction.type == TransactionType.INCOME))
    total_expense = await db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(Transaction.type == TransactionType.EXPENSE))
    
    # Pending invoices (income transactions not paid)
    pending_invoices = await db.scalar(
        select(func.count(Transaction.id)).where(
            and_(
                Transaction.type == TransactionType.INCOME,
                Transaction.paid_at.is_(None),
                Transaction.due_date.is_not(None)
            )
        )
    )
    
    # Overdue invoices
    overdue_invoices = await db.scalar(
        select(func.count(Transaction.id)).where(
            and_(
                Transaction.type == TransactionType.INCOME,
                Transaction.paid_at.is_(None),
                Transaction.due_date < datetime.utcnow()
            )
        )
    )
    
    upcoming_notifications = await db.scalar(
        select(func.count(Notification.id)).where(
            and_(
                Notification.is_read == False,
                or_(
                    Notification.scheduled_for.is_(None),
                    Notification.scheduled_for <= datetime.utcnow()
                )
            )
        )
    )
    
    piggy_goals = await db.execute(select(PiggyBankGoal).where(PiggyBankGoal.is_active == True))
    piggy_total = sum(g.current_amount for g in piggy_goals.scalars())
    piggy_target = sum(g.target_amount for g in piggy_goals.scalars())
    
    return DashboardStats(
        total_clients=total_clients or 0,
        active_leads=active_leads or 0,
        won_leads=won_leads or 0,
        lost_leads=lost_leads or 0,
        total_revenue=total_income or 0,
        total_expenses=total_expense or 0,
        net_profit=(total_income or 0) - (total_expense or 0),
        pending_invoices=pending_invoices or 0,
        overdue_invoices=overdue_invoices or 0,
        upcoming_notifications=upcoming_notifications or 0,
        piggy_bank_total=piggy_total,
        piggy_bank_target=piggy_target
    )