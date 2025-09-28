import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Paper, Title, Alert } from '@mantine/core';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const API_URL = process.env.REACT_APP_FRIGATE_PROXY || 'http://localhost:4000';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [_, setUser] = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/login`, { username, password });
      setUser({
        token: res.data.token,
        username: res.data.username,
        role: res.data.role
      });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <Paper radius="md" p="xl" withBorder style={{ maxWidth: 400, margin: '80px auto' }}>
      <Title order={2} align="center" mb="md">Iniciar sesión</Title>
      <form onSubmit={handleLogin}>
        <TextInput label="Usuario" value={username} onChange={e => setUsername(e.target.value)} required mb="md" />
        <PasswordInput label="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required mb="md" />
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <Button type="submit" fullWidth>Entrar</Button>
      </form>
    </Paper>
  );
};

export default LoginPage;
