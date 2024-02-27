"use client";

export default function Header({ children }: { children?: React.ReactNode }) {
  return (
    <div className=" w-screen border-b border-slate-600 z-10 bg-slate-900/90 absolute backdrop-blur">
      <div className="flex mx-auto max-w-7xl items-center px-6 py-4 justify-between">
        <h1 className="flex gap-4 font-light tracking-widest items-center text-md uppercase drop-shadow-lg text-slate-500">
          <JamsocketLogo />
          Whiteboard
        </h1>
        {children}
      </div>
    </div>
  )
}

function JamsocketLogo() {
  return (
    <svg className="fill-slate-400 h-8" viewBox="0 0 48 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.46173 0.888672H18.6469L8.82963 20.1479L18.6469 39.4072H9.46173L0 20.1479L9.46173 0.888672ZM37.6195 0.888672H37.3223H28.4343H19.5445V9.77756H32.9654L36.2376 16.1969H19.5445V25.0858H35.7346L32.9654 30.5184H19.5445V39.4072H37.3223V39.4072H37.6195L47.0812 20.1479L37.6195 0.888672Z" />
    </svg>
  )
}
