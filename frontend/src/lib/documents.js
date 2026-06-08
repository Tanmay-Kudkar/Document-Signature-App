const backendBase = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

const getToken = () => localStorage.getItem('token');

const request = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${backendBase}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
};

export const listDocuments = async () => {
  const data = await request('/api/docs');
  return data.documents || [];
};

export const getDocument = async (documentId) => {
  const data = await request(`/api/docs/${documentId}`);
  return data.document;
};

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('document', file);

  const data = await request('/api/docs/upload', {
    method: 'POST',
    body: formData,
  });

  return data.document;
};

export const fetchDocumentFile = async (documentId, download = false) => {
  const headers = new Headers();
  const token = getToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(
    `${backendBase}/api/docs/${documentId}/file${download ? '?download=1' : ''}`,
    { headers }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Unable to fetch the file');
  }

  return response.blob();
};

export const getDocumentPreviewUrl = (documentId) => `${backendBase}/api/docs/${documentId}/file`;
export const getDocumentDownloadUrl = (documentId) => `${backendBase}/api/docs/${documentId}/file?download=1`;

export { backendBase };
