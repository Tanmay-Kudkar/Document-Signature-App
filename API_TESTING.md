# 📋 API Testing Guide — DocSign WebApp

> **Base URL**: `http://localhost:5000`  
> Replace `{{TOKEN}}` with your JWT after login, and `{{DOC_ID}}` / `{{SIG_ID}}` with real UUIDs from responses.

---

## 1. Health Check

```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{ "message": "API is healthy" }
```

---

## 2. Auth Routes

### 2.1 Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Password123"}'
```

**Expected Response:**
```json
{ "message": "User registered successfully", "token": "<JWT>" }
```

### 2.2 Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'
```

**Expected Response:**
```json
{ "message": "Login successful", "token": "<JWT>", "user": { "id": "...", "name": "Test User", "email": "test@example.com" } }
```

> **Save the token:** `export TOKEN="<JWT from response>"`

---

## 3. Document Routes

### 3.1 Upload PDF (Authenticated)
```bash
curl -X POST http://localhost:5000/api/docs/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@/path/to/your/file.pdf"
```

**Expected Response:**
```json
{
  "message": "Document uploaded and saved to database successfully",
  "document": {
    "id": "uuid",
    "originalName": "file.pdf",
    "status": "uploaded",
    "uploadDate": "...",
    "fileSize": 123456,
    "previewUrl": "http://localhost:5000/api/docs/uuid/file",
    "downloadUrl": "http://localhost:5000/api/docs/uuid/file?download=1"
  }
}
```

> **Save the doc ID:** `export DOC_ID="<id from response>"`

### 3.2 Upload PDF (Guest / Sandbox Mode)
```bash
curl -X POST http://localhost:5000/api/docs/upload \
  -F "document=@/path/to/your/file.pdf"
```

**Expected Response:**
```json
{ "message": "Free preview mode - document not saved to database", "document": { "previewData": "data:application/pdf;base64,..." } }
```

### 3.3 List Documents
```bash
curl http://localhost:5000/api/docs \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{ "documents": [ { "id": "...", "originalName": "file.pdf", "status": "uploaded", ... } ] }
```

### 3.4 Get Document by ID
```bash
curl http://localhost:5000/api/docs/$DOC_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 3.5 Stream / Preview PDF
```bash
# View in browser (inline):
curl http://localhost:5000/api/docs/$DOC_ID/file \
  -H "Authorization: Bearer $TOKEN" \
  -o preview.pdf

# Download (attachment):
curl "http://localhost:5000/api/docs/$DOC_ID/file?download=1" \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded.pdf
```

### 3.6 Delete Document
```bash
curl -X DELETE http://localhost:5000/api/docs/$DOC_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{ "message": "Document deleted successfully" }
```

---

## 4. Signature Placeholder Routes (Owner Only)

### 4.1 Add Signature Placeholder
```bash
curl -X POST http://localhost:5000/api/docs/$DOC_ID/signatures \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pageNumber":1,"x":50,"y":80}'
```

**Expected Response:**
```json
{
  "signature": {
    "id": "sig-uuid",
    "document_id": "...",
    "page_number": 1,
    "x": "50.00",
    "y": "80.00",
    "status": "pending",
    "created_at": "..."
  }
}
```

> **Save sig ID:** `export SIG_ID="<id from response>"`

### 4.2 Get Signatures for Document
```bash
curl http://localhost:5000/api/docs/$DOC_ID/signatures \
  -H "Authorization: Bearer $TOKEN"
```

### 4.3 Delete Signature Placeholder
```bash
curl -X DELETE http://localhost:5000/api/docs/$DOC_ID/signatures/$SIG_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{ "message": "Signature deleted successfully" }
```

---

## 5. Public Signing Routes (Token-Based)

### 5.1 Generate Signature Share Token (Owner)
```bash
curl -X POST http://localhost:5000/api/docs/signatures/$SIG_ID/token \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{ "token": "<SIGNATURE_JWT>" }
```

> **Save:** `export SIG_TOKEN="<token>"`

### 5.2 Validate Signature Token (Public)
```bash
curl "http://localhost:5000/api/docs/signatures/validate?token=$SIG_TOKEN"
```

**Expected Response:**
```json
{
  "signature": { "id": "...", "x": "50.00", "y": "80.00", "status": "pending", ... },
  "document": { "id": "...", "original_name": "file.pdf", "status": "uploaded" }
}
```

### 5.3 Sign with Token (Public — Text Mode)
```bash
curl -X POST "http://localhost:5000/api/docs/signatures/sign" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$SIG_TOKEN\",\"signerName\":\"John Doe\",\"signatureText\":\"Approved\"}"
```

**Expected Response:**
```json
{ "message": "Document signed successfully" }
```

### 5.4 Sign with Token (Public — Image Mode)
```bash
# signatureImage must be a base64-encoded PNG data URL
curl -X POST "http://localhost:5000/api/docs/signatures/sign" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$SIG_TOKEN\",\"signerName\":\"John Doe\",\"signatureImage\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==\"}"
```

---

## 6. Test Sequence (End-to-End)

Run these commands in order for a full test:

```bash
# 1. Register
export TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"t@t.com","password":"Pass123"}' | python -c "import sys,json;print(json.load(sys.stdin)['token'])")

# 2. Upload
export DOC_ID=$(curl -s -X POST http://localhost:5000/api/docs/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@test.pdf" | python -c "import sys,json;print(json.load(sys.stdin)['document']['id'])")

# 3. Add signature placeholder
export SIG_ID=$(curl -s -X POST http://localhost:5000/api/docs/$DOC_ID/signatures \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pageNumber":1,"x":50,"y":80}' | python -c "import sys,json;print(json.load(sys.stdin)['signature']['id'])")

# 4. Generate token
export SIG_TOKEN=$(curl -s -X POST http://localhost:5000/api/docs/signatures/$SIG_ID/token \
  -H "Authorization: Bearer $TOKEN" | python -c "import sys,json;print(json.load(sys.stdin)['token'])")

# 5. Sign
curl -X POST http://localhost:5000/api/docs/signatures/sign \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$SIG_TOKEN\",\"signerName\":\"Test User\"}"

# 6. Download signed PDF
curl "http://localhost:5000/api/docs/$DOC_ID/file?download=1" \
  -H "Authorization: Bearer $TOKEN" \
  -o signed_document.pdf

echo "✅ signed_document.pdf saved"
```

---

## 7. Common Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `No PDF file uploaded` | Missing `document` form field |
| 401 | `Access token is missing` | Missing `Authorization` header |
| 401 | `Invalid or expired token` | JWT expired or malformed |
| 403 | `Not authorized to access this document` | Wrong user or missing token |
| 404 | `Document not found` | Wrong ID or deleted |
| 404 | `Signature not found on this document` | Wrong sig ID for the document |
| 500 | `Internal server error` | Check backend logs |
