from pathlib import Path
import pymysql
from config.settings import Settings


def main():
    source = "\n".join(line for line in Path(__file__).with_name("schema.sql").read_text(encoding="utf-8").splitlines() if not line.lstrip().startswith("--"))
    connection = pymysql.connect(host=Settings.DB_HOST, port=Settings.DB_PORT, user=Settings.DB_USER, password=Settings.DB_PASSWORD, autocommit=True)
    try:
        with connection.cursor() as cursor:
            for statement in (item.strip() for item in source.split(";") if item.strip()): cursor.execute(statement)
    finally:
        connection.close()
    print(f"EBC database initialized: {Settings.DB_NAME}")


if __name__ == "__main__": main()
