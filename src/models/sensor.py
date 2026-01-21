from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Index, LargeBinary, func
from sqlalchemy.orm import relationship
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
    raw_data = relationship("SensorDataRaw", back_populates="sensor")

class SensorDataRaw(Base):
    __tablename__ = "sensor_data_raw"
    __table_args__ = {'schema': 'hydrian'}

    id = Column(Integer, primary_key=True, autoincrement=True)
    sensor_id = Column(Integer, ForeignKey("hydrian.sensors.id_sensor"), nullable=False, index=True)
    user_id = Column(Integer, index=True)
    ax = Column(Float)
    ay = Column(Float)
    az = Column(Float)
    gx = Column(Float, nullable=True)
    gy = Column(Float, nullable=True)
    gz = Column(Float, nullable=True)
    temp = Column(Float, nullable=True)
    uptime_ms = Column(Integer, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    sensor = relationship("Sensor", back_populates="raw_data")


class SensorDataProcessed(Base):
    __tablename__ = "sensor_data_processed"
    __table_args__ = {'schema': 'hydrian'}

    id = Column(Integer, primary_key=True, autoincrement=True)
    sensor_id = Column(Integer, ForeignKey("hydrian.sensors.id_sensor"), nullable=False, index=True)
    user_id = Column(Integer, index=True)

    fft_ax = Column(LargeBinary, nullable=True)  
    fft_ay = Column(LargeBinary, nullable=True)
    fft_az = Column(LargeBinary, nullable=True)

    rms = Column(Float, nullable=True)           
    peak = Column(Float, nullable=True)
    crest_factor = Column(Float, nullable=True)
    kurtosis = Column(Float, nullable=True)

    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    sensor = relationship("Sensor")



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
    

class SensorDataRawSchema(BaseModel):
    id: int
    sensor_id: int
    user_id: int
    ax: float
    ay: float
    az: float
    gx: Optional[float] = None
    gy: Optional[float] = None
    gz: Optional[float] = None
    temp: Optional[float] = None
    uptime_ms: Optional[int] = None
    timestamp: datetime

    class Config:
        orm_mode = True