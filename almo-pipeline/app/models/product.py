from sqlalchemy import Column, Integer, String, Float
from app.db.database import Base

class Product(Base):
    __tablename__ = "PRODUCT"

    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    price = Column(Float)
    inventory = Column(Integer)
    upc = Column(String(50))