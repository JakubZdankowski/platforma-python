export function downloadCode(code: string, title: string) {
  const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim() || 'cwiczenie'}.py`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
