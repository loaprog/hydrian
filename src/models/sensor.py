from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Index, LargeBinary
from datetime import datetime
from database.db import Base
from pydantic import BaseModel
from typing import Optional
from fastapi import Form


class Sensor(Base):
    __tablename__ = "sensors"
    __table_args__ = {'schema': 'hydrian'}

    id_sensor = Column(Integer, primary_key=True)
    sensor_name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("hydrian.users.id"), nullable=False)
    equip = Column(String, nullable=False)
    location = Column(String, nullable=False)
    host = Column(String, nullable=False)
    image = Column(LargeBinary, nullable=True)  
    image_type = Column(String, nullable=True)  
    created_at = Column(DateTime, default=datetime.utcnow)

class SensorCreate(BaseModel):
    sensor_name: str
    latitude: float
    longitude: float
    equip: str
    host: str

    @classmethod
    def as_form(
        cls,
        sensor_name: str = Form(...),
        latitude: float = Form(...),
        longitude: float = Form(...),
        equip: str = Form(...),
        host: str = Form(...)
    ):
        return cls(
            sensor_name=sensor_name,
            latitude=latitude,
            longitude=longitude,
            equip=equip,
            host=host
        )
    
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
