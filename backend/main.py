from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, declarative_base, relationship
from pydantic import BaseModel
from typing import List
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta

# ==========================================
# CONFIGURAÇÕES DE SEGURANÇA (JWT)
# ==========================================
SECRET_KEY = "uma_chave_secreta_muito_segura_para_estudos" # Em produção, esconda isso!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ==========================================
# 1. DATABASE SETUP
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./todos.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modelos do Banco de Dados
class DBUser(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    todos = relationship("DBTodo", back_populates="owner")

class DBTodo(Base):
    __tablename__ = "todos"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, index=True)
    completed = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("DBUser", back_populates="todos")

Base.metadata.create_all(bind=engine)

# ==========================================
# 2. PYDANTIC MODELS (Validação)
# ==========================================
class UserCreate(BaseModel):
    username: str
    password: str

class TodoBase(BaseModel):
    text: str
    completed: bool = False

class TodoResponse(TodoBase):
    id: int
    class Config:
        from_attributes = True

# ==========================================
# FUNÇÕES AUXILIARES DE AUTENTICAÇÃO
# ==========================================
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Descobre quem é o usuário logado lendo o Token
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# ==========================================
# 3. FASTAPI APP & ENDPOINTS
# ==========================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROTAS DE USUÁRIO ---
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Usuário já existe")
    
    hashed_password = get_password_hash(user.password)
    new_user = DBUser(username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    return {"message": "Usuário criado com sucesso!"}

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Usuário ou senha incorretos")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# --- ROTAS DE TODOS (Agora protegidas!) ---
@app.get("/todos", response_model=List[TodoResponse])
def get_todos(db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    # Retorna APENAS os todos do usuário logado
    return db.query(DBTodo).filter(DBTodo.owner_id == current_user.id).all()

@app.post("/todos", response_model=TodoResponse)
def create_todo(todo: TodoBase, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    db_todo = DBTodo(text=todo.text, completed=todo.completed, owner_id=current_user.id)
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

@app.put("/todos/{todo_id}", response_model=TodoResponse)
def toggle_todo(todo_id: int, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    # Tenta achar o todo que tenha esse ID E que pertença a este usuário
    db_todo = db.query(DBTodo).filter(DBTodo.id == todo_id, DBTodo.owner_id == current_user.id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo não encontrado")
    
    db_todo.completed = not db_todo.completed
    db.commit()
    db.refresh(db_todo)
    return db_todo

@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    db_todo = db.query(DBTodo).filter(DBTodo.id == todo_id, DBTodo.owner_id == current_user.id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo não encontrado")
    
    db.delete(db_todo)
    db.commit()
    return {"message": "Todo deletado"}