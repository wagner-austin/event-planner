from __future__ import annotations

import datetime as dt

from sqlalchemy import Boolean, DateTime, Index, Integer, MetaData, String, Text, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    # Explicit metadata avoids plugin "Any" issues on Base.metadata
    metadata = MetaData()


class EventRow(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    type: Mapped[str | None] = mapped_column(String, nullable=True)
    starts_at: Mapped[dt.datetime] = mapped_column(DateTime)
    ends_at: Mapped[dt.datetime] = mapped_column(DateTime)
    location_text: Mapped[str | None] = mapped_column(String, nullable=True)
    tags_json: Mapped[str] = mapped_column(Text)
    public: Mapped[bool] = mapped_column(Boolean)
    requires_join_code: Mapped[bool] = mapped_column(Boolean)
    join_code_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    admin_key_hash: Mapped[str] = mapped_column(String)
    capacity: Mapped[int] = mapped_column(Integer)
    waitlist_enabled: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime)


class ReservationRow(Base):
    __tablename__ = "reservations"
    __table_args__ = (
        # Unique constraint: one active reservation per user per event
        # Partial index only enforces for non-canceled, authenticated reservations
        Index(
            'idx_unique_active_user_reservation',
            'event_id',
            'user_id',
            unique=True,
            postgresql_where=text("status != 'canceled' AND user_id IS NOT NULL"),
            sqlite_where=text("status != 'canceled' AND user_id IS NOT NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    event_id: Mapped[str] = mapped_column(String)
    user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    display_name: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String)
    promoted_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime)


def create_all(engine: Engine) -> None:
    metadata: MetaData = Base.metadata
    metadata.create_all(engine)


__all__ = ["EventRow", "ReservationRow", "create_all"]

