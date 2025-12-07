"""Analytics API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import datetime, timedelta

from ..database import get_db
from ..models import HealthMetric, MetricType
from ..config import get_settings
from ..analytics import (
    calculate_correlation,
    calculate_moving_average,
    detect_trend,
    group_by_cycle_phase,
    detect_anomalies
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
settings = get_settings()


@router.get("/metrics/{metric_name}")
async def get_metric_data(
    metric_name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(default=1000, le=10000),
    db: Session = Depends(get_db)
):
    """
    Retrieve time-series data for a specific metric

    Example: /api/analytics/metrics/hrv_sdnn?start_date=2025-01-01&end_date=2025-12-31
    """
    # Get metric type
    metric_type = db.query(MetricType).filter(MetricType.name == metric_name).first()
    if not metric_type:
        raise HTTPException(status_code=404, detail=f"Metric '{metric_name}' not found")

    # Build query
    query = db.query(HealthMetric).filter(
        and_(
            HealthMetric.user_id == settings.default_user_id,
            HealthMetric.metric_type_id == metric_type.id
        )
    )

    # Apply date filters
    if start_date:
        query = query.filter(HealthMetric.timestamp >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(HealthMetric.timestamp <= datetime.fromisoformat(end_date))

    # Execute query
    metrics = query.order_by(HealthMetric.timestamp.desc()).limit(limit).all()

    return {
        "metric_name": metric_name,
        "display_name": metric_type.display_name,
        "unit": metric_type.unit,
        "count": len(metrics),
        "data": [
            {
                "timestamp": m.timestamp.isoformat(),
                "value": m.value if m.value is not None else m.value_text,
                "metadata": m.extra_metadata
            }
            for m in sorted(metrics, key=lambda x: x.timestamp)
        ]
    }


@router.get("/correlation")
async def analyze_correlation(
    metric_x: str,
    metric_y: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    method: str = Query(default="pearson", regex="^(pearson|spearman|kendall)$"),
    db: Session = Depends(get_db)
):
    """
    Calculate correlation between two metrics

    Example: /api/analytics/correlation?metric_x=hrv_sdnn&metric_y=sleep_duration
    """
    # Get both metrics
    metric_type_x = db.query(MetricType).filter(MetricType.name == metric_x).first()
    metric_type_y = db.query(MetricType).filter(MetricType.name == metric_y).first()

    if not metric_type_x:
        raise HTTPException(status_code=404, detail=f"Metric '{metric_x}' not found")
    if not metric_type_y:
        raise HTTPException(status_code=404, detail=f"Metric '{metric_y}' not found")

    # Fetch data for both metrics
    def fetch_metric_data(metric_type_id):
        query = db.query(HealthMetric.timestamp, HealthMetric.value).filter(
            and_(
                HealthMetric.user_id == settings.default_user_id,
                HealthMetric.metric_type_id == metric_type_id,
                HealthMetric.value.isnot(None)
            )
        )
        if start_date:
            query = query.filter(HealthMetric.timestamp >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(HealthMetric.timestamp <= datetime.fromisoformat(end_date))

        return [(row.timestamp, row.value) for row in query.all()]

    data_x = fetch_metric_data(metric_type_x.id)
    data_y = fetch_metric_data(metric_type_y.id)

    if not data_x:
        raise HTTPException(status_code=404, detail=f"No data found for '{metric_x}'")
    if not data_y:
        raise HTTPException(status_code=404, detail=f"No data found for '{metric_y}'")

    # Calculate correlation
    result = calculate_correlation(data_x, data_y, method=method)

    return {
        "metric_x": {
            "name": metric_x,
            "display_name": metric_type_x.display_name,
            "sample_size": len(data_x)
        },
        "metric_y": {
            "name": metric_y,
            "display_name": metric_type_y.display_name,
            "sample_size": len(data_y)
        },
        **result
    }


@router.get("/trends/{metric_name}")
async def analyze_trends(
    metric_name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    moving_avg_window: int = Query(default=7, ge=2, le=90),
    db: Session = Depends(get_db)
):
    """
    Analyze trends for a metric (moving average + linear trend)

    Example: /api/analytics/trends/hrv_sdnn?moving_avg_window=7
    """
    # Get metric type
    metric_type = db.query(MetricType).filter(MetricType.name == metric_name).first()
    if not metric_type:
        raise HTTPException(status_code=404, detail=f"Metric '{metric_name}' not found")

    # Fetch data
    query = db.query(HealthMetric.timestamp, HealthMetric.value).filter(
        and_(
            HealthMetric.user_id == settings.default_user_id,
            HealthMetric.metric_type_id == metric_type.id,
            HealthMetric.value.isnot(None)
        )
    )

    if start_date:
        query = query.filter(HealthMetric.timestamp >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(HealthMetric.timestamp <= datetime.fromisoformat(end_date))

    data = [(row.timestamp, row.value) for row in query.order_by(HealthMetric.timestamp).all()]

    if not data:
        raise HTTPException(status_code=404, detail=f"No data found for '{metric_name}'")

    # Calculate moving average
    moving_avg = calculate_moving_average(data, window_days=moving_avg_window)

    # Detect trend
    trend = detect_trend(data, min_periods=7)

    # Detect anomalies
    anomalies = detect_anomalies(data, std_threshold=2.0)

    return {
        "metric": {
            "name": metric_name,
            "display_name": metric_type.display_name,
            "unit": metric_type.unit
        },
        "trend_analysis": trend,
        "moving_average": {
            "window_days": moving_avg_window,
            "data": moving_avg
        },
        "anomalies": {
            "count": len(anomalies),
            "data": anomalies
        }
    }


@router.get("/cycle-analysis/{metric_name}")
async def analyze_by_cycle_phase(
    metric_name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Analyze how a metric varies by menstrual cycle phase

    Example: /api/analytics/cycle-analysis/hrv_sdnn
    """
    # Get metric type
    metric_type = db.query(MetricType).filter(MetricType.name == metric_name).first()
    if not metric_type:
        raise HTTPException(status_code=404, detail=f"Metric '{metric_name}' not found")

    # Get cycle phase metric type
    cycle_phase_type = db.query(MetricType).filter(MetricType.name == "cycle_phase").first()
    if not cycle_phase_type:
        raise HTTPException(status_code=500, detail="Cycle phase data not available")

    # Fetch metric data
    query_metric = db.query(HealthMetric.timestamp, HealthMetric.value).filter(
        and_(
            HealthMetric.user_id == settings.default_user_id,
            HealthMetric.metric_type_id == metric_type.id,
            HealthMetric.value.isnot(None)
        )
    )

    # Fetch cycle phase data
    query_phase = db.query(HealthMetric.timestamp, HealthMetric.value_text).filter(
        and_(
            HealthMetric.user_id == settings.default_user_id,
            HealthMetric.metric_type_id == cycle_phase_type.id,
            HealthMetric.value_text.isnot(None)
        )
    )

    if start_date:
        start_dt = datetime.fromisoformat(start_date)
        query_metric = query_metric.filter(HealthMetric.timestamp >= start_dt)
        query_phase = query_phase.filter(HealthMetric.timestamp >= start_dt)
    if end_date:
        end_dt = datetime.fromisoformat(end_date)
        query_metric = query_metric.filter(HealthMetric.timestamp <= end_dt)
        query_phase = query_phase.filter(HealthMetric.timestamp <= end_dt)

    metric_data = [(row.timestamp, row.value) for row in query_metric.all()]
    phase_data = [(row.timestamp, row.value_text) for row in query_phase.all()]

    if not metric_data:
        raise HTTPException(status_code=404, detail=f"No data found for '{metric_name}'")
    if not phase_data:
        raise HTTPException(status_code=404, detail="No cycle phase data found")

    # Analyze by phase
    analysis = group_by_cycle_phase(metric_data, phase_data)

    return {
        "metric": {
            "name": metric_name,
            "display_name": metric_type.display_name,
            "unit": metric_type.unit
        },
        "cycle_analysis": analysis,
        "insights": generate_cycle_insights(analysis, metric_type.display_name)
    }


