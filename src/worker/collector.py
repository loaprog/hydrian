import asyncio
import logging
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine
import httpx
import numpy as np
from models.sensor import Sensor, SensorDataRaw, SensorDataProcessed
from configs.config import get_settings
from sqlalchemy import text
import io

settings = get_settings()
DATABASE_URL = settings.db_url 

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("async_worker")

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

BATCH_SIZE = 3       #
COLLECT_INTERVAL = 2  
batch_lock = asyncio.Lock()  

sensor_batches = {}  

@asynccontextmanager
async def session_scope():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

def normalize_host(host: str) -> str:
    host = host.strip()
    if not host.startswith(("http://", "https://")):
        host = "http://" + host
    return host

def fft_to_bytes(arr: np.ndarray) -> bytes:
    buf = io.BytesIO()
    np.save(buf, arr, allow_pickle=False)
    buf.seek(0)
    return buf.read()

def process_raw_batch(raw_batch: list) -> SensorDataProcessed:
    ax_arr = np.array([r.ax or 0 for r in raw_batch])
    ay_arr = np.array([r.ay or 0 for r in raw_batch])
    az_arr = np.array([r.az or 0 for r in raw_batch])

    fft_ax = np.fft.fft(ax_arr)
    fft_ay = np.fft.fft(ay_arr)
    fft_az = np.fft.fft(az_arr)

    axes = np.vstack([ax_arr, ay_arr, az_arr])
    rms = np.sqrt(np.mean(axes**2))
    peak = np.max(np.abs(axes))
    crest_factor = peak / rms if rms != 0 else None
    kurtosis = ((axes - axes.mean())**4).mean() / (axes.var()**2) if axes.var() != 0 else None

    logger.info(f"[Sensor {raw_batch[0].sensor_id}] Processando batch ({len(raw_batch)} leituras)")
    logger.info(f"FFT AX: {fft_ax[:5]} ...")
    logger.info(f"FFT AY: {fft_ay[:5]} ...")
    logger.info(f"FFT AZ: {fft_az[:5]} ...")
    logger.info(f"Métricas -> RMS: {rms:.3f}, Peak: {peak:.3f}, Crest: {crest_factor:.3f}, Kurtosis: {kurtosis:.3f}")

    return SensorDataProcessed(
        sensor_id=raw_batch[0].sensor_id,
        user_id=raw_batch[0].user_id,
        fft_ax=fft_to_bytes(fft_ax),
        fft_ay=fft_to_bytes(fft_ay),
        fft_az=fft_to_bytes(fft_az),
        rms=rms,
        peak=peak,
        crest_factor=crest_factor,
        kurtosis=kurtosis
    )

async def fetch_sensor(sensor_data: dict):
    sensor_id = sensor_data["id_sensor"]
    user_id = sensor_data["user_id"]
    host = normalize_host(sensor_data["host"])

    async with httpx.AsyncClient(timeout=3.0) as client:
        try:
            response = await client.get(host)
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Sensor {sensor_id} Data: {data}")

                raw = SensorDataRaw(
                    sensor_id=sensor_id,
                    user_id=user_id,
                    ax=data.get("ax"),
                    ay=data.get("ay"),
                    az=data.get("az"),
                    gx=data.get("gx"),
                    gy=data.get("gy"),
                    gz=data.get("gz"),
                    temp=data.get("temp"),
                    uptime_ms=data.get("uptime_ms")
                )

                async with batch_lock:
                    if sensor_id not in sensor_batches:
                        sensor_batches[sensor_id] = []
                    sensor_batches[sensor_id].append(raw)

                    logger.info(f"[Sensor {sensor_id}] Batch size atual: {len(sensor_batches[sensor_id])}/{BATCH_SIZE}")

                    if len(sensor_batches[sensor_id]) >= BATCH_SIZE:
                        await save_batch_per_sensor(sensor_id)

            else:
                logger.warning(f"Sensor {sensor_id} não respondeu. Status: {response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Sensor {sensor_id} indisponível em {host}. Erro: {e}")

async def save_batch_per_sensor(sensor_id: int):
    batch = sensor_batches.get(sensor_id, [])
    if not batch:
        return

    async with session_scope() as session:
        session.add_all(batch)
        logger.info(f"[Sensor {sensor_id}] Salvando {len(batch)} leituras raw no DB")

    if len(batch) > 1:
        processed = process_raw_batch(batch)
        async with session_scope() as session:
            session.add(processed)
            logger.info(f"[Sensor {sensor_id}] Salvando dados processados no DB")

    batch.clear()
    sensor_batches[sensor_id] = []

async def collect_sensors():
    while True:
        try:
            async with session_scope() as session:
                result = await session.execute(text("SELECT id_sensor, host, user_id FROM hydrian.sensors"))
                sensors = [{"id_sensor": r[0], "host": r[1], "user_id": r[2]} for r in result.fetchall()]

            if not sensors:
                logger.warning("Nenhum sensor cadastrado no banco.")
            else:
                tasks = [fetch_sensor(s) for s in sensors]
                await asyncio.gather(*tasks)

            async with batch_lock:
                for sensor_id, batch in sensor_batches.items():
                    if batch:
                        logger.info(f"[Sensor {sensor_id}] Leituras coletadas: {len(batch)}/{BATCH_SIZE} ainda para FFT")

            await asyncio.sleep(COLLECT_INTERVAL)

        except Exception as e:
            logger.exception(f"Erro geral na coleta de sensores: {e}")
            await asyncio.sleep(COLLECT_INTERVAL)

if __name__ == "__main__":
    asyncio.run(collect_sensors())
