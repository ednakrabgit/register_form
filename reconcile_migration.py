import pyodbc
import sys

CONN_STR = 'DRIVER={ODBC Driver 18 for SQL Server};SERVER=127.0.0.1,14333;UID=sa;PWD=Pass@456981@XKTT;DATABASE=thaiairp_iptc;TrustServerCertificate=yes;'

def run_reconciliation():
    try:
        conn = pyodbc.connect(CONN_STR)
        cur = conn.cursor()
    except Exception as e:
        print(f"Cannot connect to MSSQL on 127.0.0.1:14333: {e}")
        return

    print("=" * 70)
    print("      DATA MIGRATION RECONCILIATION & AUDIT REPORT")
    print("      Viriyah Online Learning & Registration System")
    print("=" * 70)

    checks = [
        ("1. Total Unique Persons (person)", "SELECT COUNT(*) FROM person", 3958),
        ("2. Total Registrations (personregistration)", "SELECT COUNT(*) FROM personregistration", 4866),
        ("3. Total Legacy Register (register)", "SELECT COUNT(*) FROM register", 4866),
        ("4. Total Person Addresses (personaddress)", "SELECT COUNT(*) FROM personaddress", 4845),
        ("5. Total License Records (personlicense)", "SELECT COUNT(*) FROM personlicense", 3958),
        ("6. Total Affiliation Records (personaffiliation)", "SELECT COUNT(*) FROM personaffiliation", 3958),
        ("7. Total Course Enrollments (personcourse)", "SELECT COUNT(*) FROM personcourse", 22982),
        ("8. Total Sales Areas (personothersalesarea)", "SELECT COUNT(*) FROM personothersalesarea", 3279),
        ("9. Total Other Companies (personothercompanies)", "SELECT COUNT(*) FROM personothercompanies", 3977),
        ("10. Total Specialties (personotherspecialty)", "SELECT COUNT(*) FROM personotherspecialty", 3759),
        ("11. Orphan Addresses (No Person Parent)", "SELECT COUNT(*) FROM personaddress a LEFT JOIN person p ON a.NationId = p.NationId WHERE p.NationId IS NULL", 0),
        ("12. Orphan Licenses (No Person Parent)", "SELECT COUNT(*) FROM personlicense l LEFT JOIN person p ON l.NationId = p.NationId WHERE p.NationId IS NULL", 0),
        ("13. Orphan Affiliations (No Person Parent)", "SELECT COUNT(*) FROM personaffiliation af LEFT JOIN person p ON af.NationId = p.NationId WHERE p.NationId IS NULL", 0),
        ("14. Orphan Courses (No Person Parent)", "SELECT COUNT(*) FROM personcourse c LEFT JOIN person p ON c.NationId = p.NationId WHERE p.NationId IS NULL", 0),
        ("15. Invalid NationId (Non-13 digits)", "SELECT COUNT(*) FROM person WHERE LEN(NationId) <> 13 OR NationId NOT LIKE '[0-9]%'", 0)
    ]

    all_passed = True
    for title, sql, expected in checks:
        try:
            cur.execute(sql)
            actual = cur.fetchone()[0]
            passed = (actual == expected) if expected is not None else True
            badge = "PASSED [OK]" if passed else f"FAILED [Expected: {expected}, Got: {actual}]"
            print(f"  {title:<50} : {actual:>7} | {badge}")
            if not passed:
                all_passed = False
        except Exception as e:
            print(f"  {title:<50} : ERROR ({e})")
            all_passed = False

    print("-" * 70)
    if all_passed:
        print("  >>> AUDIT SUMMARY: ALL 15 RECONCILIATION CHECKS PASSED (100%) <<<")
    else:
        print("  >>> AUDIT SUMMARY: SOME CHECKS FAILED - PLEASE REVIEW LOGS <<<")
    print("=" * 70)

if __name__ == '__main__':
    run_reconciliation()
