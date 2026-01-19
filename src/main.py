from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from routers.users import user_router
from routers.sensors import sensor_router
from configs.config import static_files, templates

app = FastAPI(
    debug=True,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.mount("/static", static_files, name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router, prefix="/users", tags=["users"])
app.include_router(sensor_router)


@app.get("/", response_class=HTMLResponse)
async def login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/inicio", response_class=HTMLResponse)
async def inicio(request: Request):
    return templates.TemplateResponse("inicio.html", {"request": request})
