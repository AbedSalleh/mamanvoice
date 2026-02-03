import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background aac-noise aac-safe-area">
      <Card className="w-full max-w-md mx-4 rounded-3xl">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3 items-center">
            <AlertCircle className="h-8 w-8 text-[hsl(var(--destructive))]" />
            <h1 className="text-2xl font-extrabold font-serif tracking-tight" data-testid="text-404-title">
              Page not found
            </h1>
          </div>

          <p className="mt-2 text-sm text-muted-foreground" data-testid="text-404-subtitle">
            This page doesnt exist.
          </p>

          <div className="mt-6">
            <Button
              type="button"
              className="h-12 rounded-2xl"
              onClick={() => setLocation("/")}
              data-testid="button-go-home"
            >
              Go to board
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
