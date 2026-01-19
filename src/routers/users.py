from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.users import User, UserLogin, Login, RedefinirSenhaInput, RecuperarSenha, UserResponse
from datetime import date
from utils.generate_token import generate_token
from fastapi.responses import JSONResponse
from typing import List
from fastapi import Query

user_router = APIRouter(prefix='/users', tags=['users'])

@user_router.post('/register')
async def register(user: UserLogin, db_session: Session = Depends(get_db)):
    existing_user = db_session.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    new_user = User(
        name=user.name,
        email=user.email,
        password=user.password,  # hashear a senha #
        user_type=user.user_type,
        created_at=date.today(),
        token=generate_token()
    )
    
    db_session.add(new_user)
    db_session.commit()
    db_session.refresh(new_user)
    
    return {"id": new_user.id, "name": new_user.name, "email": new_user.email}


@user_router.post('/login')
async def login(user: Login, db_session: Session = Depends(get_db)):
    user_db = db_session.query(User).filter(User.email == user.email).first()
    
    if user_db and user_db.password == user.password:

        return {
            "id": user_db.id,
            "name": user_db.name,
            "email": user_db.email,
            "user_type": user_db.user_type
        }
    else:
        return JSONResponse(status_code=401, content={"detail": "Credenciais inválidas"})
    

