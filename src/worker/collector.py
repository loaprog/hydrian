import time
import requests
import os

API_URL = os.getenv("API_URL", "http://api:8000/sensors/data")
SENSOR_IP = os.getenv("SENSOR_IP", "http://192.168.1.100/data")

DEVICE_ID = "esp32-001"
USER_ID = 1


def collect():
    while True:
        try:
            # 🔹 Puxa dados do ESP32
            resp = requests.get(SENSOR_IP, timeout=3)
            resp.raise_for_status()
            raw = resp.json()

            payload = {
                "device_id": DEVICE_ID,
                "user_id": USER_ID,
                "ax": raw["ax"],
                "ay": raw["ay"],
                "az": raw["az"],
                "temp": raw.get("temp", 0)
            }

            # 🔹 Envia para a API
            r = requests.post(API_URL, json=payload, timeout=3)

            print("OK →", payload)

        except Exception as e:
            print("Erro:", e)

        time.sleep(1)  # frequência (1s)


if __name__ == "__main__":
    collect()
