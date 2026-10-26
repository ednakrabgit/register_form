import sqlite3

def check_and_fix_ids():
    conn = sqlite3.connect('dotnet/backend/app.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall() if not row[0].startswith('sqlite_')]
    
    for t in tables:
        cursor.execute(f"PRAGMA table_info({t})")
        cols = [col[1] for col in cursor.fetchall()]
        
        # Check if 'id' or other PK column is null
        pk_cols = [c for c in ['id', 'person_id', 'person_course_id', 'registration_id', 'log_id', 'sys_id'] if c in cols]
        for pk in pk_cols:
            cursor.execute(f"SELECT COUNT(*) FROM {t} WHERE {pk} IS NULL")
            null_count = cursor.fetchone()[0]
            if null_count > 0:
                print(f"Table '{t}' has {null_count} rows where '{pk}' IS NULL! Fixing...")
                # Update null ids with rowid
                cursor.execute(f"UPDATE {t} SET {pk} = rowid WHERE {pk} IS NULL")
                conn.commit()
                print(f"Fixed '{t}.{pk}' using rowid.")
                
    conn.close()

if __name__ == "__main__":
    check_and_fix_ids()
