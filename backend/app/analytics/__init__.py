"""Statistical analysis utilities for health metrics"""
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta
from scipy import stats


def calculate_correlation(
    data_x: List[Tuple[datetime, float]],
    data_y: List[Tuple[datetime, float]],
    method: str = "pearson"
) -> Dict[str, Any]:
    """
    Calculate correlation between two metric time series

    Args:
        data_x: List of (timestamp, value) tuples for first metric
        data_y: List of (timestamp, value) tuples for second metric
        method: "pearson", "spearman", or "kendall"

    Returns:
        Dict with correlation coefficient, p-value, and sample size
    """
    # Convert to DataFrames
    df_x = pd.DataFrame(data_x, columns=['timestamp', 'value_x'])
    df_y = pd.DataFrame(data_y, columns=['timestamp', 'value_y'])

    # Align by date (inner join on date)
    df_x['date'] = pd.to_datetime(df_x['timestamp']).dt.date
    df_y['date'] = pd.to_datetime(df_y['timestamp']).dt.date

    merged = df_x.merge(df_y, on='date', how='inner')

    if len(merged) < 3:
        return {
            "correlation": None,
            "p_value": None,
            "sample_size": len(merged),
            "error": "Insufficient overlapping data points (need at least 3)"
        }

    # Calculate correlation
    if method == "pearson":
        corr, p_value = stats.pearsonr(merged['value_x'], merged['value_y'])
    elif method == "spearman":
        corr, p_value = stats.spearmanr(merged['value_x'], merged['value_y'])
    elif method == "kendall":
        corr, p_value = stats.kendalltau(merged['value_x'], merged['value_y'])
    else:
        raise ValueError(f"Unknown correlation method: {method}")

    return {
        "correlation": float(corr),
        "p_value": float(p_value),
        "sample_size": len(merged),
        "method": method,
        "interpretation": interpret_correlation(corr, p_value)
    }


def interpret_correlation(corr: float, p_value: float) -> str:
    """Interpret correlation strength and significance"""
    if p_value > 0.05:
        return "No significant correlation (p > 0.05)"

    abs_corr = abs(corr)
    if abs_corr >= 0.7:
        strength = "strong"
    elif abs_corr >= 0.4:
        strength = "moderate"
    elif abs_corr >= 0.2:
        strength = "weak"
    else:
        return "No meaningful correlation"

    direction = "positive" if corr > 0 else "negative"
    return f"Significant {strength} {direction} correlation"


def calculate_moving_average(
    data: List[Tuple[datetime, float]],
    window_days: int = 7
) -> List[Dict[str, Any]]:
    """
    Calculate moving average for a metric

    Args:
        data: List of (timestamp, value) tuples
        window_days: Window size in days

    Returns:
        List of dicts with timestamp, value, and moving_average
    """
    df = pd.DataFrame(data, columns=['timestamp', 'value'])
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')

    # Calculate rolling mean
    df['moving_average'] = df['value'].rolling(
        window=window_days,
        min_periods=1
    ).mean()

    return [
        {
            'timestamp': row['timestamp'].isoformat(),
            'value': float(row['value']),
            'moving_average': float(row['moving_average'])
        }
        for _, row in df.iterrows()
    ]


def detect_trend(
    data: List[Tuple[datetime, float]],
    min_periods: int = 7
) -> Dict[str, Any]:
    """
    Detect linear trend in time series data

    Args:
        data: List of (timestamp, value) tuples
        min_periods: Minimum data points required

    Returns:
        Dict with slope, trend direction, and R-squared
    """
    if len(data) < min_periods:
        return {
            "error": f"Insufficient data (need at least {min_periods} points)",
            "sample_size": len(data)
        }

    df = pd.DataFrame(data, columns=['timestamp', 'value'])
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')

    # Convert timestamps to numeric (days since first measurement)
    df['days'] = (df['timestamp'] - df['timestamp'].min()).dt.days

    # Linear regression
    slope, intercept, r_value, p_value, std_err = stats.linregress(
        df['days'],
        df['value']
    )

    # Determine trend direction
    if p_value > 0.05:
        trend = "stable"
    elif slope > 0:
        trend = "increasing"
    else:
        trend = "decreasing"

    return {
        "slope": float(slope),
        "intercept": float(intercept),
        "r_squared": float(r_value ** 2),
        "p_value": float(p_value),
        "trend": trend,
        "sample_size": len(data),
        "interpretation": f"Metric is {trend} (slope: {slope:.4f}/day, R²: {r_value**2:.3f})"
    }


def group_by_cycle_phase(
    metric_data: List[Tuple[datetime, float]],
    cycle_phase_data: List[Tuple[datetime, str]]
) -> Dict[str, Any]:
    """
    Group metric values by menstrual cycle phase

    Args:
        metric_data: List of (timestamp, value) tuples for the metric
        cycle_phase_data: List of (timestamp, phase) tuples

    Returns:
        Dict with stats for each cycle phase
    """
    # Convert to DataFrames
    df_metric = pd.DataFrame(metric_data, columns=['timestamp', 'value'])
    df_phase = pd.DataFrame(cycle_phase_data, columns=['timestamp', 'phase'])

    # Align by date
    df_metric['date'] = pd.to_datetime(df_metric['timestamp']).dt.date
    df_phase['date'] = pd.to_datetime(df_phase['timestamp']).dt.date

    merged = df_metric.merge(df_phase, on='date', how='inner')

    if len(merged) == 0:
        return {"error": "No overlapping data between metric and cycle phases"}

    # Group by phase
    grouped = merged.groupby('phase')['value'].agg([
        'count', 'mean', 'std', 'min', 'max'
    ]).to_dict('index')

    # Calculate comparison (% difference from overall mean)
    overall_mean = merged['value'].mean()

    results = {}
    for phase, stats_dict in grouped.items():
        phase_mean = stats_dict['mean']
        results[phase] = {
            "count": int(stats_dict['count']),
            "mean": float(phase_mean),
            "std": float(stats_dict['std']) if pd.notna(stats_dict['std']) else None,
            "min": float(stats_dict['min']),
            "max": float(stats_dict['max']),
            "percent_diff_from_avg": float((phase_mean - overall_mean) / overall_mean * 100)
        }

    # Add overall stats
    results['overall'] = {
        "mean": float(overall_mean),
        "sample_size": len(merged)
    }

    return results


def calculate_percentile_rank(value: float, data: List[float]) -> float:
    """Calculate percentile rank of a value within a dataset"""
    return float(stats.percentileofscore(data, value, kind='rank'))


def detect_anomalies(
    data: List[Tuple[datetime, float]],
    std_threshold: float = 2.0
) -> List[Dict[str, Any]]:
    """
    Detect anomalous values using standard deviation method

    Args:
        data: List of (timestamp, value) tuples
        std_threshold: Number of standard deviations for anomaly threshold

    Returns:
        List of anomalous data points with details
    """
    df = pd.DataFrame(data, columns=['timestamp', 'value'])

    mean = df['value'].mean()
    std = df['value'].std()

    # Find anomalies
    df['z_score'] = (df['value'] - mean) / std
    df['is_anomaly'] = abs(df['z_score']) > std_threshold

    anomalies = df[df['is_anomaly']].copy()

    return [
        {
            'timestamp': row['timestamp'].isoformat() if isinstance(row['timestamp'], datetime) else row['timestamp'],
            'value': float(row['value']),
            'z_score': float(row['z_score']),
            'direction': 'high' if row['z_score'] > 0 else 'low'
        }
        for _, row in anomalies.iterrows()
    ]
