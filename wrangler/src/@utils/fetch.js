export async function handleResponse(response) {
  if (response.ok)
    return response.headers.get('content-type')?.indexOf('json') > -1
    ? response.json() 
    : response.text()

  throw response.headers.get('content-type')?.indexOf('json') > -1
  ? await response.json()
  : await response.text()
}