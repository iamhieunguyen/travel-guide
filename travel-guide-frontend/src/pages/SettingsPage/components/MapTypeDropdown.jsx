import React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export default function MapTypeDropdown({ value, onChange }) {
  const getMapTypeLabel = (type) => {
    switch (type) {
      case "roadmap":
        return "Bản đồ đường";
      case "satellite":
        return "Vệ tinh";
      case "terrain":
        return "Địa hình";
      case "hybrid":
        return "Lai";
      default:
        return "Bản đồ đường";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between bg-white hover:bg-gray-50 border-cyan-300 text-cyan-900 font-medium shadow-sm hover:shadow-md transition-all"
        >
          {getMapTypeLabel(value)}
          <ChevronDownIcon
            className="ml-2 opacity-60"
            size={16}
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuItem
          onClick={() => onChange("roadmap")}
        >
          Bản đồ đường
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("satellite")}
        >
          Vệ tinh
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("terrain")}
        >
          Địa hình
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("hybrid")}
        >
          Lai
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

