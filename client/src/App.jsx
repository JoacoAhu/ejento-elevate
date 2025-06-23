import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import './App.css';
import './styles/main.scss';
import PromptPlayground from "./components/promptPlayground/PromptPlayground.jsx";

const queryClient = new QueryClient();

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <div className="app">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/admin/prompts" element={<PromptPlayground />} />
                    </Routes>
                </div>
            </Router>
        </QueryClientProvider>
    );
}

export default App;