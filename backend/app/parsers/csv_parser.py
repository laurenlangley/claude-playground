"""CSV parser for Apple Health HRV data"""
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any


def parse_hrv_csv(file_path: str) -> List[Dict[str, Any]]:
    """
    Parse Apple Health HRV CSV export

    Expected format:
    - creationDate, startDate, endDate, value, unit
    - Dates in format: "YYYY-MM-DD HH:MM:SS ±HHMM"
    - Values in milliseconds (ms)

    Returns:
    - List of dicts with: {date, value_avg, count}
    """
    try:
        # Read CSV
        df = pd.read_csv(file_path)

        # Parse startDate to datetime
        df['timestamp'] = pd.to_datetime(df['startDate'], format='%Y-%m-%d %H:%M:%S %z', utc=True)

        # Extract date only for grouping
        df['date'] = df['timestamp'].dt.date

        # Calculate daily average
        daily_hrv = df.groupby('date').agg({
            'value': ['mean', 'count', 'std', 'min', 'max'],
            'timestamp': 'first'  # Use first reading's timestamp for the day
        }).reset_index()

        # Flatten column names
        daily_hrv.columns = ['date', 'value_avg', 'count', 'value_std', 'value_min', 'value_max', 'timestamp']

        # Convert to records
        records = []
        for _, row in daily_hrv.iterrows():
            records.append({
                'timestamp': row['timestamp'],
                'value': round(row['value_avg'], 2),
                'metadata': {
                    'count': int(row['count']),
                    'std': round(row['value_std'], 2) if pd.notna(row['value_std']) else None,
                    'min': round(row['value_min'], 2),
                    'max': round(row['value_max'], 2),
                    'aggregation': 'daily_average'
                }
            })

        return records

    except Exception as e:
        raise ValueError(f"Failed to parse HRV CSV: {str(e)}")


def detect_csv_type(file_path: str) -> str:
    """
    Detect the type of CSV file based on column headers

    Returns: "hrv", "sleep", "workout", "unknown"
    """
    try:
        df = pd.read_csv(file_path, nrows=1)
        columns = set(df.columns.str.lower())

        # HRV data has these specific columns
        if 'creationdate' in columns and 'value' in columns and 'unit' in columns:
            return "hrv"

        # Add more detection logic as we support more CSV types
        return "unknown"

    except Exception:
        return "unknown"
