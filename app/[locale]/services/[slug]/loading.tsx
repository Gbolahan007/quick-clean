export default function Loading() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/services2.jpg"
          alt="Clean modern home"
          className="w-full h-full object-cover blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
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
        <h2 className="text-2xl font-semibold text-gray-900">
          Preparing your <span className="text-[#7c9885]">clean space</span>
        </h2>

        <p className="mt-2 text-gray-500 text-sm">
          Sit back while we get things ready
        </p>
      </div>
    </div>
  );
}
