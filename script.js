// Global variables
let todos = [];
let currentFilter = 'all';

// DOM Elements
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const todoList = document.getElementById('todoList');
const filterBtns = document.querySelectorAll('.filter-btn');
const itemsLeftSpan = document.getElementById('itemsLeft');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
});
clearCompletedBtn.addEventListener('click', clearCompleted);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        renderTodos();
    });
});

// Initialize the app
function initialize() {
    fetchTodos();
}

// API Functions
async function fetchTodos() {
    try {
        const response = await fetch('/api/todos');
        if (!response.ok) throw new Error('Failed to fetch todos');
        
        todos = await response.json();
        renderTodos();
    } catch (error) {
        console.error('Error fetching todos:', error);
        // For demo/development, initialize with empty array if server not available
        todos = [];
        renderTodos();
    }
}

async function addTodoToServer(todoText) {
    try {
        const response = await fetch('/api/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: todoText, completed: false })
        });
        
        if (!response.ok) throw new Error('Failed to add todo');
        return await response.json();
    } catch (error) {
        console.error('Error adding todo:', error);
        // Mock response for demo
        return { id: Date.now(), text: todoText, completed: false };
    }
}

async function updateTodoOnServer(id, updates) {
    try {
        const response = await fetch(`/api/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) throw new Error('Failed to update todo');
        return await response.json();
    } catch (error) {
        console.error('Error updating todo:', error);
        // Continue with UI update even if server call fails
    }
}

async function deleteTodoFromServer(id) {
    try {
        const response = await fetch(`/api/todos/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete todo');
    } catch (error) {
        console.error('Error deleting todo:', error);
        // Continue with UI update even if server call fails
    }
}

// App Functions
async function addTask() {
    const text = taskInput.value.trim();
    if (text === '') return;
    
    // Add to server and get response with ID
    const newTodo = await addTodoToServer(text);
    
    // Update local state
    todos.push(newTodo);
    
    // Clear input and update UI
    taskInput.value = '';
    renderTodos();
}

async function toggleTodoStatus(id) {
    const todo = todos.find(todo => todo.id === id);
    if (!todo) return;
    
    const newStatus = !todo.completed;
    
    // Update on server
    await updateTodoOnServer(id, { completed: newStatus });
    
    // Update local state
    todo.completed = newStatus;
    
    // Update UI
    renderTodos();
}

async function deleteTodo(id) {
    // Delete from server
    await deleteTodoFromServer(id);
    
    // Update local state
    todos = todos.filter(todo => todo.id !== id);
    
    // Update UI
    renderTodos();
}

async function clearCompleted() {
    const completedIds = todos.filter(todo => todo.completed).map(todo => todo.id);
    
    // Delete each completed todo from server
    const deletePromises = completedIds.map(id => deleteTodoFromServer(id));
    await Promise.all(deletePromises);
    
    // Update local state
    todos = todos.filter(todo => !todo.completed);
    
    // Update UI
    renderTodos();
}

// UI Functions
function renderTodos() {
    // Filter todos based on current filter
    const filteredTodos = todos.filter(todo => {
        if (currentFilter === 'active') return !todo.completed;
        if (currentFilter === 'completed') return todo.completed;
        return true; // 'all' filter
    });
    
    // Clear current list
    todoList.innerHTML = '';
    
    // Show message if list is empty
    if (filteredTodos.length === 0) {
        todoList.innerHTML = `<li class="empty-list">No ${currentFilter === 'all' ? '' : currentFilter} tasks found</li>`;
    } else {
        // Render each todo
        filteredTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            
            li.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="task-text">${escapeHTML(todo.text)}</span>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            `;
            
            // Add event listeners
            const checkbox = li.querySelector('.todo-checkbox');
            checkbox.addEventListener('change', () => toggleTodoStatus(todo.id));
            
            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            todoList.appendChild(li);
        });
    }
    
    // Update items left count
    const activeCount = todos.filter(todo => !todo.completed).length;
    itemsLeftSpan.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
}

// Helper function to prevent XSS
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}