"""Parser for menstrual cycle tracking data"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import re


def calculate_cycle_phase(cycle_day: int, cycle_length: int) -> str:
    """
    Calculate cycle phase based on day and total cycle length.
    Phases are calculated dynamically based on individual cycle length.

    Args:
        cycle_day: Day number in the cycle (1-based)
        cycle_length: Total length of this cycle in days

    Returns:
        One of: "menstrual", "follicular", "ovulatory", "luteal"

    Logic (Dr. Stacy Sims-aligned):
    - Menstrual: Days 1-5
    - Follicular: From end of menstrual to ovulation
    - Ovulatory: 2-3 days around ovulation (mid-cycle)
    - Luteal: From end of ovulation to next cycle

    Ovulation typically occurs ~14 days before next period starts
    """
    if cycle_day <= 5:
        return "menstrual"

    # Estimate ovulation day (typically 14 days before cycle ends)
    ovulation_day = max(cycle_length - 14, 10)  # Safeguard for short cycles

    if cycle_day <= ovulation_day - 2:
        return "follicular"
    elif cycle_day <= ovulation_day + 1:
        return "ovulatory"
    else:
        return "luteal"


def parse_cycle_txt(file_path: str) -> List[Dict[str, Any]]:
    """
    Parse menstrual cycle tracking TXT file (markdown table format)

    Expected format:
    | Period Start Date | Days Between Cycle |
    |:--|:--|
    | Day MM/DD/YYYY | ## |

    Returns:
    - List of daily records with cycle metrics for each day
    """
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()

        # Skip header lines (first 2 lines are table headers)
        data_lines = [line.strip() for line in lines[2:] if line.strip()]

        cycle_starts = []

        # Parse each cycle start
        for line in data_lines:
            # Extract data from markdown table row: | Day MM/DD/YYYY | ## |
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 2:
                date_str = parts[0]  # "Day MM/DD/YYYY"
                cycle_length_str = parts[1]  # "##"

                # Extract date using regex
                date_match = re.search(r'(\d{1,2}/\d{1,2}/\d{4})', date_str)
                if date_match:
                    date = datetime.strptime(date_match.group(1), '%m/%d/%Y')
                    cycle_length = int(cycle_length_str)

                    cycle_starts.append({
                        'start_date': date,
                        'cycle_length': cycle_length
                    })

        # Generate daily records with cycle metrics
        records = []

        for i, cycle in enumerate(cycle_starts):
            start_date = cycle['start_date']
            cycle_length = cycle['cycle_length']

            # Generate daily records for this cycle
            for day_num in range(1, cycle_length + 1):
                current_date = start_date + timedelta(days=day_num - 1)
                phase = calculate_cycle_phase(day_num, cycle_length)

                records.append({
                    'timestamp': current_date,
                    'metrics': [
                        {
                            'metric_name': 'cycle_day',
                            'value': day_num,
                            'metadata': {'cycle_length': cycle_length}
                        },
                        {
                            'metric_name': 'cycle_phase',
                            'value_text': phase,
                            'metadata': {'cycle_length': cycle_length}
                        }
                    ]
                })

            # Add cycle start marker
            records.append({
                'timestamp': start_date,
                'metrics': [
                    {
                        'metric_name': 'cycle_start_date',
                        'value_text': start_date.strftime('%Y-%m-%d'),
                        'metadata': {}
                    },
                    {
                        'metric_name': 'cycle_length',
                        'value': cycle_length,
                        'metadata': {}
                    }
                ]
            })

        return records

    except Exception as e:
        raise ValueError(f"Failed to parse cycle TXT file: {str(e)}")


def get_current_cycle_phase(cycle_data: List[Dict], target_date: datetime) -> Tuple[str, int]:
    """
    Get the cycle phase for a specific date

    Args:
        cycle_data: List of cycle records from parse_cycle_txt
        target_date: Date to check

    Returns:
        Tuple of (phase, cycle_day)
    """
    for record in cycle_data:
        if record['timestamp'].date() == target_date.date():
            for metric in record.get('metrics', []):
                if metric['metric_name'] == 'cycle_phase':
                    day_metric = next(
                        (m for m in record['metrics'] if m['metric_name'] == 'cycle_day'),
                        None
                    )
                    cycle_day = day_metric['value'] if day_metric else 0
                    return (metric['value_text'], cycle_day)

    return ("unknown", 0)
