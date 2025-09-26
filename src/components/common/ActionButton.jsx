import { Button } from "@/components/ui/button";

export function ActionButton({ 
  onClick, 
  variant = "default", 
  size = "default", 
  icon: Icon, 
  children, 
  className = "",
  disabled = false
}) {
  return (
    <Button 
      onClick={onClick}
      variant={variant}
      size={size}
      className={`gap-2 ${className}`}
      disabled={disabled}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </Button>
  );
}

export function QuickActions({ actions }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {actions.map((action, index) => (
        <ActionButton
          key={index}
          onClick={action.onClick}
          variant={action.variant || "outline"}
          icon={action.icon}
          size="sm"
        >
          {action.label}
        </ActionButton>
      ))}
    </div>
  );
}
