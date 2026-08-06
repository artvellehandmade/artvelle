"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Attribute } from "@/lib/types";

export function ProductAttributes({
  attributes,
  onChange
}: {
  attributes: Attribute[];
  onChange: (attributes: Attribute[]) => void;
}) {
  function addAttribute() {
    onChange([...attributes, { name: "", values: [] }]);
  }

  function removeAttribute(index: number) {
    onChange(attributes.filter((_, i) => i !== index));
  }

  function updateAttributeName(index: number, name: string) {
    const newAttrs = [...attributes];
    newAttrs[index] = { ...newAttrs[index], name };
    onChange(newAttrs);
  }

  function updateAttributeValues(index: number, valuesStr: string) {
    const values = valuesStr.split(",").map(v => v.trim()).filter(Boolean);
    const newAttrs = [...attributes];
    newAttrs[index] = { ...newAttrs[index], values };
    onChange(newAttrs);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Attributes</h3>
        <Button type="button" variant="outline" size="sm" onClick={addAttribute}>
          <Plus className="w-4 h-4 mr-2" /> Add Attribute
        </Button>
      </div>
      
      {attributes.map((attr, i) => (
        <div key={i} className="flex items-start gap-4 p-4 border rounded-md">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Name (e.g. Size)</label>
            <input
              type="text"
              value={attr.name}
              onChange={(e) => updateAttributeName(i, e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Attribute Name"
            />
          </div>
          <div className="flex-[2] space-y-2">
            <label className="text-sm font-medium">Values (comma separated)</label>
            <input
              type="text"
              value={attr.values.join(", ")}
              onChange={(e) => updateAttributeValues(i, e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g. Small, Medium, Large"
            />
          </div>
          <Button type="button" variant="ghost" size="icon" className="mt-7 text-red-500" onClick={() => removeAttribute(i)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      {attributes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
          No attributes defined. Add one to create variants.
        </p>
      )}
    </div>
  );
}
