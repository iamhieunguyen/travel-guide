import React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export default function MapUnitDropdown({ value, onChange }) {
  const getUnitLabel = (unit) => {
    switch (unit) {
      case "metric":
        return "Kilomet (km)";
      case "imperial":
        return "Dặm (mi)";
      default:
        return "Kilomet (km)";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between bg-white hover:bg-gray-50 border-cyan-300 text-cyan-900 font-medium shadow-sm hover:shadow-md transition-all"
        >
          {getUnitLabel(value)}
          <ChevronDownIcon
            className="ml-2 opacity-60"
            size={16}
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuItem
          onClick={() => onChange("metric")}
        >
          Kilomet (km)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("imperial")}
        >
          Dặm (mi)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

