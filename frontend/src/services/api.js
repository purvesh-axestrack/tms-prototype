import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 with token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
        const { access_token, refresh_token: newRefreshToken } = res.data;

        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        processQueue(null, access_token);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Loads
export const getLoads = async (params = {}) => {
  const response = await api.get('/loads', { params });
  return response.data;
};

export const getLoadById = async (id) => {
  const response = await api.get(`/loads/${id}`);
  return response.data;
};

export const createLoad = async (loadData) => {
  const response = await api.post('/loads', loadData);
  return response.data;
};

export const assignDriver = async (loadId, driverId, { truck_id, trailer_id, driver2_id } = {}) => {
  const body = { driver_id: driverId };
  if (truck_id !== undefined) body.truck_id = truck_id;
  if (trailer_id !== undefined) body.trailer_id = trailer_id;
  if (driver2_id !== undefined) body.driver2_id = driver2_id;
  const response = await api.patch(`/loads/${loadId}/assign`, body);
  return response.data;
};

export const updateLoadStatus = async (loadId, statusData) => {
  const body = typeof statusData === 'string' ? { status: statusData } : statusData;
  const response = await api.patch(`/loads/${loadId}/status`, body);
  return response.data;
};

export const updateLoad = async (loadId, updates) => {
  const response = await api.patch(`/loads/${loadId}`, updates);
  return response.data;
};

export const deleteLoad = async (loadId) => {
  const response = await api.delete(`/loads/${loadId}`);
  return response.data;
};

export const createSplitLoad = async (parentLoadId) => {
  const response = await api.post(`/loads/${parentLoadId}/split`);
  return response.data;
};

// Drivers
export const getDrivers = async (params = {}) => {
  const response = await api.get('/drivers', { params });
  return response.data;
};

export const getDriverById = async (id) => {
  const response = await api.get(`/drivers/${id}`);
  return response.data;
};

export const createDriver = async (data) => {
  const response = await api.post('/drivers', data);
  return response.data;
};

export const updateDriver = async (id, data) => {
  const response = await api.patch(`/drivers/${id}`, data);
  return response.data;
};

export const deleteDriver = async (id) => {
  const response = await api.delete(`/drivers/${id}`);
  return response.data;
};

export const checkDriverAvailability = async (driverId, pickupDate, deliveryDate) => {
  const response = await api.get(`/drivers/${driverId}/availability`, {
    params: { pickup_date: pickupDate, delivery_date: deliveryDate }
  });
  return response.data;
};

// Customers
export const getCustomers = async (params = {}) => {
  const response = await api.get('/customers', { params });
  return response.data;
};

export const getCustomerById = async (id) => {
  const response = await api.get(`/customers/${id}`);
  return response.data;
};

export const createCustomer = async (data) => {
  const response = await api.post('/customers', data);
  return response.data;
};

export const updateCustomer = async (id, data) => {
  const response = await api.patch(`/customers/${id}`, data);
  return response.data;
};

export const deleteCustomer = async (id) => {
  const response = await api.delete(`/customers/${id}`);
  return response.data;
};

// Stats
export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

// Email Imports
export const getEmailImports = async (params = {}) => {
  const response = await api.get('/email-imports', { params });
  return response.data;
};

export const getEmailImportById = async (id) => {
  const response = await api.get(`/email-imports/${id}`);
  return response.data;
};

export const approveImport = async (id, updates = {}) => {
  const response = await api.post(`/email-imports/${id}/approve`, { updates });
  return response.data;
};

export const rejectImport = async (id) => {
  const response = await api.post(`/email-imports/${id}/reject`);
  return response.data;
};

export const retryImport = async (id) => {
  const response = await api.post(`/email-imports/${id}/retry`);
  return response.data;
};

// Gmail
export const getGmailStatus = async () => {
  const response = await api.get('/gmail/status');
  return response.data;
};

export const getGmailAuthUrl = async () => {
  const response = await api.get('/gmail/auth-url');
  return response.data;
};

export const disconnectGmail = async () => {
  const response = await api.post('/gmail/disconnect');
  return response.data;
};

