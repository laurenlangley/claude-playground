from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .database import Base


class ProcessingStatus(str, enum.Enum):
    """File processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DataType(str, enum.Enum):
    """Metric data types"""
    NUMERIC = "numeric"
    CATEGORICAL = "categorical"
    BOOLEAN = "boolean"


class User(Base):
    """User model (future multi-tenancy)"""
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    preferences = Column(JSON, default={})

    # Relationships
    health_metrics = relationship("HealthMetric", back_populates="user")
    data_sources = relationship("DataSource", back_populates="user")
    uploaded_files = relationship("UploadedFile", back_populates="user")


class MetricType(Base):
    """Catalog of all measurable health metrics"""
    __tablename__ = "metric_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # e.g., "hrv_sdnn"
    display_name = Column(String)  # e.g., "Heart Rate Variability (SDNN)"
    unit = Column(String)  # e.g., "ms", "mg/dL"
    category = Column(String)  # e.g., "recovery", "fitness", "lab_result", "cycle"
    data_type = Column(SQLEnum(DataType))
    normal_range = Column(JSON)  # {"min": X, "max": Y, "optimal": Z}

    # Relationships
    health_metrics = relationship("HealthMetric", back_populates="metric_type")


class DataSource(Base):
    """Track where data came from"""
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    source_type = Column(String)  # "apple_watch", "manual", "pdf_lab", "csv_upload"
    source_name = Column(String)  # e.g., "Apple Watch Series 8"
    uploaded_file_id = Column(Integer, ForeignKey("uploaded_files.id"), nullable=True)
    ingested_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="data_sources")
    uploaded_file = relationship("UploadedFile", back_populates="data_sources")
    health_metrics = relationship("HealthMetric", back_populates="data_source")


class HealthMetric(Base):
    """Core time-series health data"""
    __tablename__ = "health_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    metric_type_id = Column(Integer, ForeignKey("metric_types.id"), index=True)
    timestamp = Column(DateTime, index=True)
    value = Column(Float, nullable=True)  # For numeric data
    value_text = Column(String, nullable=True)  # For categorical data
    data_source_id = Column(Integer, ForeignKey("data_sources.id"))
    extra_metadata = Column(JSON, default={})  # Additional context
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="health_metrics")
    metric_type = relationship("MetricType", back_populates="health_metrics")
    data_source = relationship("DataSource", back_populates="health_metrics")


class UploadedFile(Base):
    """Registry of uploaded files"""
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    file_name = Column(String)
    file_type = Column(String)  # "csv", "pdf", "txt"
    file_path = Column(String)  # Local path or S3 key
    processing_status = Column(SQLEnum(ProcessingStatus), default=ProcessingStatus.PENDING)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    error_message = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="uploaded_files")
    data_sources = relationship("DataSource", back_populates="uploaded_file")


class LLMInsight(Base):
    """Cached LLM-generated insights"""
    __tablename__ = "llm_insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    insight_type = Column(String)  # "daily_summary", "correlation", "qa_response"
    question = Column(String, nullable=True)  # For Q&A
    response = Column(String)
    context_data = Column(JSON)  # What data was used
    generated_at = Column(DateTime, default=datetime.utcnow)
