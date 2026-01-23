import math
import numpy as np
import io

def bytes_to_fft_array(data: bytes) -> list:
    buf = io.BytesIO(data)
    buf.seek(0)
    return np.load(buf, allow_pickle=False).tolist()


def fft_to_json_safe(fft_arr):
    fft_arr = np.array(fft_arr, dtype=complex)
    return {
        "real": fft_arr.real.tolist(),
        "imag": fft_arr.imag.tolist(),
        "magnitude": np.abs(fft_arr).tolist()
    }


def rms(values):
    return math.sqrt(sum(v * v for v in values) / len(values)) if values else None
