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

export const getSignatures = async (documentId) => {
  const data = await request(`/api/docs/${documentId}/signatures`);
  return data.signatures || [];
};

export const createSignature = async (documentId, { pageNumber = 1, x, y, signerId = null, type = 'signature', metadata = null }) => {
  const data = await request(`/api/docs/${documentId}/signatures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageNumber, x, y, signerId, type, metadata }),
  });

  return data.signature;
};

export const deleteSignature = async (documentId, signatureId) => {
  const data = await request(`/api/docs/${documentId}/signatures/${signatureId}`, {
    method: 'DELETE',
  });
  return data;
};

export const updateSignatureCoords = async (documentId, signatureId, { pageNumber, x, y, metadata }) => {
  const data = await request(`/api/docs/${documentId}/signatures/${signatureId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageNumber, x, y, ...(metadata !== undefined ? { metadata } : {}) }),
  });
  return data.signature;
};

export const generateSignatureToken = async (signatureId) => {
  const data = await request(`/api/docs/signatures/${signatureId}/token`, {
    method: 'POST',
  });
  return data.token;
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

  // Basic validation: ensure we received a PDF content-type
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('pdf')) {
    // attempt to surface server error body for debugging
    const text = await response.text().catch(() => '');
    throw new Error(`Unexpected response content-type: ${contentType} ${text ? `- ${text}` : ''}`);
  }

  return response.blob();
};

export const getDocumentPreviewUrl = (documentId) => `${backendBase}/api/docs/${documentId}/file`;
export const getDocumentDownloadUrl = (documentId) => `${backendBase}/api/docs/${documentId}/file?download=1`;

export { backendBase };

export const validateSignatureToken = async (token) => {
  const response = await fetch(`${backendBase}/api/docs/signatures/validate?token=${encodeURIComponent(token)}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Invalid token');
  }

  return response.json();
};

export const signWithToken = async (token, { signerName, signatureText, signatureImage } = {}) => {
  const body = { token, signerName, signatureText, signatureImage };

  const response = await fetch(`${backendBase}/api/docs/signatures/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to sign');
  return data;
};

export const deleteDocument = async (documentId) => {
  const data = await request(`/api/docs/${documentId}`, { method: 'DELETE' });
  return data;
};
