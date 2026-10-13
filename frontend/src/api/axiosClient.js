import axios from 'axios';

// Central Axios instance pointing to the FastAPI server
const axiosClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosClient;