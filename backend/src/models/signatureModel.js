import { pool } from '../db.js';

export const createSignature = async ({ documentId, signerId = null, pageNumber = 1, x, y }) => {
  const result = await pool.query(
    `INSERT INTO signatures (document_id, signer_id, page_number, x_coordinate, y_coordinate)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, document_id, signer_id, page_number, x_coordinate AS x, y_coordinate AS y, status, signed_at, created_at`,
    [documentId, signerId, pageNumber, x, y]
  );

  return result.rows[0];
};

export const getSignaturesByDocument = async (documentId) => {
  const result = await pool.query(
    `SELECT id, document_id, signer_id, page_number, x_coordinate AS x, y_coordinate AS y, status, signed_at, created_at
     FROM signatures
     WHERE document_id = $1
     ORDER BY created_at ASC`,
    [documentId]
  );

  return result.rows;
};

export const updateSignatureStatus = async (signatureId, status) => {
  const result = await pool.query(
    `UPDATE signatures SET status = $1, signed_at = CASE WHEN $1 = 'signed' THEN CURRENT_TIMESTAMP ELSE signed_at END
     WHERE id = $2
     RETURNING id, status, signed_at`,
    [status, signatureId]
  );

  return result.rows[0];
};

export const getSignatureById = async (signatureId) => {
  const result = await pool.query(
    `SELECT id, document_id, signer_id, page_number, x_coordinate AS x, y_coordinate AS y, status, signed_at, created_at
     FROM signatures
     WHERE id = $1`,
    [signatureId]
  );

  return result.rows[0] || null;
};
