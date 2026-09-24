from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import postgresql
from app.db.base_class import Base
from app.models.base import * # ensures all models are loaded
from app.db.session import engine

# Generate the DDL for all tables
for table in Base.metadata.sorted_tables:
    print(CreateTable(table).compile(dialect=postgresql.dialect()))
