export default function Loading() {
  return (
    <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border">
      <div className="flex flex-col items-center gap-4">
        <svg className="h-16 w-16 animate-spin" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <path
            fill="none"
            stroke="#3b82f6"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset="100"
            d="M50 5 a 45 45 0 0 1 0 90 a 45 45 0 0 1 0 -90"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
        <p className="text-lg font-medium">Loading...</p>
      </div>
    </div>
  )
}
