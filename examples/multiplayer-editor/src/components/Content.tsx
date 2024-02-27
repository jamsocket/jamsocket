"use client";

export default function Content({ children }: { children?: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex items-center justify-center absolute top-0 z-0 bg-slate-800">
      {children}
    </div>
  )
}
