from pathlib import Path

import pymysql

from config.settings import Settings


def main() -> None:
    schema_path = Path(__file__).with_name("schema.sql")
    source = "\n".join(
        line for line in schema_path.read_text(encoding="utf-8").splitlines()
        if not line.lstrip().startswith("--")
    )
    statements = [statement.strip() for statement in source.split(";") if statement.strip()]
    connection = pymysql.connect(
        host=Settings.DB_HOST,
        port=Settings.DB_PORT,
        user=Settings.DB_USER,
        password=Settings.DB_PASSWORD,
        autocommit=True,
    )
    try:
        with connection.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)
    finally:
        connection.close()
    print(f"MPD database initialized: {Settings.DB_NAME}")


if __name__ == "__main__":
    main()
