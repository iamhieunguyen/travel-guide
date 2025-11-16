import {
  ChevronDownIcon,
  Globe,
  Lock,
  Layers2Icon,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export default function StatusFilterDropdown({ value, onChange }) {
  const getStatusLabel = (status) => {
    switch (status) {
      case 'all':
        return 'Tất cả';
      case 'public':
        return 'Công khai';
      case 'private':
        return 'Riêng tư';
      default:
        return 'Tất cả';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'all':
        return <Layers2Icon size={16} className="opacity-60" aria-hidden="true" />;
      case 'public':
        return <Globe size={16} className="opacity-60" aria-hidden="true" />;
      case 'private':
        return <Lock size={16} className="opacity-60" aria-hidden="true" />;
      default:
        return <Layers2Icon size={16} className="opacity-60" aria-hidden="true" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 bg-cyan-50 hover:bg-cyan-100 border-cyan-400 text-cyan-900 font-medium w-full min-w-[250px] px-4 py-3 h-[48px] rounded-xl text-[0.9375rem] flex items-center"
        >
          {getStatusIcon(value)}
          {getStatusLabel(value)}
          <ChevronDownIcon
            className="-me-1 opacity-60"
            size={16}
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onChange('all')}>
          <Layers2Icon size={16} className="opacity-60 mr-2" aria-hidden="true" />
          Tất cả
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('public')}>
          <Globe size={16} className="opacity-60 mr-2" aria-hidden="true" />
          Công khai
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('private')}>
          <Lock size={16} className="opacity-60 mr-2" aria-hidden="true" />
          Riêng tư
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

