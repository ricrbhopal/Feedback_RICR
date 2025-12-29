import axios from 'axios';

const axiosInstance = axios.create({
    baseURL : 'http://localhost:4900',
    withCredentials:true
})

export default axiosInstance;