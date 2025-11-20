import React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export default function PrivacyDropdown({ value, onChange }) {
  const getPrivacyLabel = (privacy) => {
    switch (privacy) {
      case "public":
        return "Công khai";
      case "private":
        return "Riêng tư";
      default:
        return "Công khai";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between bg-white hover:bg-gray-50 border-cyan-300 text-cyan-900 font-medium shadow-sm hover:shadow-md transition-all"
        >
          {getPrivacyLabel(value)}
          <ChevronDownIcon
            className="ml-2 opacity-60"
            size={16}
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuItem
          onClick={() => onChange("public")}
        >
          Công khai
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("private")}
        >
          Riêng tư
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

