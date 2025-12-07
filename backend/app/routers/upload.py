"""File upload and ingestion endpoints"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
from pathlib import Path
from datetime import datetime

from ..database import get_db
from ..models import UploadedFile, DataSource, HealthMetric, MetricType, ProcessingStatus
from ..config import get_settings
from ..parsers.csv_parser import parse_hrv_csv, detect_csv_type
from ..parsers.cycle_parser import parse_cycle_txt
from ..parsers.pdf_parser import parse_lab_pdf_with_llm

router = APIRouter(prefix="/api/upload", tags=["upload"])
settings = get_settings()

# Create uploads directory
UPLOAD_DIR = Path("./data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/csv")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process CSV file (HRV or other wearable data)"""

    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        # Save file
        file_path = UPLOAD_DIR / f"{settings.default_user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Create uploaded file record
        uploaded_file = UploadedFile(
            user_id=settings.default_user_id,
            file_name=file.filename,
            file_type="csv",
            file_path=str(file_path),
            processing_status=ProcessingStatus.PROCESSING
        )
        db.add(uploaded_file)
        db.commit()
        db.refresh(uploaded_file)

        # Detect CSV type
        csv_type = detect_csv_type(str(file_path))

        if csv_type == "hrv":
            # Parse HRV CSV
            parsed_data = parse_hrv_csv(str(file_path))

            # Create data source
            data_source = DataSource(
                user_id=settings.default_user_id,
                source_type="csv_upload",
                source_name=f"HRV Data - {file.filename}",
                uploaded_file_id=uploaded_file.id
            )
            db.add(data_source)
            db.commit()
            db.refresh(data_source)

            # Get HRV metric type
            hrv_metric = db.query(MetricType).filter(MetricType.name == "hrv_sdnn").first()
            if not hrv_metric:
                raise HTTPException(status_code=500, detail="HRV metric type not found. Run seed_data.py")

            # Insert metrics
            metrics_added = 0
            for record in parsed_data:
                metric = HealthMetric(
                    user_id=settings.default_user_id,
                    metric_type_id=hrv_metric.id,
                    timestamp=record['timestamp'],
                    value=record['value'],
                    data_source_id=data_source.id,
                    extra_metadata=record['metadata']
                )
                db.add(metric)
                metrics_added += 1

            # Update file status
            uploaded_file.processing_status = ProcessingStatus.COMPLETED
            db.commit()

            return {
                "message": "CSV processed successfully",
                "file_id": uploaded_file.id,
                "csv_type": csv_type,
                "metrics_added": metrics_added,
                "date_range": {
                    "start": parsed_data[0]['timestamp'].isoformat() if parsed_data else None,
                    "end": parsed_data[-1]['timestamp'].isoformat() if parsed_data else None
                }
            }
        else:
            uploaded_file.processing_status = ProcessingStatus.FAILED
            uploaded_file.error_message = f"Unknown CSV type: {csv_type}"
            db.commit()
            raise HTTPException(status_code=400, detail=f"Unsupported CSV format: {csv_type}")

    except Exception as e:
        if uploaded_file:
            uploaded_file.processing_status = ProcessingStatus.FAILED
            uploaded_file.error_message = str(e)
            db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.post("/txt")
