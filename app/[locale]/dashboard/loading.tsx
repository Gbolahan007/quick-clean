export default function Loading() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#f8faf9]">
      {/* Ambient background glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#7c9885]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#7c9885]/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-5">
        {/* Animation */}
        <div className="relative w-28 h-28 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full bg-[#7c9885]/10 animate-pulse-slow" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl text-[#7c9885] animate-sparkle">✨</div>
          </div>

          <div className="absolute top-2 left-6 w-2 h-2 bg-[#7c9885] rounded-full animate-float-1 opacity-70" />
          <div className="absolute bottom-4 right-4 w-1.5 h-1.5 bg-[#7c9885] rounded-full animate-float-2 opacity-60" />
        </div>

        {/* Text */}
        <h2 className="text-2xl font-semibold text-[#0a1628]">
          Just a <span className="text-[#7c9885]">moment</span>
        </h2>

        <p className="mt-2 text-gray-500 text-sm">
          Getting everything ready for you
        </p>
      </div>
    </div>
  );
}
