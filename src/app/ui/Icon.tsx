export function Icon({ kind, size = 20 }: { kind: string; size?: number }) {
  const paths: Record<string, string> = {
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    file: 'M14 2H5v20h14V7ZM14 2v5h5M8 12h8M8 16h6',
    list: 'M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1',
    code: 'm8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14',
    home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
    book: 'M12 5v16M3 4h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z',
    help: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17v.01',
    group: 'M2 21v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3M17 14a4 4 0 0 1 5 4v3M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 3a4 4 0 0 1 0 8',
    person: 'M4 21v-3a8 8 0 0 1 16 0v3M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  };
  return <svg aria-hidden="true" className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{kind === 'help' && <circle cx="12" cy="12" r="10" />}<path d={paths[kind]} /></svg>;
}
