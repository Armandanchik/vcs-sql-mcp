"""
VCS SQL MCP Server
==================
Read-only MCP serveris, kuris leidžia Claude prisijungti prie MySQL bazės
per custom connector (remote MCP, Streamable HTTP).

Naudojimas:
    python server.py

Aplinkos kintamieji (žr. .env.example):
    MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
    MCP_PATH   - slaptas kelias, pvz. /sql/a7f3c9d2e1b4/mcp
    MAX_ROWS   - kiek daugiausiai eilučių grąžinti (numatyta 500)
    PORT       - Railway/Render nustato automatiškai
"""

import os
import re
import logging

import pymysql
from fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("vcs-mcp")

# --------------------------------------------------------------------------
# Konfigūracija
# --------------------------------------------------------------------------

MAX_ROWS = int(os.environ.get("MAX_ROWS", "500"))
MCP_PATH = os.environ.get("MCP_PATH", "/mcp")
PORT = int(os.environ.get("PORT", "8000"))


def db_config() -> dict:
    return dict(
        host=os.environ.get("MYSQL_HOST", "localhost"),
        port=int(os.environ.get("MYSQL_PORT", "3306")),
        user=os.environ.get("MYSQL_USER", "readonly"),
        password=os.environ.get("MYSQL_PASSWORD", ""),
        database=os.environ.get("MYSQL_DATABASE", ""),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=10,
        read_timeout=30,
        autocommit=True,
    )


def fetch(sql: str, params=None) -> list[dict]:
    """Vienas prisijungimas vienai užklausai. Paprasta ir saugu klasei."""
    conn = pymysql.connect(**db_config())
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            rows = cur.fetchall()
    finally:
        conn.close()
    return list(rows)


# --------------------------------------------------------------------------
# SQL apsaugos
#
# Tikroji apsauga yra read-only MySQL vartotojas. Šie patikrinimai yra
# antras sluoksnis, kad klaida grįžtų aiškiu tekstu, o ne DB klaida.
# --------------------------------------------------------------------------

BLOCKED = re.compile(
    r"\b(insert|update|delete|drop|alter|create|truncate|rename|grant|revoke|"
    r"replace|call|load\s+data|into\s+outfile|handler|lock\s+tables)\b",
    re.IGNORECASE,
)

STRING_LITERAL = re.compile(r"'(?:[^'\\]|\\.|'')*'|\"(?:[^\"\\]|\\.|\"\")*\"")

SAFE_NAME = re.compile(r"^[A-Za-z0-9_]+$")


def guard_sql(sql: str) -> str:
    """Patikrina, kad užklausa yra tik skaitymo, ir prideda LIMIT jei jo nėra."""
    sql = sql.strip().rstrip(";").strip()

    if not sql:
        raise ValueError("Tuščia užklausa.")

    if ";" in sql:
        raise ValueError(
            "Leidžiama tik viena užklausa. Pašalinkite kabliataškį ir viską po jo."
        )

    if not re.match(r"^\s*(select|with|show|describe|desc|explain)\b", sql, re.IGNORECASE):
        raise ValueError(
            "Leidžiamos tik SELECT, WITH, SHOW, DESCRIBE ir EXPLAIN užklausos. "
            "Ši bazė yra tik skaitymui."
        )

    # Tekstines reikšmes išmetame, kad žodis kabutėse (pvz. LIKE '%create%')
    # nebūtų palaikytas komanda.
    without_literals = STRING_LITERAL.sub("''", sql)

    hit = BLOCKED.search(without_literals)
    if hit:
        raise ValueError(
            f"Užklausoje rasta neleidžiama komanda: {hit.group(0).upper()}. "
            "Ši bazė yra tik skaitymui."
        )

    if re.match(r"^\s*(select|with)\b", sql, re.IGNORECASE) and not re.search(
        r"\blimit\b", sql, re.IGNORECASE
    ):
        sql = f"{sql} LIMIT {MAX_ROWS}"

    return sql


def check_table_name(name: str) -> str:
    if not SAFE_NAME.match(name or ""):
        raise ValueError(f"Netinkamas lentelės pavadinimas: {name!r}")
    return name


# --------------------------------------------------------------------------
# MCP serveris
# --------------------------------------------------------------------------

