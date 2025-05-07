import { ForcePWAPrompt } from "@/components/force-pwa-prompt"

export default function InstallPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Install Bison Books</h1>
      <p className="mb-4">
        Install Bison Books on your device for a better experience, including offline access and faster loading times.
      </p>
      <div className="bg-muted p-4 rounded-md mb-6">
        <h2 className="font-semibold mb-2">Installation Instructions:</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Click the "Install App" button in the prompt below</li>
          <li>Follow your browser's installation instructions</li>
          <li>Once installed, you can access the app from your home screen or app drawer</li>
        </ol>
      </div>
      <ForcePWAPrompt />
    </div>
  )
}
