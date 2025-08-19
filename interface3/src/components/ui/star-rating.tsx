import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number | null;
  onChange: (rating: number) => void;
  max?: number;
  size?: number;
  disabled?: boolean;
  className?: string;
}

const StarRating = ({ 
  value, 
  onChange, 
  max = 5, 
  size = 24, 
  disabled = false,
  className 
}: StarRatingProps) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoverValue(null);
    }
  };

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {Array.from({ length: max }, (_, index) => {
        const rating = index + 1;
        const isActive = (hoverValue !== null ? hoverValue : value) >= rating;
        
        return (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            className={cn(
              "transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
            aria-label={`Rate ${rating} star${rating > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={cn(
                "transition-colors duration-200",
                isActive
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-muted text-muted-foreground hover:text-yellow-400"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;