export const triggerGmailSync = async () => {
  const response = await api.post('/gmail/sync');
  return response.data;
};

export const updateFilterSenders = async (senders) => {
  const response = await api.post('/gmail/filter-senders', { senders });
  return response.data;
};

// Documents
export const getDocumentUrl = (docId) => {
  const token = localStorage.getItem('access_token');
  return `${API_BASE_URL}/documents/${docId}/view${token ? `?token=${token}` : ''}`;
};

export const getLoadDocuments = async (loadId) => {
  const response = await api.get(`/documents/by-load/${loadId}`);
  return response.data;
};

export const uploadDocument = async (loadId, file, docType = 'OTHER') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('load_id', loadId);
  formData.append('doc_type', docType);
  const response = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteDocument = async (docId) => {
  const response = await api.delete(`/documents/${docId}`);
  return response.data;
};

// Load Notes
export const getLoadNotes = async (loadId) => {
  const response = await api.get(`/loads/${loadId}/notes`);
  return response.data;
};

export const createLoadNote = async (loadId, note) => {
  const response = await api.post(`/loads/${loadId}/notes`, { note });
  return response.data;
};

export const updateLoadNote = async (loadId, noteId, note) => {
  const response = await api.patch(`/loads/${loadId}/notes/${noteId}`, { note });
  return response.data;
};

export const deleteLoadNote = async (loadId, noteId) => {
  const response = await api.delete(`/loads/${loadId}/notes/${noteId}`);
  return response.data;
};

// Helpers
export const getApiBaseUrl = () => API_BASE_URL;

// Accessorials
export const getAccessorialTypes = async () => {
  const response = await api.get('/accessorials/types');
  return response.data;
};

export const getLoadAccessorials = async (loadId) => {
  const response = await api.get(`/accessorials/load/${loadId}`);
  return response.data;
};

export const addLoadAccessorial = async (loadId, data) => {
  const response = await api.post(`/accessorials/load/${loadId}`, data);
  return response.data;
};

export const removeLoadAccessorial = async (loadId, accessorialId) => {
  const response = await api.delete(`/accessorials/load/${loadId}/${accessorialId}`);
  return response.data;
};

// Invoices
export const getInvoices = async (params = {}) => {
  const response = await api.get('/invoices', { params });
  return response.data;
};

export const getInvoiceById = async (id) => {
  const response = await api.get(`/invoices/${id}`);
  return response.data;
};

export const createInvoice = async (data) => {
  const response = await api.post('/invoices', data);
  return response.data;
};

export const updateInvoiceStatus = async (id, status) => {
  const response = await api.patch(`/invoices/${id}/status`, { status });
  return response.data;
};

export const recordInvoicePayment = async (id, data) => {
  const response = await api.post(`/invoices/${id}/payment`, data);
  return response.data;
};

export const getAgingReport = async () => {
  const response = await api.get('/invoices/aging');
  return response.data;
};

export const getUninvoicedLoads = async (params = {}) => {
  const response = await api.get('/invoices/uninvoiced-loads', { params });
  return response.data;
};

export const deleteInvoice = async (id) => {
  const response = await api.delete(`/invoices/${id}`);
  return response.data;
};

export const exportInvoiceCSV = (id) => {
  const token = localStorage.getItem('access_token');
  return `${API_BASE_URL}/invoices/${id}/export?token=${token}`;
};

// Settlements
export const getSettlements = async (params = {}) => {
  const response = await api.get('/settlements', { params });
  return response.data;
};

export const getSettlementById = async (id) => {
  const response = await api.get(`/settlements/${id}`);
  return response.data;
};

export const generateSettlements = async (data) => {
  const response = await api.post('/settlements/generate', data);
  return response.data;
};

export const approveSettlement = async (id) => {
  const response = await api.post(`/settlements/${id}/approve`);
  return response.data;
};

export const paySettlement = async (id) => {
  const response = await api.post(`/settlements/${id}/pay`);
  return response.data;
};

export const deleteSettlement = async (id) => {
  const response = await api.delete(`/settlements/${id}`);
  return response.data;
};

