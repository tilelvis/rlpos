// Triggers a browser "Save File" download for a byte buffer.
// Port of lib/core/services/file_download_service.dart.

export const FileDownloadService = {
  xlsxMimeType:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csvMimeType: 'text/csv',

  downloadBytes(bytes, filename, mimeType) {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 200);
  },

  downloadText(text, filename, mimeType = 'text/plain') {
    this.downloadBytes(new TextEncoder().encode(text), filename, mimeType);
  },
};
