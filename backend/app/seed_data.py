"""Seed database with initial metric types"""
from sqlalchemy.orm import Session
from .models import MetricType, User, DataType
from .database import SessionLocal, engine, Base


METRIC_TYPES = [
    # Recovery Metrics
    {
        "name": "hrv_sdnn",
        "display_name": "Heart Rate Variability (SDNN)",
        "unit": "ms",
        "category": "recovery",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 20, "max": 200, "optimal": 50}
    },
    {
        "name": "resting_heart_rate",
        "display_name": "Resting Heart Rate",
        "unit": "bpm",
        "category": "recovery",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 40, "max": 100, "optimal": 60}
    },
    {
        "name": "sleep_duration",
        "display_name": "Sleep Duration",
        "unit": "hours",
        "category": "recovery",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 6, "max": 10, "optimal": 8}
    },

    # Cycle Metrics
    {
        "name": "cycle_start_date",
        "display_name": "Cycle Start Date",
        "unit": "date",
        "category": "cycle",
        "data_type": DataType.CATEGORICAL,
        "normal_range": {}
    },
    {
        "name": "cycle_length",
        "display_name": "Cycle Length",
        "unit": "days",
        "category": "cycle",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 21, "max": 35, "optimal": 28}
    },
    {
        "name": "cycle_phase",
        "display_name": "Cycle Phase",
        "unit": "categorical",
        "category": "cycle",
        "data_type": DataType.CATEGORICAL,
        "normal_range": {}
    },
    {
        "name": "cycle_day",
        "display_name": "Day of Cycle",
        "unit": "day",
        "category": "cycle",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 1, "max": 35}
    },

    # Lab Metrics - Metabolic
    {
        "name": "glucose_fasting",
        "display_name": "Fasting Glucose",
        "unit": "mg/dL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 65, "max": 99, "optimal": 85}
    },
    {
        "name": "hemoglobin_a1c",
        "display_name": "Hemoglobin A1c",
        "unit": "%",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 4.0, "max": 5.6, "optimal": 5.0}
    },
    {
        "name": "insulin_fasting",
        "display_name": "Fasting Insulin",
        "unit": "uIU/mL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 2, "max": 18.4, "optimal": 6}
    },

    # Lab Metrics - Lipids
    {
        "name": "cholesterol_total",
        "display_name": "Total Cholesterol",
        "unit": "mg/dL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 100, "max": 199, "optimal": 170}
    },
    {
        "name": "cholesterol_ldl",
        "display_name": "LDL Cholesterol",
        "unit": "mg/dL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 50, "max": 99, "optimal": 80}
    },
    {
        "name": "cholesterol_hdl",
        "display_name": "HDL Cholesterol",
        "unit": "mg/dL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 40, "max": 100, "optimal": 60}
    },
    {
        "name": "triglycerides",
        "display_name": "Triglycerides",
        "unit": "mg/dL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 50, "max": 149, "optimal": 100}
    },

    # Lab Metrics - Thyroid
    {
        "name": "tsh",
        "display_name": "Thyroid Stimulating Hormone (TSH)",
        "unit": "mIU/L",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 0.4, "max": 4.5, "optimal": 2.0}
    },
    {
        "name": "t4_total",
        "display_name": "Total T4 (Thyroxine)",
        "unit": "mcg/dL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 5.1, "max": 11.9, "optimal": 8.0}
    },
    {
        "name": "thyroid_peroxidase_ab",
        "display_name": "Thyroid Peroxidase Antibodies",
        "unit": "IU/mL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 0, "max": 9, "optimal": 0}
    },
    {
        "name": "thyroglobulin_ab",
        "display_name": "Thyroglobulin Antibodies",
        "unit": "IU/mL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 0, "max": 1, "optimal": 0}
    },

    # Lab Metrics - Other
    {
        "name": "vitamin_d",
        "display_name": "Vitamin D (25-OH)",
        "unit": "ng/mL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 30, "max": 100, "optimal": 50}
    },
    {
        "name": "wbc_count",
        "display_name": "White Blood Cell Count",
        "unit": "Thousand/uL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 3.8, "max": 10.8, "optimal": 7.0}
    },
    {
        "name": "creatinine",
        "display_name": "Creatinine",
        "unit": "mg/dL",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 0.5, "max": 0.99, "optimal": 0.75}
    },
    {
        "name": "egfr",
        "display_name": "Estimated Glomerular Filtration Rate",
        "unit": "mL/min/1.73m2",
        "category": "lab_result",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 60, "max": 120, "optimal": 90}
    },

    # Fitness Metrics (placeholders for future)
    {
        "name": "vo2_max",
        "display_name": "VO2 Max",
        "unit": "ml/kg/min",
        "category": "fitness",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 20, "max": 60, "optimal": 40}
    },
    {
        "name": "training_load",
        "display_name": "Training Load",
        "unit": "arbitrary units",
        "category": "fitness",
        "data_type": DataType.NUMERIC,
        "normal_range": {"min": 0, "max": 1000}
    },
]


def seed_database():
    """Seed the database with initial data"""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created/verified\n")

    db = SessionLocal()

    try:
        # Create default user
        default_user = db.query(User).filter(User.id == "user_001").first()
        if not default_user:
            default_user = User(
                id="user_001",
                email="user@healthops.local",
                preferences={"theme": "light", "units": "imperial"}
            )
            db.add(default_user)
            print("✓ Created default user")

        # Seed metric types
        for metric_data in METRIC_TYPES:
            existing = db.query(MetricType).filter(
                MetricType.name == metric_data["name"]
            ).first()

            if not existing:
                metric = MetricType(**metric_data)
                db.add(metric)
                print(f"✓ Added metric type: {metric_data['name']}")

        db.commit()
        print(f"\n✅ Database seeded successfully! Added {len(METRIC_TYPES)} metric types.")

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
