import axios from 'axios';

const axiosInstance = axios.create({
    baseURL : import.meta.env.VITE_BACKEND_URL,
    withCredentials:true,
    timeout: 15000, // 15 second timeout to prevent hanging requests
})

export default axiosInstance;