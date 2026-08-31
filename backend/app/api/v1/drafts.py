from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
from app.db.base import get_db
from app.api.deps import get_current_user
from app.models import Draft, DraftStatus, Lead
from app.schemas import (
    DraftCreate, DraftUpdate, DraftResponse, AIDraftRequest, AIDraftResponse,
    PaginatedResponse
)

router = APIRouter(prefix="/drafts", tags=["drafts"])


@router.get("", response_model=PaginatedResponse)
async def list_drafts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[DraftStatus] = None,
    lead_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Draft).options(selectinload(Draft.lead))
    
    if status:
        query = query.where(Draft.status == status)
    if lead_id:
        query = query.where(Draft.lead_id == lead_id)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.order_by(Draft.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    drafts = result.scalars().all()
    
    return PaginatedResponse(
        items=[DraftResponse.model_validate(d) for d in drafts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{draft_id}", response_model=DraftResponse)
async def get_draft(
    draft_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(Draft).options(selectinload(Draft.lead)).where(Draft.id == draft_id)
    )
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


@router.post("", response_model=DraftResponse, status_code=status.HTTP_201_CREATED)
async def create_draft(
    draft_data: DraftCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify lead exists
    result = await db.execute(select(Lead).where(Lead.id == draft_data.lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    draft = Draft(**draft_data.model_dump())
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


@router.patch("/{draft_id}", response_model=DraftResponse)
async def update_draft(
    draft_id: int,
    draft_data: DraftUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Draft).where(Draft.id == draft_id))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    update_data = draft_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(draft, field, value)
    
    if draft_data.status == DraftStatus.APPROVED and draft.approved_at is None:
        draft.approved_at = datetime.utcnow()
    if draft_data.status == DraftStatus.SENT and draft.sent_at is None:
        draft.sent_at = datetime.utcnow()
    
    draft.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(draft)
    return draft


@router.delete("/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_draft(
    draft_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Draft).where(Draft.id == draft_id))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    await db.delete(draft)
    await db.commit()


# AI Draft Generation
router_ai = APIRouter(prefix="/ai", tags=["ai"])


@router_ai.post("/generate-draft", response_model=AIDraftResponse)
async def generate_draft(
    request: AIDraftRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.core.config import settings
    from app.services.ai_service import generate_draft as ai_generate_draft
    
    # Get lead info
    result = await db.execute(
        select(Lead).options(selectinload(Lead.client)).where(Lead.id == request.lead_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Generate draft using AI
    draft_content, usage = await ai_generate_draft(lead, request)
    
    # Create draft record
    draft = Draft(
        lead_id=lead.id,
        subject=f"Nabídka spolupráce: {lead.title}",
        content=draft_content,
        ai_model=settings.ai_provider,
        prompt_used=request.custom_prompt or "auto",
        status=DraftStatus.GENERATED
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    
    return AIDraftResponse(draft=draft, usage=usage)