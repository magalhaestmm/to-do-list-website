import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import TodoInput from './components/TodoInput';
import TodoItem from './components/TodoItem';

const API_URL = 'https://to-do-list-backend-e7wj.onrender.com';

function App() {
  const [todos, setTodos] = useState([]);
  const [token, setToken] = useState(localStorage.getItem("token"));
  
  // Estados para o formulário de Autenticação
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Busca os todos toda vez que o token mudar (ou seja, quando logar)
  useEffect(() => {
    if (token) {
      fetchTodos();
    }
  }, [token]);

  // ==========================================
  // FUNÇÕES DE AUTENTICAÇÃO
  // ==========================================
  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (isLoginView) {
      // LOGIN
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        localStorage.setItem("token", data.access_token); // Salva no navegador
      } else {
        alert("Usuário ou senha incorretos!");
      }
    } else {
      // REGISTRO
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        alert("Conta criada! Agora faça o login.");
        setIsLoginView(true);
      } else {
        alert("Erro ao criar conta. O usuário já existe?");
      }
    }
  };

  const handleLogout = () => {
    setToken(null);
    setTodos([]);
    localStorage.removeItem("token");
  };

  // ==========================================
  // FUNÇÕES DE TODO (Agora com o Token no Header)
  // ==========================================
  const fetchTodos = async () => {
    const response = await fetch(`${API_URL}/todos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      setTodos(data);
    } else {
      handleLogout(); // Se der erro (token expirado), desloga
    }
  };

  const addTodo = async (text) => {
    const response = await fetch(`${API_URL}/todos`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text: text, completed: false })
    });
    const newTodo = await response.json();
    setTodos([...todos, newTodo]);
  };

  const toggleComplete = async (id) => {
    const response = await fetch(`${API_URL}/todos/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const updatedTodo = await response.json();
    setTodos(todos.map(todo => todo.id === id ? updatedTodo : todo));
  };

  const deleteTodo = async (id) => {
    await fetch(`${API_URL}/todos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setTodos(todos.filter(todo => todo.id !== id));
  };

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================

  // Se não tem token, mostra a tela de Login/Registro
  if (!token) {
    return (
      <div className="app-container">
        <Header />
        <form className="auth-form" onSubmit={handleAuth}>
          <input 
            type="text" 
            className="auth-input" 
            placeholder="Usuário" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input 
            type="password" 
            className="auth-input" 
            placeholder="Senha" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="auth-button">
            {isLoginView ? "ENTRAR" : "CRIAR CONTA"}
          </button>
          <div className="auth-toggle" onClick={() => setIsLoginView(!isLoginView)}>
            {isLoginView ? "Não tem uma conta? " : "Já tem uma conta? "}
            <span>{isLoginView ? "Registre-se" : "Faça Login"}</span>
          </div>
        </form>
      </div>
    );
  }

  // Se tem token, mostra o App normal
  return (
    <div className="app-container">
      <Header />
      <button className="logout-btn" onClick={handleLogout}>Sair</button>
      <TodoInput addTodo={addTodo} />
      <div className="todo-list">
        {todos.map(todo => (
          <TodoItem 
            key={todo.id} 
            todo={todo} 
            toggleComplete={toggleComplete} 
            deleteTodo={deleteTodo} 
          />
        ))}
      </div>
    </div>
  );
}

export default App;