/*!
 * Module that provides a high-level interface for
 * the mango-service microservice (https://github.com/unnamed/mango-service)
 */
const BASE_URL = 'https://mango.unnamed.team/';

export interface MangoFileUploadResponse {
  ok: boolean,
  code: number,
  error?: string,
  id?: string;
}

/**
 * Uploads a temporary file to the mango-service
 * that can be requested once later
 *
 * @param {Blob} blob The file data to upload
 * @returns {Promise<MangoFileUploadResponse>} The upload response
 */
export async function uploadTemporaryFile(blob: Blob): Promise<MangoFileUploadResponse> {
  const formData = new FormData();
  formData.set('file', blob);

  const response = await fetch(BASE_URL + '/upload', {
    method: 'POST',
    body: formData
  });
  const json = await response.json();
  return json as MangoFileUploadResponse;
}