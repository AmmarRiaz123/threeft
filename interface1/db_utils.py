import psycopg2
import configparser

def read_db_config(filename="config.ini", section="postgresql"):
    parser = configparser.ConfigParser()
    parser.read(filename)
    if parser.has_section(section):
        return {param[0]: param[1] for param in parser.items(section)}
    else:
        raise Exception(f"Section {section} not found in {filename}")

def save_to_postgres(data):
    config = read_db_config()
    try:
        conn = psycopg2.connect(**config)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cnic_data (
                id SERIAL PRIMARY KEY,
                name TEXT,
                father_name TEXT,
                cnic_number TEXT,
                dob TEXT,
                issue_date TEXT,
                expiry_date TEXT,
                gender TEXT
            )
        ''')
        cursor.execute('''
            INSERT INTO cnic_data (name, father_name, cnic_number, dob, issue_date, expiry_date, gender)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (
            data.get("name", ""),
            data.get("father_name", ""),
            data.get("cnic_number", ""),
            data.get("dob", ""),
            data.get("issue_date", ""),
            data.get("expiry_date", ""),
            data.get("gender", "")
        ))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to save to PostgreSQL: {str(e)}")
