from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.sensor import Sensor, SensorCreate
from datetime import datetime

sensor_router = APIRouter(prefix="/sensors", tags=["sensors"])


@sensor_router.post("/add")
async def create_sensor(
    sensor: SensorCreate,
    user_id: int,
    db_session: Session = Depends(get_db)
):
    existing_sensor = db_session.query(Sensor).filter(
        Sensor.sensor_name == sensor.sensor_name,
        Sensor.user_id == user_id
    ).first()

    if existing_sensor:
        raise HTTPException(
            status_code=400,
            detail="Sensor já cadastrado para este usuário"
        )

    location = f"{sensor.latitude}, {sensor.longitude}"

    new_sensor = Sensor(
        sensor_name=sensor.sensor_name,
        user_id=user_id,
        equip=sensor.equip,
        location=location,
        host=sensor.host,
        created_at=datetime.utcnow()
    )

    db_session.add(new_sensor)
    db_session.commit()
    db_session.refresh(new_sensor)

    return {
        "id_sensor": new_sensor.id_sensor,
        "sensor_name": new_sensor.sensor_name,
        "equip": new_sensor.equip,
        "location": new_sensor.location,
        "host": new_sensor.host,
        "created_at": new_sensor.created_at
    }
