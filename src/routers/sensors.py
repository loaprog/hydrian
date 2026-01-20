from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database.db import get_db
from models.sensor import Sensor, SensorCreate
from datetime import datetime
from fastapi.responses import Response

sensor_router = APIRouter(prefix="/sensors", tags=["sensors"])

@sensor_router.post("/add")
async def create_sensor(
    sensor: SensorCreate = Depends(SensorCreate.as_form),
    user_id: int = Form(...),
    image: UploadFile = File(None),
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

    image_bytes = None
    image_type = None

    if image:
        image_bytes = await image.read()
        image_type = image.content_type

    location = f"{sensor.latitude}, {sensor.longitude}"

    new_sensor = Sensor(
        sensor_name=sensor.sensor_name,
        user_id=user_id,
        equip=sensor.equip,
        location=location,
        host=sensor.host,
        image=image_bytes,
        image_type=image_type,
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


@sensor_router.get("/user/{user_id}")
async def get_sensor_by_user(user_id: int, db_session: Session = Depends(get_db)):
    sensors = db_session.query(Sensor).filter(Sensor.user_id == user_id).all()
    
    if  not sensors:
        raise HTTPException(
            status_code=404,
            detail="Nenhum sensor encontrado para este usuário"
        )
    
    return [
        {
            "id_sensor": sensor.id_sensor,
            "sensor_name": sensor.sensor_name,
            "equip": sensor.equip,
            "location": sensor.location,
            "host": sensor.host,
            "image_url": f"/sensors/{sensor.id_sensor}/image" if sensor.image else None,
            "created_at": sensor.created_at
        }
        for sensor in sensors
    ]


@sensor_router.get("/{sensor_id}/image")
def get_sensor_image(sensor_id: int, db_session: Session = Depends(get_db)):
    sensor = db_session.query(Sensor).filter(
        Sensor.id_sensor == sensor_id
    ).first()

    if not sensor or not sensor.image:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")

    return Response(
        content=sensor.image,
        media_type=sensor.image_type or "image/jpeg"
    )


