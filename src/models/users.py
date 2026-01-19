from sqlalchemy import Column, Integer, String, Date
from database.db import Base 
from pydantic import BaseModel, EmailStr, validator
import logging
from datetime import date 
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True, 'schema': 'hydrian'}

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    user_type = Column(String, nullable=True)
    created_at = Column(Date, nullable=False)
    token = Column(String, nullable=True)

class Login(BaseModel):
    email: EmailStr
    password: str

class RecuperarSenha(BaseModel):
    email: EmailStr

class RedefinirSenhaInput(BaseModel):
    token: str
    nova_senha: str

    @validator('nova_senha')
    def password_min_length(cls, value):
        if len(value) < 5:
            logger.warning("Senha com menos de 5 caracteres")
            raise ValueError('A senha deve conter pelo menos 5 caracteres')
        return value

class UserLogin(BaseModel):
    name: str
    email: EmailStr
    password: str
    user_type: str  

    @validator('name')
    def name_min_length(cls, value):
        if len(value.strip()) < 5:
            logger.warning("Nome com menos de 5 caracteres: '%s'", value)
            raise ValueError('O nome deve conter pelo menos 5 caracteres')
        return value

    @validator('password')
    def password_min_length(cls, value):
        if len(value) < 5:
            logger.warning("Senha com menos de 5 caracteres")
            raise ValueError('A senha deve conter pelo menos 5 caracteres')
        return value


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    user_type: str
    created_at: date  
    
    class Config:
        from_attributes = True