mcp = FastMCP(
    name="VCS SQL",
    instructions=(
        "Prieiga tik skaitymui prie VCS mokomosios MySQL duomenų bazės. "
        "Prieš rašydamas užklausą visada pirma peržiūrėk schemą su list_tables "
        "ir describe_table. Kartu su atsakymu visada parodyk SQL užklausą, "
        "kurią įvykdei, ir įvardink prielaidas, kurias padarei."
    ),
)


@mcp.tool
def list_tables() -> list[dict]:
    """Grąžina visas duomenų bazės lenteles su apytiksliu eilučių skaičiumi."""
    rows = fetch(
        """
        SELECT table_name AS lentele,
               table_rows AS apytiksliai_eiluciu,
               table_comment AS komentaras
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        ORDER BY table_name
        """
    )
    return rows


@mcp.tool
def describe_table(table_name: str) -> dict:
    """
    Grąžina lentelės struktūrą: stulpelius, tipus, raktus ir ryšius su kitomis lentelėmis.

    Args:
        table_name: lentelės pavadinimas, pvz. "uzsakymai"
    """
    table_name = check_table_name(table_name)

    columns = fetch(
        """
        SELECT column_name AS stulpelis,
               column_type AS tipas,
               is_nullable AS ar_gali_buti_null,
               column_key AS raktas,
               column_default AS numatytoji_reiksme,
               column_comment AS komentaras
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table_name,),
    )

    if not columns:
        raise ValueError(
            f"Lentelė {table_name!r} nerasta. Pasitikrinkite su list_tables."
        )

    foreign_keys = fetch(
        """
        SELECT column_name AS stulpelis,
               referenced_table_name AS susieta_lentele,
               referenced_column_name AS susietas_stulpelis
        FROM information_schema.key_column_usage
        WHERE table_schema = DATABASE()
          AND table_name = %s
          AND referenced_table_name IS NOT NULL
        """,
        (table_name,),
    )

    count = fetch(f"SELECT COUNT(*) AS eiluciu FROM `{table_name}`")

    return {
        "lentele": table_name,
        "eiluciu_skaicius": count[0]["eiluciu"],
        "stulpeliai": columns,
        "isoriniai_raktai": foreign_keys,
    }


@mcp.tool
def sample_rows(table_name: str, limit: int = 10) -> list[dict]:
    """
    Grąžina kelias eilutes iš lentelės, kad būtų galima pamatyti realias reikšmes.

    Args:
        table_name: lentelės pavadinimas
        limit: kiek eilučių grąžinti (1-50)
    """
    table_name = check_table_name(table_name)
    limit = max(1, min(int(limit), 50))
    return fetch(f"SELECT * FROM `{table_name}` LIMIT {limit}")


@mcp.tool
def run_query(sql: str) -> dict:
    """
    Įvykdo SELECT užklausą duomenų bazėje ir grąžina rezultatą.

    Leidžiamos tik SELECT, WITH, SHOW, DESCRIBE ir EXPLAIN užklausos.
    Jei užklausoje nėra LIMIT, jis pridedamas automatiškai.

    Args:
        sql: viena SQL užklausa
    """
    safe_sql = guard_sql(sql)
    log.info("run_query: %s", safe_sql)
    rows = fetch(safe_sql)
    truncated = len(rows) >= MAX_ROWS

    return {
        "ivykdyta_uzklausa": safe_sql,
        "eiluciu_grazinta": len(rows),
        "rezultatas_apkarpytas": truncated,
        "eilutes": rows,
    }


@mcp.custom_route("/health", methods=["GET"])
async def health(request: Request) -> JSONResponse:
    """Patikrinimo taškas: ar serveris gyvas ir ar mato duomenų bazę."""
    try:
        fetch("SELECT 1 AS ok")
        return JSONResponse({"status": "ok", "database": "connected"})
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            {"status": "degraded", "database": "unreachable", "error": str(exc)},
            status_code=503,
        )


if __name__ == "__main__":
    log.info("VCS SQL MCP serveris startuoja ties %s (portas %s)", MCP_PATH, PORT)
    mcp.run(
        transport="http",
        host="0.0.0.0",
        port=PORT,
        path=MCP_PATH,
        stateless_http=True,
    )
