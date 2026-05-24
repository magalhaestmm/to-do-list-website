import React, { useState } from 'react';

function TodoInput({ addTodo }) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (inputValue.trim() !== "") {
      addTodo(inputValue);
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="input-container">
      <input 
        type="text" 
        className="todo-input"
        placeholder="Write your task here..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button className="add-button" onClick={handleAdd}>
        ADD
      </button>
    </div>
  );
}

export default TodoInput;