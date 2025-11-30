import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function SearchBar({ value, onChange, onSearch }) {
    return (
        <div className="relative w-full max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
                type="text"
                placeholder="Search for movies..."
                className="pl-10 py-6 text-lg rounded-full border-primary/20 focus-visible:ring-primary/50 bg-background/50 backdrop-blur-xl shadow-lg"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
        </div>
    );
}
