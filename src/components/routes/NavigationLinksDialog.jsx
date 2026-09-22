import { ExternalLink, Navigation2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function NavigationLinksDialog({ open, onOpenChange, urls = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation2 className="h-5 w-5 text-primary" aria-hidden="true" />
            Navegación por tramos
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          {urls.map((url, index) => (
            <Button key={`${index}-${url}`} asChild variant={index === 0 ? "default" : "outline"}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                Tramo {index + 1} de {urls.length}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
