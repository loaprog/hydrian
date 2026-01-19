from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Index
from datetime import datetime
from database.db import Base
from pydantic import BaseModel
from typing import Optional

class Sensor(Base):
    __tablename__ = "sensors"
    __table_args__ = {'schema': 'hydrian'}

    id_sensor = Column(Integer, primary_key=True)
    sensor_name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("hydrian.users.id"), nullable=False)
    name = Column(String, nullable=False)
    equip = Column(String, nullable=False)
    location = Column(String, nullable=False)
    host = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)




    
class SensorDataIn(BaseModel):
    device_id: str
    user_id: int

    ax: float
    ay: float
    az: float

    gx: Optional[float] = None
    gy: Optional[float] = None
    gz: Optional[float] = None

    temp: Optional[float] = None
    uptime_ms: Optional[int] = None
