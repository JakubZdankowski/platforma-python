import { downloadFile } from '../app/downloadFile';

export function downloadCode(code: string, title: string) {
  const filename = `${title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim() || 'cwiczenie'}.py`;
  downloadFile(code, filename, 'text/plain;charset=utf-8');
}
