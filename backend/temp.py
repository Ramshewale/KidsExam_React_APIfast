from database import engine
from sqlalchemy import text, inspect

def inspect_test_results_table():
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("test_results")]
    print(f"\n[1] Columns currently in 'test_results' table:\n    {columns}")

    has_duration = "duration_seconds" in columns
    print(f"\n[2] Does 'duration_seconds' exist? -> {has_duration}")

    with engine.connect() as conn:
        if not has_duration:
            print("\n[3] Adding missing column 'duration_seconds'...")
            conn.execute(text("ALTER TABLE test_results ADD COLUMN duration_seconds INTEGER DEFAULT 0;"))
            conn.commit()
            print("    -> Successfully added 'duration_seconds' with default 0.")

        # Update any pre-existing rows where duration_seconds is NULL to 0
        conn.execute(text("UPDATE test_results SET duration_seconds = 0 WHERE duration_seconds IS NULL;"))
        conn.commit()

        # Check existing records
        rows = conn.execute(text("SELECT id, student_id, chapter_id, score, percentage, duration_seconds FROM test_results LIMIT 5;")).fetchall()
        print(f"\n[4] Sample rows in 'test_results' (up to 5):")
        for r in rows:
            print(f"    ID: {r[0]} | Student: {r[1]} | Chapter: {r[2]} | Score: {r[3]} ({r[4]}%) | Duration: {r[5]}s")

if __name__ == "__main__":
    inspect_test_results_table()