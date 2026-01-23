from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from database.db import get_db
from models.sensor import Sensor, SensorCreate, SensorDataProcessed, SensorDataRaw, SensorDataRawSchema
from datetime import datetime
from fastapi.responses import Response
from utils.fft_bytes import bytes_to_fft_array, fft_to_json_safe, rms
from database.db import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
import numpy as np
from typing import Optional
import math
from collections import defaultdict

sensor_router = APIRouter(prefix="/sensors", tags=["sensors"])

@sensor_router.post("/add")
async def create_sensor(
    sensor: SensorCreate = Depends(SensorCreate.as_form),
    user_id: int = Form(...),
    image: UploadFile = File(None),
    db_session: AsyncSession = Depends(get_async_db)
):
    existing_sensor = await db_session.execute(
        select(Sensor).filter(
            Sensor.sensor_name == sensor.sensor_name,
            Sensor.user_id == user_id
        )
    )
    existing_sensor = existing_sensor.scalars().first()

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
    await db_session.commit()        
    await db_session.refresh(new_sensor)  

    return {
        "id_sensor": new_sensor.id_sensor,
        "sensor_name": new_sensor.sensor_name,
        "equip": new_sensor.equip,
        "location": new_sensor.location,
        "host": new_sensor.host,
        "created_at": new_sensor.created_at
    }


@sensor_router.get("/user/{user_id}")
async def get_sensor_by_user(user_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(Sensor).where(Sensor.user_id == user_id)
    )
    sensors = result.scalars().all()  

    if not sensors:
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
async def get_sensor_image(sensor_id: int, db_session: AsyncSession = Depends(get_async_db)):
    sensor = await db_session.execute(select(Sensor).filter(
        Sensor.id_sensor == sensor_id
    ))
    sensor = sensor.scalars().first()

    if not sensor or not sensor.image:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")

    return Response(
        content=sensor.image,
        media_type=sensor.image_type or "image/jpeg"
    )


@sensor_router.get("/{user_id}/{sensor_id}/processed_data")
async def get_processed_data(
    user_id: int,
    sensor_id: int,
    limit: int = Query(100, description="Número máximo de registros retornados"),
    start: Optional[datetime] = Query(None, description="Data/hora inicial (ISO)"),
    end: Optional[datetime] = Query(None, description="Data/hora final (ISO)"),
    db: AsyncSession = Depends(get_async_db)
):
    query = select(SensorDataProcessed).where(
        SensorDataProcessed.user_id == user_id,
        SensorDataProcessed.sensor_id == sensor_id
    ).order_by(SensorDataProcessed.timestamp.asc())

    if start:
        query = query.where(SensorDataProcessed.timestamp >= start)
    if end:
        query = query.where(SensorDataProcessed.timestamp <= end)

    query = query.limit(limit)

    result = await db.execute(query)
    data_list = result.scalars().all()

    if not data_list:
        raise HTTPException(status_code=404, detail="Nenhum dado processado encontrado")

    processed = []
    for row in data_list:
        processed.append({
            "sensor_id": row.sensor_id,
            "user_id": row.user_id,
            "fft_ax": fft_to_json_safe(bytes_to_fft_array(row.fft_ax)),
            "fft_ay": fft_to_json_safe(bytes_to_fft_array(row.fft_ay)),
            "fft_az": fft_to_json_safe(bytes_to_fft_array(row.fft_az)),
            "rms": row.rms,
            "peak": row.peak,
            "crest_factor": row.crest_factor,
            "kurtosis": row.kurtosis,
            "timestamp": row.timestamp.isoformat()
        })

    return {
        "sensor_id": sensor_id,
        "user_id": user_id,
        "records_count": len(processed),
        "data": processed
    }


@sensor_router.get("/{user_id}/{sensor_id}/raw_data")
async def get_raw_data(
    user_id: int,
    sensor_id: int,
    limit: int = Query(1000),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    bucket_ms: Optional[int] = Query(
        None,
        description="Janela de agregação em ms (ex: 1000 = 1s)"
    ),
    db: AsyncSession = Depends(get_async_db)
):
    query = (
        select(SensorDataRaw)
        .where(
            SensorDataRaw.user_id == user_id,
            SensorDataRaw.sensor_id == sensor_id
        )
        .order_by(SensorDataRaw.timestamp.asc())
    )

    if start:
        query = query.where(SensorDataRaw.timestamp >= start)
    if end:
        query = query.where(SensorDataRaw.timestamp <= end)

    if not bucket_ms:
        query = query.limit(limit)

    result = await db.execute(query)
    rows = result.scalars().all()

    if not rows:
        raise HTTPException(status_code=404, detail="Nenhum dado bruto encontrado")

    # SEM AGREGAÇÃO 
    if not bucket_ms:
        return [
            {
                "sensor_id": r.sensor_id,
                "user_id": r.user_id,
                "ax": r.ax,
                "ay": r.ay,
                "az": r.az,
                "gx": r.gx,
                "gy": r.gy,
                "gz": r.gz,
                "temp": r.temp,
                "uptime_ms": r.uptime_ms,
                "timestamp": r.timestamp.isoformat()
            }
            for r in rows
        ]

    # AGREGAÇÃO
    buckets = defaultdict(list)

    for r in rows:
        ts_ms = int(r.timestamp.timestamp() * 1000)
        key = ts_ms // bucket_ms
        buckets[key].append(r)

    aggregated = []

    for _, group in buckets.items():
        ax = [r.ax for r in group]
        ay = [r.ay for r in group]
        az = [r.az for r in group]
        temp = [r.temp for r in group if r.temp is not None]

        aggregated.append({
            "timestamp": group[0].timestamp.isoformat(),

            "ax_mean": sum(ax) / len(ax),
            "ay_mean": sum(ay) / len(ay),
            "az_mean": sum(az) / len(az),

            "ax_min": min(ax),
            "ax_max": max(ax),
            "ay_min": min(ay),
            "ay_max": max(ay),
            "az_min": min(az),
            "az_max": max(az),

            "rms_az": rms(az),
            "temp": sum(temp) / len(temp) if temp else None
        })

    return {
        "sensor_id": sensor_id,
        "user_id": user_id,
        "bucket_ms": bucket_ms,
        "records_count": len(aggregated),
        "data": aggregated
    }