def generate_cycle_insights(analysis: dict, metric_name: str) -> List[str]:
    """Generate human-readable insights from cycle analysis"""
    if "error" in analysis:
        return []

    insights = []
    overall_mean = analysis.get('overall', {}).get('mean', 0)

    # Find highest and lowest phases
    phases = {k: v for k, v in analysis.items() if k != 'overall'}
    if phases:
        highest_phase = max(phases.items(), key=lambda x: x[1]['mean'])
        lowest_phase = min(phases.items(), key=lambda x: x[1]['mean'])

        insights.append(
            f"{metric_name} is highest during {highest_phase[0]} phase "
            f"({highest_phase[1]['mean']:.2f}, {highest_phase[1]['percent_diff_from_avg']:+.1f}% vs average)"
        )
        insights.append(
            f"{metric_name} is lowest during {lowest_phase[0]} phase "
            f"({lowest_phase[1]['mean']:.2f}, {lowest_phase[1]['percent_diff_from_avg']:+.1f}% vs average)"
        )

        # Check for significant variations
        for phase, stats in phases.items():
            if abs(stats['percent_diff_from_avg']) > 10:
                direction = "higher" if stats['percent_diff_from_avg'] > 0 else "lower"
                insights.append(
                    f"During {phase} phase, {metric_name} is {abs(stats['percent_diff_from_avg']):.1f}% "
                    f"{direction} than your overall average"
                )

    return insights


@router.get("/summary")
async def get_analytics_summary(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    Get a summary of key metrics and trends for the specified period

    Example: /api/analytics/summary?days=30
    """
    start_date = datetime.now() - timedelta(days=days)

    # Get HRV summary
    hrv_type = db.query(MetricType).filter(MetricType.name == "hrv_sdnn").first()
    hrv_data = []
    if hrv_type:
        hrv_data = [
            (row.timestamp, row.value)
            for row in db.query(HealthMetric.timestamp, HealthMetric.value).filter(
                and_(
                    HealthMetric.user_id == settings.default_user_id,
                    HealthMetric.metric_type_id == hrv_type.id,
                    HealthMetric.timestamp >= start_date,
                    HealthMetric.value.isnot(None)
                )
            ).all()
        ]

    summary = {
        "period_days": days,
        "start_date": start_date.isoformat(),
        "end_date": datetime.now().isoformat()
    }

    if hrv_data:
        hrv_trend = detect_trend(hrv_data, min_periods=7)
        summary["hrv"] = {
            "data_points": len(hrv_data),
            "trend": hrv_trend.get("trend", "unknown"),
            "interpretation": hrv_trend.get("interpretation")
        }

    return summary
