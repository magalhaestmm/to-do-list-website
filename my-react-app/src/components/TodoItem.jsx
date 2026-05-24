import React from 'react';

function TodoItem({ todo, toggleComplete, deleteTodo }) {
  return (
    <div className="todo-item">
      <div className="todo-item-left" onClick={() => toggleComplete(todo.id)}>
        {todo.completed ? (
          // Checked Icon
          <svg className="icon icon-check" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        ) : (
          // Empty Circle Icon
          <svg className="icon icon-circle" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
          </svg>
        )}
        <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
          {todo.text}
        </span>
      </div>
      
      <button className="delete-btn" onClick={() => deleteTodo(todo.id)}>
        {/* Trash Icon */}
        <svg className="icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  );
}

export default TodoItem;