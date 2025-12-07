"""PDF parser for lab reports using LLM extraction"""
import PyPDF2
import pdfplumber
from anthropic import Anthropic
from typing import List, Dict, Any
import json
import re
from ..config import get_settings

settings = get_settings()


def extract_pdf_text(file_path: str) -> str:
    """
    Extract text from PDF using pdfplumber (better for tables)
    Fallback to PyPDF2 if pdfplumber fails
    """
    try:
        # Try pdfplumber first (better for structured lab reports)
        with pdfplumber.open(file_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception:
        # Fallback to PyPDF2
        try:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            return text
        except Exception as e:
            raise ValueError(f"Failed to extract PDF text: {str(e)}")


def parse_lab_pdf_with_llm(file_path: str) -> List[Dict[str, Any]]:
    """
    Parse lab report PDF using Claude AI for structured extraction

    Returns:
    - List of lab metrics with values, units, and reference ranges
    """
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured. Cannot parse PDF.")

    # Extract text from PDF
    pdf_text = extract_pdf_text(file_path)

    # Prepare prompt for Claude
    prompt = f"""You are a medical data extraction assistant. Extract ALL lab test results from this Quest Diagnostics lab report.

Return a JSON array with this exact structure for EVERY test result you find:
[
  {{
    "metric_name": "glucose_fasting",
    "display_name": "Glucose (Fasting)",
    "value": 99,
    "unit": "mg/dL",
    "reference_range": "65-99",
    "status": "normal",
    "panel": "Comprehensive Metabolic Panel"
  }},
  ...
]

IMPORTANT:
1. Convert all metric names to snake_case (e.g., "TSH" → "tsh", "LDL Cholesterol" → "cholesterol_ldl")
2. For "status", use: "normal", "high", "low", or "see_note"
3. Extract the numeric value only (no units in the value field)
4. Include EVERY test from ALL panels in the report
5. If a test has "H" marker, status is "high". "L" marker means "low"
6. Return ONLY valid JSON, no additional text

Lab Report Text:
{pdf_text}
"""

    try:
        # Call Claude API
        client = Anthropic(api_key=settings.anthropic_api_key)

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Extract JSON from response
        response_text = message.content[0].text

        # Try to find JSON in the response
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if json_match:
            lab_results = json.loads(json_match.group())
        else:
            lab_results = json.loads(response_text)

        # Convert to our internal format
        records = []
        for result in lab_results:
            records.append({
                'metric_name': result['metric_name'],
                'value': result.get('value'),
                'unit': result.get('unit'),
                'metadata': {
                    'display_name': result.get('display_name'),
                    'reference_range': result.get('reference_range'),
                    'status': result.get('status'),
                    'panel': result.get('panel', 'Unknown'),
                    'extraction_method': 'llm'
                }
            })

        return records

    except Exception as e:
        raise ValueError(f"Failed to parse lab PDF with LLM: {str(e)}")


def parse_lab_pdf_fallback(file_path: str) -> List[Dict[str, Any]]:
    """
    Fallback regex-based parser for Quest Diagnostics PDFs
    Use this if LLM parsing fails or API key is not available
    """
    # This is a simplified version - real implementation would need robust regex patterns
    text = extract_pdf_text(file_path)

    # Pattern to match: METRIC_NAME   VALUE   Reference Range: X-Y unit
    pattern = r'([A-Z][A-Z\s,\(\)]+)\s+(\d+\.?\d*)\s+(?:H|L)?\s+Reference Range:\s*([\d\.\-<>= ]+)\s*(\w+/?[\w\d]*)'

    matches = re.findall(pattern, text)

    records = []
    for match in matches:
        metric_display = match[0].strip()
        value = float(match[1])
        ref_range = match[2].strip()
        unit = match[3].strip()

        # Convert display name to snake_case
        metric_name = metric_display.lower().replace(' ', '_').replace(',', '').replace('(', '').replace(')', '')

        records.append({
            'metric_name': metric_name,
            'value': value,
            'unit': unit,
            'metadata': {
                'display_name': metric_display,
                'reference_range': ref_range,
                'extraction_method': 'regex'
            }
        })

    return records