async def upload_txt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process TXT file (cycle tracking data)"""

    if not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="File must be a TXT")

    try:
        # Save file
        file_path = UPLOAD_DIR / f"{settings.default_user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Create uploaded file record
        uploaded_file = UploadedFile(
            user_id=settings.default_user_id,
            file_name=file.filename,
            file_type="txt",
            file_path=str(file_path),
            processing_status=ProcessingStatus.PROCESSING
        )
        db.add(uploaded_file)
        db.commit()
        db.refresh(uploaded_file)

        # Parse cycle data
        parsed_data = parse_cycle_txt(str(file_path))

        # Create data source
        data_source = DataSource(
            user_id=settings.default_user_id,
            source_type="manual",
            source_name=f"Cycle Tracking - {file.filename}",
            uploaded_file_id=uploaded_file.id
        )
        db.add(data_source)
        db.commit()
        db.refresh(data_source)

        # Get metric types
        metric_types = {
            mt.name: mt for mt in db.query(MetricType).filter(
                MetricType.name.in_(['cycle_day', 'cycle_phase', 'cycle_start_date', 'cycle_length'])
            ).all()
        }

        # Insert metrics
        metrics_added = 0
        for record in parsed_data:
            for metric_data in record.get('metrics', []):
                metric_type = metric_types.get(metric_data['metric_name'])
                if not metric_type:
                    continue

                metric = HealthMetric(
                    user_id=settings.default_user_id,
                    metric_type_id=metric_type.id,
                    timestamp=record['timestamp'],
                    value=metric_data.get('value'),
                    value_text=metric_data.get('value_text'),
                    data_source_id=data_source.id,
                    extra_metadata=metric_data.get('metadata', {})
                )
                db.add(metric)
                metrics_added += 1

        # Update file status
        uploaded_file.processing_status = ProcessingStatus.COMPLETED
        db.commit()

        return {
            "message": "Cycle data processed successfully",
            "file_id": uploaded_file.id,
            "metrics_added": metrics_added
        }

    except Exception as e:
        if uploaded_file:
            uploaded_file.processing_status = ProcessingStatus.FAILED
            uploaded_file.error_message = str(e)
            db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.post("/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process PDF file (lab reports)"""

    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        # Save file
        file_path = UPLOAD_DIR / f"{settings.default_user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Create uploaded file record
        uploaded_file = UploadedFile(
            user_id=settings.default_user_id,
            file_name=file.filename,
            file_type="pdf",
            file_path=str(file_path),
            processing_status=ProcessingStatus.PROCESSING
        )
        db.add(uploaded_file)
        db.commit()
        db.refresh(uploaded_file)

        # Parse lab PDF with LLM
        parsed_data = parse_lab_pdf_with_llm(str(file_path))

        # Create data source
        data_source = DataSource(
            user_id=settings.default_user_id,
            source_type="pdf_lab",
            source_name=f"Lab Report - {file.filename}",
            uploaded_file_id=uploaded_file.id
        )
        db.add(data_source)
        db.commit()
        db.refresh(data_source)

        # Get all metric types
        all_metrics = {mt.name: mt for mt in db.query(MetricType).all()}

        # Insert metrics
        metrics_added = 0
        unmatched_metrics = []

        # Use collection date from PDF if available, otherwise use upload time
        collection_date = datetime.now()

        for record in parsed_data:
            metric_type = all_metrics.get(record['metric_name'])

            if not metric_type:
                unmatched_metrics.append(record['metric_name'])
                continue

            metric = HealthMetric(
                user_id=settings.default_user_id,
                metric_type_id=metric_type.id,
                timestamp=collection_date,
                value=record.get('value'),
                data_source_id=data_source.id,
                extra_metadata=record.get('metadata', {})
            )
            db.add(metric)
            metrics_added += 1

        # Update file status
        uploaded_file.processing_status = ProcessingStatus.COMPLETED
        db.commit()

        return {
            "message": "Lab report processed successfully",
            "file_id": uploaded_file.id,
            "metrics_added": metrics_added,
            "unmatched_metrics": unmatched_metrics if unmatched_metrics else None
        }

    except Exception as e:
        if uploaded_file:
            uploaded_file.processing_status = ProcessingStatus.FAILED
            uploaded_file.error_message = str(e)
            db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/files")
async def list_uploaded_files(db: Session = Depends(get_db)):
    """List all uploaded files"""
    files = db.query(UploadedFile).filter(
        UploadedFile.user_id == settings.default_user_id
    ).order_by(UploadedFile.uploaded_at.desc()).all()

    return {
        "files": [
            {
                "id": f.id,
                "file_name": f.file_name,
                "file_type": f.file_type,
                "status": f.processing_status.value,
                "uploaded_at": f.uploaded_at.isoformat(),
                "error_message": f.error_message
            }
            for f in files
        ]
    }
