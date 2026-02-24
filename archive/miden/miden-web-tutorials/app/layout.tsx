export const metadata = {
  title: 'Miden Contract Tutorials',
  description: 'Learn Miden smart contracts step by step',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
