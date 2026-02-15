import { motion } from "framer-motion";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ghanaRegions, subjects } from "@/data/teachers";

export interface FilterState {
  subject: string;
  location: string;
  priceRange: [number, number];
  minRating: number;
  online: boolean;
  inPerson: boolean;
  verified: boolean;
}

interface SearchFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  resultCount: number;
}

export function SearchFilters({ 
  filters, 
  onFilterChange, 
  onReset,
  resultCount 
}: SearchFiltersProps) {
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Subject */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Subject</Label>
        <Select
          value={filters.subject}
          onValueChange={(val) => updateFilter("subject", val)}
        >
          <SelectTrigger className="w-full bg-white border-border">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent className="bg-white border-border z-50">
            {subjects.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Location</Label>
        <Select
          value={filters.location}
          onValueChange={(val) => updateFilter("location", val)}
        >
          <SelectTrigger className="w-full bg-white border-border">
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent className="bg-white border-border z-50">
            {ghanaRegions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Price Range (GH₵{filters.priceRange[0]} - GH₵{filters.priceRange[1]})
        </Label>
        <Slider
          value={filters.priceRange}
          onValueChange={(val) => updateFilter("priceRange", val as [number, number])}
          min={0}
          max={200}
          step={5}
          className="mt-3"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>GH₵0</span>
          <span>GH₵200+</span>
        </div>
      </div>

      {/* Minimum Rating */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Minimum Rating: {filters.minRating}+ stars
        </Label>
        <Slider
          value={[filters.minRating]}
          onValueChange={(val) => updateFilter("minRating", val[0])}
          min={0}
          max={5}
          step={0.5}
          className="mt-3"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Any</span>
          <span>5.0</span>
        </div>
      </div>

      {/* Teaching Mode */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Teaching Mode</Label>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="online"
              checked={filters.online}
              onCheckedChange={(checked) => updateFilter("online", checked as boolean)}
            />
            <label
              htmlFor="online"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Online Lessons
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="inPerson"
              checked={filters.inPerson}
              onCheckedChange={(checked) => updateFilter("inPerson", checked as boolean)}
            />
            <label
              htmlFor="inPerson"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              In-Person Lessons
            </label>
          </div>
        </div>
      </div>

      {/* Verified Only */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="verified"
          checked={filters.verified}
          onCheckedChange={(checked) => updateFilter("verified", checked as boolean)}
        />
        <label
          htmlFor="verified"
          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Verified Teachers Only
        </label>
      </div>

      {/* Reset Button */}
      <Button variant="outline" onClick={onReset} className="w-full">
        <X className="w-4 h-4 mr-2" />
        Reset Filters
      </Button>
    </div>
  );

  return (
    <>
      {/* Desktop Filters */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="hidden lg:block glass-card rounded-2xl p-6 sticky top-24"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-bold text-foreground">Filters</h2>
          <span className="text-sm text-muted-foreground">{resultCount} results</span>
        </div>
        <FilterContent />
      </motion.div>

      {/* Mobile Filter Sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              <span className="ml-2 px-2 py-0.5 text-xs bg-secondary text-white rounded-full">
                {resultCount}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter Teachers</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
