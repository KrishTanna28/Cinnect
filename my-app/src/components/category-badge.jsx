import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FLAT_CATEGORIES, CATEGORY_COLOR_STYLES } from "@/lib/config/categories"

export function CategoryBadge({ category, customCategory, categoryColor, className }) {
  const effectiveCategory = category || "general_discussion";
  const resolvedCategory = FLAT_CATEGORIES.find(c => c.id === effectiveCategory);
  
  const label = effectiveCategory === "other" && customCategory 
    ? customCategory 
    : resolvedCategory?.label || effectiveCategory;
    
  const resolvedColor = categoryColor || resolvedCategory?.color || "slate";
  const colorStyle = CATEGORY_COLOR_STYLES[resolvedColor] || CATEGORY_COLOR_STYLES.slate;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-semibold rounded-md transition-colors", 
        colorStyle,
        className
      )}
    >
      {label}
    </Badge>
  );
}