export const exportSettlementCSV = (id) => {
  const token = localStorage.getItem('access_token');
  return `${API_BASE_URL}/settlements/${id}/export?token=${token}`;
};

export const getDeductionTypes = async () => {
  const response = await api.get('/settlements/deduction-types/list');
  return response.data;
};

export const getDriverDeductions = async (driverId) => {
  const response = await api.get(`/settlements/driver-deductions/${driverId}`);
  return response.data;
};

export const addDriverDeduction = async (driverId, data) => {
  const response = await api.post(`/settlements/driver-deductions/${driverId}`, data);
  return response.data;
};

export const removeDriverDeduction = async (driverId, deductionId) => {
  const response = await api.delete(`/settlements/driver-deductions/${driverId}/${deductionId}`);
  return response.data;
};

// Vehicles
export const getVehicles = async (params = {}) => {
  const response = await api.get('/vehicles', { params });
  return response.data;
};

export const getVehicleById = async (id) => {
  const response = await api.get(`/vehicles/${id}`);
  return response.data;
};

export const createVehicle = async (data) => {
  const response = await api.post('/vehicles', data);
  return response.data;
};

export const updateVehicle = async (id, data) => {
  const response = await api.patch(`/vehicles/${id}`, data);
  return response.data;
};

export const deleteVehicle = async (id) => {
  const response = await api.delete(`/vehicles/${id}`);
  return response.data;
};

export const assignVehicleDriver = async (vehicleId, driverId, role = 'PRIMARY') => {
  const response = await api.post(`/vehicles/${vehicleId}/assign-driver`, { driver_id: driverId, role });
  return response.data;
};

export const getVehicleByDriver = async (driverId) => {
  const response = await api.get(`/vehicles/by-driver/${driverId}`);
  return response.data;
};

// Carriers
export const getCarriers = async (params = {}) => {
  const response = await api.get('/carriers', { params });
  return response.data;
};

export const getCarrierById = async (id) => {
  const response = await api.get(`/carriers/${id}`);
  return response.data;
};

export const createCarrier = async (data) => {
  const response = await api.post('/carriers', data);
  return response.data;
};

export const updateCarrier = async (id, data) => {
  const response = await api.patch(`/carriers/${id}`, data);
  return response.data;
};

export const deleteCarrier = async (id) => {
  const response = await api.delete(`/carriers/${id}`);
  return response.data;
};

export const addCarrierInsurance = async (carrierId, data) => {
  const response = await api.post(`/carriers/${carrierId}/insurance`, data);
  return response.data;
};

export const removeCarrierInsurance = async (carrierId, insuranceId) => {
  const response = await api.delete(`/carriers/${carrierId}/insurance/${insuranceId}`);
  return response.data;
};

// Users
export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getUserById = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (data) => {
  const response = await api.post('/users', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await api.patch(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

export const resetUserPassword = async (id) => {
  const response = await api.post(`/users/${id}/reset-password`);
  return response.data;
};

// Samsara
export const getSamsaraStatus = async () => {
  const response = await api.get('/samsara/status');
  return response.data;
};

export const connectSamsara = async (apiKey) => {
  const response = await api.post('/samsara/connect', { api_key: apiKey });
  return response.data;
};

export const disconnectSamsara = async () => {
  const response = await api.post('/samsara/disconnect');
  return response.data;
};

// Locations
export const getLocations = async (params = {}) => {
  const response = await api.get('/locations', { params });
  return response.data;
};

export const createLocation = async (data) => {
  const response = await api.post('/locations', data);
  return response.data;
};

export const updateLocation = async (id, data) => {
  const response = await api.patch(`/locations/${id}`, data);
  return response.data;
};

export const deleteLocation = async (id) => {
  const response = await api.delete(`/locations/${id}`);
  return response.data;
};

// Admin - Accessorial Types
export const createAccessorialType = async (data) => {
  const response = await api.post('/accessorials/types', data);
  return response.data;
};

// Admin - Deduction Types
export const createDeductionType = async (data) => {
  const response = await api.post('/settlements/deduction-types', data);
  return response.data;
};

export default api;
