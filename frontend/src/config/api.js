export default {
  apiBaseUrl: import.meta.env.DEV ? '' : 'http://127.0.0.1:200',
  publicPath: '/',
  endpoints: {
    runFlow: '/api/runFlow',
    getReport: '/api/getReport',
    downloadFile: '/api/download-file'
  }
}
