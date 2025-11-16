import React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export default function LanguageDropdown({ value, onChange }) {
  const getLanguageLabel = (lang) => {
    switch (lang) {
      case "vi":
        return "Tiếng Việt";
      case "en":
        return "English";
      default:
        return "Tiếng Việt";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between bg-white hover:bg-gray-50 border-cyan-300 text-cyan-900 font-medium shadow-sm hover:shadow-md transition-all"
        >
          {getLanguageLabel(value)}
          <ChevronDownIcon
            className="ml-2 opacity-60"
            size={16}
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuItem
          onClick={() => onChange("vi")}
        >
          Tiếng Việt
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("en")}
        >
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

