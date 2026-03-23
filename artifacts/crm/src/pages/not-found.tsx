import { Link } from "wouter";
import { Button } from "@/components/ui/core-ui";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-xl border">
        <div className="w-16 h-16 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="font-display font-bold text-2xl">404</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-sm text-gray-600 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button className="w-full">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
