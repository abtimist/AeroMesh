from pathlib import Path
import sqlite3
from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.base_class import Base

BACKEND_DIR = Path(__file__).resolve().parents[2]
RUNTIME_DIR = BACKEND_DIR / "runtime"
RUNTIME_DIR.mkdir(exist_ok=True)
# The tracked database is a seed, not a changing runtime file.
database_file = RUNTIME_DIR / "aeromesh.db"
if not settings.DATABASE_URL and not database_file.exists():
    seed = BACKEND_DIR / "aeromesh.db"
    if seed.exists():
        with sqlite3.connect(f"file:{seed.as_posix()}?mode=ro", uri=True) as source, sqlite3.connect(database_file) as target:
            source.backup(target)
url = settings.DATABASE_URL or f"sqlite:///{database_file.as_posix()}"
engine_url = make_url(url).set(drivername="postgresql+psycopg") if url.startswith("postgresql://") else url
connect_args = {"check_same_thread": False, "timeout": 15} if url.startswith("sqlite") else {"connect_timeout": 5}
if make_url(url).host == "localhost" and url.startswith("postgresql"):
    # Preserve the configured URL while avoiding slow IPv6/DNS fallback locally.
    connect_args["hostaddr"] = "127.0.0.1"
engine = create_engine(engine_url, connect_args=connect_args, pool_pre_ping=True)

if url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def configure_sqlite(connection, _):
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA busy_timeout=15000")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    with SessionLocal() as db:
        yield db
