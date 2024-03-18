/*!
 * Module that provides a high-level interface for
 * the Artemis backend (https://github.com/unnamed/backend)
 */
const BASE_URL = 'https://artemis.unnamed.team/';

/**
 * Uploads a temporary file to the Artemis backend
 * that can be requested once later
 *
 * @param {Blob} blob The file data to upload
 * @returns {Promise<Response>} The upload response
 */
export function uploadTemporaryFile(blob: Blob): Promise<Response> {
  const formData = new FormData();
  formData.set('file', blob);
  return fetch(
    BASE_URL + 'tempfiles/upload',
    { method: 'POST', body: formData },
  );
}

/**
 * Downloads a temporary file from the Artemis backend
 * using its ID
 *
 * @param {string} id The temporary file ID
 * @returns {Promise<ArrayBuffer>} The file data
 */
export function downloadTemporaryFile(id: string): Promise<ArrayBuffer> {
  // download as array buffer
  const url = BASE_URL + 'tempfiles/get/' + id;
  return fetch(url).then(response => response.arrayBuffer());
}