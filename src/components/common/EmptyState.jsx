import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ icon: Icon, message, description }) {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
