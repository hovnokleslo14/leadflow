from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta
from app.db.base import get_db
from app.api.deps import get_current_user, create_access_token, verify_password, get_password_hash
from app.models import Client, Lead, LeadStatus, LeadSource
from app.schemas import (
    ClientCreate, ClientUpdate, ClientResponse, ClientWithRelations,
    LeadCreate, LeadUpdate, LeadResponse, LeadWithClient,
    PaginatedResponse, LoginRequest, Token
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    from app.core.config import settings
    # Check against admin credentials
    if credentials.username == settings.admin_username:
        if verify_password(credentials.password, settings.admin_password_hash) or settings.admin_password_hash == "":
            # If no hash set, set it now
            if settings.admin_password_hash == "":
                settings.admin_password_hash = get_password_hash(credentials.password)
            access_token = create_access_token(data={"sub": credentials.username})
            return {"access_token": access_token, "token_type": "bearer"}
    # Check against client users
    result = await db.execute(select(Client).where(Client.email == credentials.username))
    client = result.scalar_one_or_none()
    if client and verify_password(credentials.password, client.metadata.get("password_hash", "") if client.metadata else ""):
        access_token = create_access_token(data={"sub": client.email})
        return {"access_token": access_token, "token_type": "bearer"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/register", response_model=ClientResponse)
async def register(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db)
):
    # Check if email exists
    if client_data.email:
        result = await db.execute(select(Client).where(Client.email == client_data.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")
    
    client = Client(**client_data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


router_clients = APIRouter(prefix="/clients", tags=["clients"])


@router_clients.get("", response_model=PaginatedResponse)
async def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Client = Depends(get_current_user)
):
    query = select(Client)
    if search:
        query = query.where(
            or_(
                Client.name.ilike(f"%{search}%"),
                Client.email.ilike(f"%{search}%"),
                Client.company.ilike(f"%{search}%")
            )
        )
    if is_active is not None:
        query = query.where(Client.is_active == is_active)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Apply pagination
    query = query.order_by(Client.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    clients = result.scalars().all()
    
    return PaginatedResponse(
        items=[ClientResponse.model_validate(c) for c in clients],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router_clients.get("/{client_id}", response_model=ClientWithRelations)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Client = Depends(get_current_user)
):
    result = await db.execute(
        select(Client)
        .options(selectinload(Client.leads), selectinload(Client.transactions))
        .where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Calculate stats
    total_revenue = sum(t.amount for t in client.transactions if t.type.value == "income")
    total_expenses = sum(t.amount for t in client.transactions if t.type.value == "expense")
    leads_count = len(client.leads)
    last_contact = max((l.updated_at for l in client.leads), default=None)
    
    response = ClientWithRelations.model_validate(client)
    response.leads_count = leads_count
    response.total_revenue = total_revenue
    response.total_expenses = total_expenses
    response.last_contact = last_contact
    return response


@router_clients.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Client = Depends(get_current_user)
):
    if client_data.email:
        result = await db.execute(select(Client).where(Client.email == client_data.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")
    
    client = Client(**client_data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router_clients.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Client = Depends(get_current_user)
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    client.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(client)
    return client


@router_clients.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Client = Depends(get_current_user)
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    await db.delete(client)
    await db.commit()


router_leads = APIRouter(prefix="/leads", tags=["leads"])


@router_leads.get("", response_model=PaginatedResponse)
async def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[LeadStatus] = None,
    source: Optional[LeadSource] = None,
    client_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Client = Depends(get_current_user)
):
    query = select(Lead).options(selectinload(Lead.client))
    
    if status:
        query = query.where(Lead.status == status)
    if source:
        query = query.where(Lead.source == source)
    if client_id:
        query = query.where(Lead.client_id == client_id)
    if search:
        query = query.where(
            or_(
                Lead.title.ilike(f"%{search}%"),
                Lead.description.ilike(f"%{search}%"),
                Lead.server_name.ilike(f"%{search}%"),
                Lead.contact_username.ilike(f"%{search}%")
            )
        )
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.order_by(Lead.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    leads = result.scalars().all()
    
    return PaginatedResponse(
        items=[LeadWithClient.model_validate(l) for l in leads],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router_leads.get("/{lead_id}", response_model=LeadWithClient)
async def get_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Client = Depends(get_current_user)
):
    result = await db.execute(
        select(Lead)
        .options(selectinload(Lead.client), selectinload(Lead.drafts))
        .where(Lead.id == lead_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    response = LeadWithClient.model_validate(lead)
    response.drafts_count = len(lead.drafts)
    return response


@router_leads.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_data: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Client = Depends(get_current_user)
):
    lead = Lead(**lead_data.model_dump())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead


@router_leads.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Client = Depends(get_current_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = lead_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)
    
    if lead_data.status == LeadStatus.CONTACTED and lead.contacted_at is None:
        lead.contacted_at = datetime.utcnow()
    if lead_data.status in [LeadStatus.WON, LeadStatus.LOST] and lead.closed_at is None:
        lead.closed_at = datetime.utcnow()
    
    lead.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(lead)
    return lead


@router_leads.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Client = Depends(get_current_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    await db.delete(lead)
    await db.commit()