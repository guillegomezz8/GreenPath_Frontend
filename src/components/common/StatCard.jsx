import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

export function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color = "text-primary",
  description 
}) {
  return (
    <Card className="relative overflow-hidden hover:shadow-elegant transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={`w-5 h-5 ${color}`} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground text-left">{value}</div>
        {change && (
          <p className="text-xs text-success flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            {change} desde el mes pasado
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-primary opacity-60"></div>
    </Card>
  );
}
