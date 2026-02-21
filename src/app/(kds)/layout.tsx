export default function KDSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-[#0a0a1a] text-white overflow-hidden">
      {children}
    </div>
  );
}
