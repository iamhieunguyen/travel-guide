import { ArrowLeftIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";

export default function BackButton({ onClick, children = "Quay lại", className = "" }) {
  return (
    <Button 
      variant="outline"
      className={cn(
        "group bg-white hover:bg-gray-50 border-gray-200 text-gray-900 font-medium rounded-lg px-4 py-2 gap-2",
        className
      )}
      onClick={onClick}
    >
      <ArrowLeftIcon
        className="opacity-60 transition-transform group-hover:-translate-x-0.5"
        size={16}
        aria-hidden="true"
      />
      <span>{children}</span>
    </Button>
  );
}

